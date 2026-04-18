# Portfolio Resume Application

## Recent Changes (April 18, 2026) — Runtime Beauty Feature-Flag Admin (Task #8)

Added a small admin screen at `/pogoda/beauty/admin/flags` that lets an authenticated user toggle Beauty BFF feature flags at runtime. Toggles take effect on the very next BFF resolve — no Angular rebuild and no Django restart required.

**Backend:**
- New models in `beauty_api/models.py`:
  - `BeautyFeatureFlag` (`key`, `enabled`, `description`, `updated_at`, `updated_by_*`) — the runtime source of truth.
  - `BeautyFlagAudit` (`flag_key`, `old_value`, `new_value`, `changed_by_*`, `changed_at`) — append-only audit trail.
  - Migration `0003_beautyfeatureflag_beautyflagaudit.py` creates both tables and seeds default rows for existing flags.
- `bff_api/services/hateoas_service.py` — `is_business_login_enabled()` / `is_signup_enabled()` now consult the `beauty_feature_flags` table first and fall back to the legacy env-var defaults if the row is missing or the DB is unavailable. New `FEATURE_FLAGS` registry declares every known flag (key, label, description, default) so the admin screen iterates one list. Added `beauty_admin_flags` to `SCREEN_ROUTES`.
- New resolver `bff_api/resolvers/beauty_admin_flags.py` — auth-required, lists each registered flag with current value + a `toggle` link, plus the 25 most recent audit entries.
- New endpoint `POST /api/beauty/admin/flags/toggle/` (`beauty_api/admin_views.py`, wired in `beauty_api/urls.py`) — validates the flag key against the registry, upserts the row inside a transaction, writes an audit row, returns the new value.
- **Authorisation:** both the resolver and the toggle endpoint require the caller's `(user_type, user_id)` pair to appear in the `BEAUTY_ADMIN_PRINCIPALS` env var (comma-separated `<user_type>:<user_id>` pairs, e.g. `customer:1,business:7`). We bind to the stable PK identity rather than email because `BeautyUser` and `BusinessProvider` are independent tables with no cross-table email uniqueness — using email would let a duplicate-email registration in the other table escalate to admin. Authenticated non-admins get 403 from the endpoint and a redirect to `beauty_home` (`reason: forbidden`) from the resolver. The default (no admins) means the surface is locked down until an operator opts in. Helpers: `hateoas_service.is_beauty_admin(user)` and `_admin_principal_allowlist()`.

**Frontend:**
- New presentational component `beauty-admin-flags.component.ts` — renders the flag list with iOS-style toggle switches and a chronological audit log.
- `BeautyShellComponent` registers the new screen, holds admin state (`adminFlags`, `adminAudit`, `adminEmail`, `busyFlagKey`), and forwards toggle clicks through `BeautyAuthService.follow(toggle_link, {key, enabled})`. After each successful toggle the shell re-resolves so the new value and the new audit entry appear immediately.
- New Angular route `/pogoda/beauty/admin/flags` → `BeautyShellComponent` with `data: { screen: 'beauty_admin_flags' }`. Added matching entry to the shell's screen→route fallback map.

**Verified end-to-end:**
- Resolver returns the flag list with toggle links (200).
- Toggling `BEAUTY_SIGNUP_ENABLED` off via the API immediately removes the `signup` link from `beauty_home`'s `_links` envelope on the very next resolve, with no restart.
- Audit entry recorded with the actor's email and user type.
- Bad flag key → 400; unauthenticated request → 401.

## Recent Changes (April 18, 2026) — HATEOAS + Dynamic Form Schema for Beauty BFF (Task #6)

### What changed — "over-the-air" UI updates

The Beauty BFF was upgraded from a fixed render contract into a fully **hypermedia-driven** one. The Angular shell no longer hardcodes endpoint URLs, screen-to-route mappings, form field lists, or which footer links to show. The backend dictates all of it via a `_links` envelope and a `form` schema, so adding a field, hiding an action via a feature flag, or rerouting a flow ships **without an Angular release**.

