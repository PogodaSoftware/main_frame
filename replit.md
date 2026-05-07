# Portfolio Resume Application

A full-stack portfolio + beauty booking platform. Kevin Ortiz's portfolio on one side; a beauty marketplace (browse, book, manage) on the other.

## Run & Operate

| Service | Command | Port |
|---|---|---|
| Frontend (portfolio) | `ng serve --port 5000` | 5000 |
| Beauty app | `ng serve --port 4200` | 4200 |
| Backend | `python manage.py runserver 0.0.0.0:8000` | 8000 |

**Required env vars / secrets**: `PGHOST`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `PGPORT` (Neon/PostgreSQL), `SESSION_SECRET`, `GITHUB_TOKEN`.  
**DB fallback**: set `DJANGO_DB=sqlite` to use SQLite when the Neon endpoint is unavailable (dev only).  
**After DB reprovisioning**: run `cd Backend/controller && python manage.py migrate`.

## Stack

- **Frontend**: Angular 19 SSR (portfolio, port 5000) + Angular 19 SPA (beauty, port 4200)
- **Backend**: Django 5.1 + Django REST Framework, BCryptSHA256 password hashing
- **DB**: PostgreSQL via Neon (Replit-managed); SQLite fallback for dev
- **Auth**: HttpOnly signed cookie (`beauty_session`) + device-ID binding
- **Testing**: Playwright + pytest-bdd (in `Playwright/`)

## Where things live

```
Frontend/portfolioResume/   Kevin/Pogoda portfolio (Angular 19)
Frontend/beautyApp/         Beauty SPA (Angular 19)
  src/app/beauty/           All beauty components, guards, services
  src/app/app.routes.ts     All /pogoda/beauty/* routes (business + customer)
Backend/controller/
  beauty_api/               Models, views, middleware, migrations
  bff_api/                  BFF resolvers, HATEOAS service, screen registry
  main_frame_project/       Django settings, URLs
Playwright/
  features/Pogoda/Beauty/   BDD feature files
  steps/beauty/             Step implementations + page objects
  Hooks/hooks.py            Route→URL mapping for test runner
docker-compose.yml          Wires all three services + nginx proxy
```

Source-of-truth files: `beauty_api/models.py` (DB schema), `bff_api/services/hateoas_service.py` (SCREEN_ROUTES), `app.routes.ts` (Angular routes).

## Architecture decisions

- **SDUI / BFF pattern**: Angular shell POSTs `{screen, device_id}` to `/api/bff/beauty/resolve/` on every navigation. BFF returns `{action, screen, data, _links, form}` — no hardcoded URLs, route paths, or form fields in the frontend.
- **Beauty app separation**: Beauty lives in its own Angular project (`beautyApp/`) to isolate its NgRx/feature dependencies from the portfolio. In Docker, nginx proxies `/pogoda/beauty/*` to the beauty container.
- **Hypermedia links**: All navigation, form submit URLs, and feature-flag visibility come from `_links` in the BFF envelope (HATEOAS). Adding a new action requires only a BFF change.
- **Application gate**: `application_gate.py` enforces that a business must complete the 6-step onboarding wizard before any portal screen resolves. All business resolvers call it first.
- **SQLite fallback**: `settings.py` checks `DJANGO_DB=sqlite` so the backend can start without a live Neon endpoint (set automatically via env var).

## Product

**Customer side** (`/pogoda/beauty/*`):
- Browse beauty providers by category, view profiles, book slots, manage bookings, reschedule, cancel, chat with provider.

**Business side** (`/pogoda/beauty/business/*`):
- Sign up → 6-step onboarding wizard (entity/ITIN, services, Stripe stub, weekly hours, tools, ToS review) → portal unlocks.
- Home dashboard: scrollable month calendar of bookings, earnings arc gauge, bookings-volume card (new vs recurring).
- Manage services (CRUD), weekly availability, incoming bookings, settings/password/profile.

**Admin** (`/pogoda/beauty/admin/flags`): runtime feature-flag toggle (BEAUTY_SIGNUP_ENABLED, BEAUTY_BUSINESS_LOGIN_ENABLED) with audit trail.

## User preferences

_Populate as you build_

## Gotchas

- Neon DB endpoint auto-disables when unused for extended periods. Set `DJANGO_DB=sqlite` (env var) and restart the backend to work around it during dev.
- Run `playwright install chromium` before running Playwright tests if the browser cache is missing (`.cache/ms-playwright/`).
- `beauty_session` cookie is HttpOnly + SameSite=Strict; Playwright tests must inject it via `page.context.add_cookies()` rather than JS.
- `BeautyBusinessDashboardComponent` was a legacy stub — it's been removed. Use `BeautyBusinessHomeComponent` instead.
- Run Playwright tests from `/home/runner/workspace` (not from `Playwright/`) so the `Playwright.*` module path resolves.

## Pointers

- Django migrations: `cd Backend/controller && python manage.py migrate`
- Playwright tests: `cd /home/runner/workspace && BEAUTY_PORT=4200 BACKEND_PORT=8000 python -m pytest Playwright/steps/beauty/ -v`
- GitHub repo: https://github.com/PogodaSoftware/main_frame
- PR #57: https://github.com/PogodaSoftware/main_frame/pull/57 (Task #19 — Business Portal v2)
