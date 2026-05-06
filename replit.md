# Portfolio Resume Application

A full-stack portfolio and resume application showcasing Kevin Ortiz's work and providing a customer/business booking system for beauty services.

## Run & Operate

The project supports two deployment approaches:

**1. Docker (Local Development)**
```bash
export FRONTEND_PORT=4200
export BACKEND_PORT=8000
docker-compose up
```
Frontend: `http://localhost:4200`, Backend: `http://localhost:8000`

**2. Replit (Cloud Development)**

**Workflows:**
- `frontend`: `cd Frontend/portfolioResume && npm start -- --port 5000 --host 0.0.0.0`
- `beauty`: `cd Frontend/beautyApp && npm start -- --port 4200 --host 0.0.0.0`
- `backend`: `cd Backend/controller && python manage.py runserver 0.0.0.0:8000`

**Required Environment Variables:**
- `BEAUTY_ADMIN_PRINCIPALS`: Comma-separated `<user_type>:<user_id>` for admin access (e.g., `customer:1,business:7`).
- `DEPLOY_WEBHOOK_SECRET`: Secret for GitHub to Replit sync webhook.
- `GITHUB_TOKEN`: For GitHub API interactions (stored as Replit secret).
- `FRONTEND_PORT`: Default `5000` for portfolio in dev.
- `BEAUTY_PORT`: Default `4200` for beauty app in dev.
- `BEAUTY_BUSINESS_LOGIN_ENABLED`: Feature flag for business login (legacy env var).
- `BEAUTY_SIGNUP_ENABLED`: Feature flag for signup (legacy env var).

**Database Commands:**
- `python manage.py migrate`
- `python manage.py seed_pogoda_data`

## Stack

- **Frontend**: Angular 19 (with SSR), NgRx (for beauty app), TypeScript, SCSS, Three.js
- **Backend**: Django 5.1.5, Django REST Framework, PostgreSQL
- **ORM**: Django ORM
- **Validation**: Angular Forms (frontend), Django Validators (backend)
- **Build Tool**: npm (Angular), pip (Django)
- **Runtime**: Node.js, Python 3.x

## Where things live

- `Frontend/portfolioResume/`: Main Angular portfolio app.
- `Frontend/beautyApp/`: Standalone Angular beauty booking app.
  - `src/app/app.routes.ts`: All beauty app routes.
  - `src/app/beauty/`: Beauty app components, services, guards, NgRx store.
- `Backend/controller/`: Django backend.
  - `beauty_api/models.py`: DB schema for Beauty app (BeautyUser, BeautySession, BusinessProvider, BeautyProviderAvailability, BeautyFeatureFlag, BeautyFlagAudit).
  - `main_frame_project/settings.py`: Django settings.
- `Playwright/`: E2E test suite (Playwright with pytest-bdd).
  - `Playwright/Hooks/hooks.py`: Router for Playwright tests to select frontend ports.
- `Frontend/portfolioResume/nginx.conf`: Nginx config for Docker, proxies `/pogoda/beauty` to `beauty_frontend`.
- `docker-compose.yml`: Docker service definitions.

## Architecture decisions

- **Beauty App Separation**: The beauty booking app was extracted into a standalone Angular app to eliminate cross-vulnerability risk with the portfolio. Nginx proxies requests in Docker.
- **Server-Driven UI (SDUI) / Backend-for-Frontend (BFF)**: The Beauty app uses a BFF layer for all `/pogoda/beauty/*` routes. The Angular shell is "thin," querying the backend on every navigation and rendering dynamically based on the BFF response (HATEOAS, dynamic form schemas).
- **Runtime Feature Flags**: Beauty BFF feature flags are toggleable at runtime via an admin screen, taking effect immediately without restarts. Flags are stored in the DB (`BeautyFeatureFlag`).
- **Robust Authentication**: Custom Beauty Auth Middleware uses HttpOnly, SameSite=Strict, Secure cookies, device ID binding, and SHA-256 token hashing for session management. Bcrypt is used for password hashing.
- **Dynamic Slot Generation**: Booking slots are computed dynamically based on `BeautyProviderAvailability` (including 24h open times) and existing bookings, rather than fixed intervals.

## Product

- **Portfolio Showcase**: Kevin Ortiz's professional portfolio with sections for About, Experience, Projects, and Contact.
- **Pogoda Software Section**: Dedicated section for Jaroslaw Pogoda's professional experience and education, dynamically loaded from a PostgreSQL backend.
- **Beauty Booking Application**:
    - **Customer Features**: Browse services, view provider availability, book appointments, reschedule existing bookings, sign up/log in.
    - **Business Features**: Business provider portal for managing services, setting weekly availability (including 24-hour options), and viewing bookings.
    - **Admin Features**: Runtime toggling of feature flags for the Beauty BFF.

## User preferences

- _Populate as you build_

## Gotchas

- **WebGL/Three.js in Replit**: WebGL features may not work in Replit's browser preview due to iframe limitations; they will work in deployed or public URLs.
- **Backend Startup Time**: Frontend may initially show fallback data if the backend takes time to start.
- **GitHub Sync**: `REPLIT_WEBHOOK_URL` in GitHub secrets must be updated if the Replit environment's `REPLIT_DEV_DOMAIN` changes.
- **Destructive Git Operations**: Direct `git checkout -b`, `git branch`, `git remote set-url`, `git commit` are blocked by the agent. Use the provided `git push` command with embedded token.

## Pointers

- **Relevant Skills**: `.agents/skills/github-pr/SKILL.md` (for GitHub push/PR)
- **Playwright Documentation**: [https://playwright.dev/](https://playwright.dev/)
- **Angular Documentation**: [https://angular.io/docs](https://angular.io/docs)
- **Django Documentation**: [https://docs.djangoproject.com/en/](https://docs.djangoproject.com/en/)
- **DRF Throttling**: [https://www.django-rest-framework.org/api-guide/throttling/](https://www.django-rest-framework.org/api-guide/throttling/)