**Backend:**
- `Backend/controller/bff_api/services/hateoas_service.py` — link builders (`link`, `screen_link`, `self_link`), the `SCREEN_ROUTES` map (server is sole source of truth for route paths), form schema builders (`login_form`, `signup_form`, `email_field`, `password_field`, `footer_link`), and feature-flag helpers (`is_business_login_enabled`, `is_signup_enabled`) driven by env vars `BEAUTY_BUSINESS_LOGIN_ENABLED` and `BEAUTY_SIGNUP_ENABLED`.
- All 8 resolvers refactored to emit a HATEOAS envelope: every render carries `_links: {rel: link_obj}`, every redirect carries `_links.target`. Login/signup/business-login resolvers also emit a full `form` schema (fields, validators, submit href + method, success link, footer links, presentation classes, error messages).
- Legacy fields (`redirect_to` string, `data.links` screen-name dict) are kept alongside the new envelope so existing tests pass.
- `bff_api/views.py` bumped `APP_VERSION` to `2.0.0`; registered all 8 resolvers including `beauty_business_providers` and `beauty_sessions`.

**Frontend:**
- `beauty-bff.types.ts` — shared `BffLink`, `BffFieldSchema`, `BffFormSchema`, `BffResponse` types.
- `BeautyAuthService` no longer hardcodes login/signup/business/logout URLs. Generic `follow(link, body, includeDeviceId)` posts to whatever URL the BFF supplies, on whatever HTTP method the link declares.
- `BeautyDynamicFormComponent` — schema-driven form renderer. Iterates the schema's fields, validators, and footer links; preserves all existing CSS classes via the schema's `presentation` block so Playwright selectors remain stable.
- `BeautyShellComponent` — dropped the local `SCREEN_TO_ROUTE` table. Navigation comes from `link.route`. Handles render and redirect responses; on `(followLink)` events fires the link's HTTP method (or just navigates for `method=NAV`) and re-resolves.
- `BeautyLoginComponent`, `BeautySignupComponent`, `BeautyBusinessLoginComponent` reduced to thin wrappers around the dynamic form.
- `BeautyMainComponent` builds its header buttons from the `_links` map (rels `login`, `signup`, `business_login`, `logout`); every CTA emits `(followLink)` with the original `BffLink`.

### Envelope contract (v2.0.0)
```jsonc
{
  "action": "render" | "redirect",
  "screen": "beauty_login",
  "data":   { ... },
  "meta":   { "title": "..." },
  "_links": {
    "self":   { "rel": "...", "href": "...", "method": "NAV|GET|POST|...", "screen": "...", "route": "/...", "prompt": "..." },
    "logout": { ... },
    "target": { ... }   // only on action=redirect
  },
  "form": {              // only on screens that render a form
    "title": "...",
    "fields": [{ "name", "type", "label", "placeholder", "required", "min_length", "secret_toggle", "error_messages" }],
    "submit": <link>,
    "success": <link>,
    "presentation": { "page_class", "form_class", "submit_class", ... },
    "footer_links": [{ "rel", "cta_class", "group_class", "label_prefix" }],
    "error_status_map": { "401": "..." },
    "error_default": "..."
  },
  "redirect_to": "beauty_login",   // legacy, only on action=redirect
  "app_version": "2.0.0",
  "needs_update": false
}
```

---

## Recent Changes (April 1, 2026) — BFF SDUI Architecture for Beauty App (PR #43)

### What changed
Implemented a complete **Server-Driven UI (SDUI) / Backend-for-Frontend (BFF)** layer for all `/pogoda/beauty/*` routes. The Angular shell now stores **nothing** — it queries the backend on every navigation and renders exactly what the server instructs.

**Backend — new `bff_api` Django app:**
- `POST /api/bff/beauty/resolve/` — single entry point for the Angular shell
- **Microservices:** `auth_service.py` (cookie + device_id validation) and `beauty_config_service.py` (static config)
- **Screen resolvers:** `beauty_home`, `beauty_login`, `beauty_signup`, `beauty_business_login` — each runs independently, can be unit-tested in isolation
- Returns `{action: "render" | "redirect", screen, data, meta}` — shell renders what BFF says
- Registered in `INSTALLED_APPS` and `urls.py` at `/api/bff/`

**Frontend:**
- `BeautyBffService` — POSTs `{version, screen, device_id}` to resolve endpoint
- `BeautyShellComponent` — SDUI orchestrator; reads screen from route `data`, re-resolves on every navigation, renders child from BFF response, handles events
- All four beauty components refactored to **presentational** (accept `@Input() data`, emit `@Output()` events, no localStorage, no Router)
- `app.routes.ts` — all four beauty paths now point to `BeautyShellComponent` with `data: {screen}`

**Pull Request:** https://github.com/PogodaSoftware/main_frame/pull/43

---

## Recent Changes (March 31, 2026) — bcrypt Password Hashing
- Replaced Django's default PBKDF2 hasher with **BCryptSHA256PasswordHasher**
- Added `bcrypt==4.2.1` to `requirements.txt`
- Configured `PASSWORD_HASHERS` in `settings.py` — bcrypt is primary, PBKDF2 kept as fallback for any existing rows
- `make_password()` and `check_password()` in models and views use bcrypt automatically — no other code changes needed
- SHA-256 pre-hashing removes bcrypt's 72-byte input limit
- Password fields carry **no unique constraint**; only email fields are unique
- Pull Request: https://github.com/PogodaSoftware/main_frame/pull/42

---

## Recent Changes (March 31, 2026) — Auth Middleware
- **Beauty Auth Middleware (`beauty_api/middleware.py`):**
  - `BeautyAuthMiddleware` intercepts all `/api/beauty/protected/*` routes
  - Validates a Django-signed HttpOnly cookie (`beauty_auth`) — tamper-proof and expiry-checked
  - Confirms `device_id` inside the cookie matches the `X-Device-ID` request header
  - Verifies the session record is still active in the DB
  - Returns HTTP 401 on any failure; Angular guard redirects to login page
  - Multiple devices stay independent — each gets its own cookie/session

- **New DB models (migration 0002):**
  - `BeautySession` — tracks (user_id, user_type, device_id, token_hash, expires_at, is_active)
  - `BusinessProvider` — email, hashed password, business_name

- **New API endpoints:**
  - `POST /api/beauty/login/` — issues 24-hour HttpOnly SameSite=Strict cookie
  - `POST /api/beauty/logout/` — invalidates session, clears cookie
  - `POST /api/beauty/business/login/` and `/business/logout/` — business provider flow
  - `GET  /api/beauty/protected/me/` — returns current user info; used by Angular auth guard

- **Angular auth (Frontend):**
  - `BeautyAuthService` — generates persistent device fingerprint (localStorage), sends `X-Device-ID` header
  - `beautyAuthGuard` and `beautyBusinessAuthGuard` functional route guards
  - `BeautyLoginComponent` at `/pogoda/beauty/login` (email + password)
  - `BeautyBusinessLoginComponent` at `/pogoda/beauty/business/login`
  - Beauty main page header now shows "Sign in" + "Sign up" buttons when logged out

- **Security measures applied:**
  - HttpOnly cookie — JS cannot read the token (XSS-proof)
  - SameSite=Strict — cookie never sent on cross-site requests (CSRF-proof)
  - Secure flag — HTTPS only in production
  - Django signed token — built-in expiry, tamper-proof
  - SHA-256 token hash — raw token never stored in DB
  - Device ID binding — request must match the device the token was issued for
  - Generic 401 errors — no user enumeration possible
  - Constant-time `check_password` — prevents timing attacks

- **Pull Request:** https://github.com/PogodaSoftware/main_frame/pull/41

---

## Recent Changes (March 31, 2026) — Beauty App Pages (Mobile-first)
- Created two new pages under `/pogoda/beauty` and `/pogoda/beauty/signup`
  - Mobile-first design (iPhone 16/17 393px, Samsung S25 390px, Pixel 9 412px, iPhone 17 Plus 430px)
  - Main page: dark header with "Beauty" brand + Sign up button, horizontal scrollable service row (Beauty, Lashes, Nails, Makeup), Google Maps placeholder (ready for API key)
  - Sign-up page: email + password form with validation, show/hide password toggle, loading state
  - After sign-up, user email saved to localStorage and displayed in header
  - Google Maps: loads dynamically when `googleMapsApiKey` is set in `src/environments/environment.ts`
  
- **Django: beauty_api app:**
  - New `BeautyUser` model (email, hashed password, created_at) in `beauty_api` app
  - `POST /api/beauty/signup/` endpoint with email uniqueness and password length validation
  - Uses Django's built-in password hashing (`make_password`)
  - Migration applied to PostgreSQL database

- **Angular: @angular/forms added:**
  - Installed `@angular/forms@19.2.15` for template-driven forms in sign-up page

- **Environment files created:**
  - `src/environments/environment.ts` (dev) and `src/environments/environment.prod.ts` (prod)
  - Contains `googleMapsApiKey` (empty by default) and `apiBaseUrl`
  - angular.json configured with fileReplacements for prod build

## Recent Changes (November 13, 2025)
- **Pogoda Software - Complete Separation from Kevin's Portfolio**:
  - Removed all links to Kevin's portfolio from Pogoda navigation (desktop and mobile)
  - Removed "Kevin's Portfolio" button from Pogoda home page
  - Pogoda Software section now operates completely independently
  - Navigation shows only: Home and Experience
  
- **PostgreSQL Backend Integration for Pogoda Software**:
  - **Database**: Created PostgreSQL database with WorkExperience and Education models
  - **Django REST API**: Built API endpoints at `/api/pogoda/experience/` and `/api/pogoda/education/`
  - **Anti-Scraping Protection**: Implemented rate limiting (10 requests/minute per IP) using DRF throttling
  - **Data Migration**: Database seeded with 6 work experiences and 2 education entries from Jaroslaw Pogoda's LinkedIn
  - **Angular Integration**: Created HTTP service to fetch data dynamically from backend API
  - **SSR Compatibility**: Added platform detection to only make API calls in browser (not during SSR)
  - **Fallback System**: Component falls back to static data if API is unavailable for reliability
  - **CORS Configuration**: Configured CORS to allow frontend access while maintaining security
  - **Workflows**: Both backend (port 8000) and frontend (port 5000) running successfully
  
- **Pogoda Experience Page - Real LinkedIn Data**:
  - Populated experience page with Jaroslaw Pogoda's actual LinkedIn professional history
  - Added 6 work experiences: Gesture (current), Per Scholas, Sprint, Azodio.com, Bellevue Hospital, Freelance IT
  - Updated education with Queens College BS in Computer Science (2010-2016) and Triplebyte certification (2022)
  - All job descriptions, technologies, dates, and locations now reflect real professional background
  - Experience extracted from public LinkedIn profile via web search (LinkedIn direct fetch not supported)
  - Data dynamically loaded from PostgreSQL database via REST API

## Recent Changes (November 12, 2025)
- **New Pogoda Software Pages**:
  - Created complete Pogoda Software section with professional experience display
  - Added navigation and footer components for Pogoda pages
  - Created `/pogoda` home page with LinkedIn integration
  - Created `/pogoda/experience` page with professional timeline layout
  - Modern card-based design with technology tags and timeline visualization
  
- **Major Security Upgrade & Dependency Cleanup**:
  - Angular: Upgraded from 19.0.0 to 19.2.15 (fixed high severity SSR vulnerability)
  - All packages updated to latest secure versions
  - **0 security vulnerabilities** remaining (verified with npm audit)
  
- **Dependency Reduction**:
  - **Removed unused frontend dependencies**: @angular/forms, @angular/animations, portfolio-resume-frontend self-reference
  - **Removed unused dev dependencies**: Karma, Jasmine testing framework (using Playwright for E2E)
  - **Removed unused backend dependencies**: behave (using pytest-bdd instead)
  - **Result**: Reduced package count from 1157 to 849 packages (-27% reduction)
  
- **Code Cleanup**:
  - Removed all unused Jasmine/Karma test files (.spec.ts files)
  - Removed karma.conf.js and test configuration directory
  - Removed unused backend unit test examples
  - **Result**: Smaller, more maintainable codebase
  
- **SSR Fixes**:
  - Updated main.server.ts to support Angular 19.2.x SSR API changes (BootstrapContext)
  - Fixed NG0401 error by properly passing bootstrap context
  - THREE.js platform detection maintained for browser-only rendering
  
- **Bug Fixes from Previous Session** (November 6, 2025):
  - Added favicon.svg to resolve 404 error in browser console
  - Fixed SSR compatibility issue with THREE.js by adding platform detection
  - Ensured browser-specific code only runs in browser context
  
- **Verification**: All core functionality tested and working properly
  - Frontend: Angular 19.2.15 SSR working correctly
  - Backend: Django 5.1.5 running without issues
  - Navigation: All routes functioning properly
  - 3D models: Platform detection prevents SSR errors
  - Security: 0 vulnerabilities in production and dev dependencies

## Overview
This is a full-stack portfolio and resume application featuring:
- **Frontend**: Angular 19 application with Server-Side Rendering (SSR)
- **Backend**: Django 5.1.5 REST API (currently minimal setup)
- **Testing**: Playwright-based end-to-end testing suite

The application showcases Kevin Ortiz's portfolio as a Quality Assurance & DevOps Engineer, with sections for About, Experience, Projects, and Contact information.

## Running the Application

This project supports two deployment approaches:

### Option 1: Docker (Universal - Recommended for Local Development)
The original Docker-based setup works on any system with Docker installed:

```bash
# Set environment variables
export FRONTEND_PORT=4200
export BACKEND_PORT=8000

# Run with docker-compose
docker-compose up
```

The application will be available at:
- Frontend: http://localhost:4200
- Backend: http://localhost:8000

### Option 2: Replit (Cloud Development)
On Replit, Docker is not supported. Instead, the application runs natively:

**Frontend**: 
```bash
cd Frontend/portfolioResume
npm start -- --port 5000 --host 0.0.0.0
```

**Backend**:
```bash
cd Backend/controller
python manage.py runserver 0.0.0.0:8000
```

**Note**: The Angular configuration in `angular.json` is kept universal (no hardcoded ports). Port and host are specified via command-line arguments passed through npm to the Angular dev server in the Replit workflow.

## Project Structure
```
.
├── Frontend/portfolioResume/     # Angular 19 frontend application
│   ├── src/
│   │   ├── app/
│   │   │   ├── Kevin-Pages/      # Main portfolio pages
│   │   │   └── Pogoda-Software-Pages/
│   │   └── assets/               # Static assets
│   ├── angular.json              # Angular configuration
│   └── package.json              # Frontend dependencies
├── Backend/controller/           # Django backend
│   ├── main_frame_project/
│   ├── requirements.txt          # Python dependencies
│   └── manage.py
└── Playwright/                   # E2E test suite
    ├── features/                 # BDD feature files
    ├── pages/                    # Page object models
    └── steps/                    # Test step definitions
```

## Development Setup

### Frontend (Angular)
- **Port**: 5000 (configured for Replit)
- **Host**: 0.0.0.0 (allows Replit proxy access)
- **Start Command**: `npm start` (from Frontend/portfolioResume directory)
- **Technologies**: Angular 19, TypeScript, SCSS, Three.js
- **Features**:
  - Server-Side Rendering (SSR)
  - Multiple themed pages (Kevin's portfolio, Pogoda Software)
  - Responsive navigation and footer components
  - Contact forms and project showcases

### Backend (Django)
- **Port**: 8000
- **Start Command**: `python manage.py runserver 0.0.0.0:8000` (from Backend/controller directory)
- **Technologies**: Django 5.1.5, PostgreSQL, Django REST Framework, Gunicorn
- **Features**:
  - REST API endpoints for Pogoda experience and education data
  - Rate limiting (10 requests/minute) for anti-scraping protection
  - CORS configuration for frontend integration
  - Database models for WorkExperience and Education
  - Management command for seeding database: `python manage.py seed_pogoda_data`
- **Status**: Fully functional API serving dynamic data from PostgreSQL

### Testing
- **Framework**: Playwright with pytest-bdd
- **Test Types**: BDD (Behavior-Driven Development) with Gherkin feature files
- **Coverage**: Home page, About, Experience, Projects, Contact pages

## Replit Configuration

### Workflows
The project uses two workflows:

**Frontend Workflow:**
- **Name**: `frontend`
- **Command**: `cd Frontend/portfolioResume && npm start -- --port 5000 --host 0.0.0.0`
- **Output**: Webview on port 5000
- **Status**: Running

**Backend Workflow:**
- **Name**: `backend`
- **Command**: `cd Backend/controller && python manage.py runserver 0.0.0.0:8000`
- **Output**: Console (internal API)
- **Port**: 8000
- **Status**: Running

### Angular Configuration
The Angular configuration in `angular.json` remains universal with no hardcoded ports. When running on Replit, port and host are specified via command-line flags in the workflow command to enable Replit's proxy access while keeping the codebase portable for Docker deployment.

### Routes
**Kevin Ortiz Portfolio:**
- `/` - Redirects to `/kevin` (home page)
- `/kevin` - Kevin Ortiz portfolio home
- `/kevin/about` - About page
- `/kevin/experience` - Experience page
- `/kevin/projects` - Projects showcase
- `/kevin/contacts` - Contact form
- `/kevin/blender-projects` - Blender projects showcase

**Pogoda Software:**
- `/pogoda` - Pogoda Software home page
- `/pogoda/experience` - Professional experience timeline with LinkedIn integration

**Beauty App:**
- `/pogoda/beauty` - Beauty app main page (service categories + Google Maps)
- `/pogoda/beauty/signup` - Sign-up page (email + password)
- `/pogoda/beauty/login` - Customer login page
- `/pogoda/beauty/business/login` - Business provider login page

## Deployment
Configured for Replit autoscale deployment:
- **Build**: `cd Frontend/portfolioResume && npm install && npm run build`
- **Run**: `cd Frontend/portfolioResume && npx --yes serve dist/portfolio-resume-frontend/browser -l 5000`
- **Type**: Autoscale (stateless, scales based on traffic)
- **Note**: Commands navigate to the subdirectory first to handle monorepo structure

## Known Issues
- WebGL/Three.js features may not work in Replit's browser preview due to lack of WebGL context support in the iframe environment. These features will work when deployed or accessed directly via the public URL.
- Frontend may initially show fallback data if backend takes time to start (this is expected behavior)

## Backend API Documentation

### Pogoda API Endpoints

**Base URL**: `http://localhost:8000/api/pogoda/`

#### Experience Endpoint
- **URL**: `/api/pogoda/experience/`
- **Method**: GET
- **Authentication**: None (rate limited to 10 requests/minute per IP)
- **Response**: JSON array of work experience objects
- **Fields**: id, company, role, period, location, description (array), technologies (array), order

#### Education Endpoint
- **URL**: `/api/pogoda/education/`
- **Method**: GET
- **Authentication**: None (rate limited to 10 requests/minute per IP)
- **Response**: JSON array of education objects
- **Fields**: id, institution, degree, period, location, order

### Database Setup
To set up the database on a fresh deployment:
```bash
# Run migrations
python manage.py migrate

# Seed Pogoda data
python manage.py seed_pogoda_data
```

## GitHub Integration & Pull Requests

A reusable skill exists at `.agents/skills/github-pr/SKILL.md` — **always load this skill when the user asks to push to GitHub or create a pull request.**

Key facts:
- **Token**: `GITHUB_TOKEN` is stored as a Replit secret and is accessible in the shell via `$GITHUB_TOKEN`. Do NOT ask the user for credentials.
- **Push branch** (token embedded in URL — no git config modification needed):
  ```bash
  git push "https://${GITHUB_TOKEN}@github.com/PogodaSoftware/main_frame.git" main:feature/your-branch-name
  ```
- **Create PR** (GitHub REST API):
  ```bash
  curl -s -X POST \
    -H "Authorization: Bearer ${GITHUB_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    https://api.github.com/repos/PogodaSoftware/main_frame/pulls \
    -d '{"title":"PR Title","head":"feature/your-branch-name","base":"main","body":"Description"}'
  ```
- **Destructive git operations** (`git checkout -b`, `git branch`, `git remote set-url`, `git commit`) are **blocked** in the main agent. Use the URL-embedded token approach above instead.
- The Replit GitHub OAuth connector flow is **not required** — skip it.

## CI/CD: GitHub → Replit Sync
A GitHub Actions workflow (`.github/workflows/sync-to-replit.yml`) triggers on every push to `main`. It calls the Replit webhook endpoint which fetches and resets the workspace to match GitHub.

**Webhook endpoint**: `https://<REPLIT_DEV_DOMAIN>:8000/api/deploy/github-sync/`
- Implemented in `Backend/controller/main_frame_project/deploy_views.py`
- Protected by `DEPLOY_WEBHOOK_SECRET` environment variable (constant-time comparison)

**Two secrets required in GitHub repo Settings → Secrets → Actions**:
1. `REPLIT_WEBHOOK_URL` = full URL of the webhook endpoint above
2. `REPLIT_DEPLOY_SECRET` = value of the `DEPLOY_WEBHOOK_SECRET` Replit secret

**Note**: The `REPLIT_DEV_DOMAIN` URL changes if the Replit environment is reset. Update `REPLIT_WEBHOOK_URL` in GitHub secrets when that happens.

## Future Enhancements
- Implement backend endpoints for Kevin's contact form
- Add admin interface for managing experience/education data
- Integrate additional portfolio projects into database
- Optional: Integrate LinkedIn API for real-time profile data updates
- Deploy backend alongside frontend on production
