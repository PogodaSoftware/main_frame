# Business Provider Portal · Mobile — Implementation Plan

## Context

- Source: `C:\Users\kevin\Downloads\beauty-mainframe\project\Business Provider Portal.html` + imported jsx (`provider-chrome`, `provider-wizard`, `provider-dashboard`, `provider-services`, `provider-misc`, `provider-messages`)
- Target: Angular standalone components in `Frontend/beautyApp/src/app/beauty/` (BFF/HATEOAS pattern)
- Viewport: 390 × 844 (wiz-1 + wiz-1-registered are 390 × 1100)
- 28 artboards across 7 sections

## User decisions

- Scope: Business Provider Portal mobile only
- Verify URL: `http://localhost:4200` direct
- Cadence: strict per-page gate (one page → rebuild → screenshot → wait approval → next)
- Auth: fresh signup each session if backend rebuilt (JWT signing rotates)

## Existing scaffolding (80% there)

All 18 provider screens have existing components at [Frontend/beautyApp/src/app/beauty/](Frontend/beautyApp/src/app/beauty/):

- `beauty-business-application.component.ts` — 6-step wizard
- `beauty-business-home.component.ts` — dashboard
- `beauty-business-services.component.ts`, `beauty-business-service-form.component.ts`
- `beauty-business-availability.component.ts` — weekly hours
- `beauty-business-bookings.component.ts`
- `beauty-business-profile.component.ts`, `beauty-business-settings.component.ts`
- `beauty-business-change-password.component.ts`, `beauty-business-email-contact.component.ts`
- `beauty-business-login.component.ts`, `beauty-business-signup.component.ts`

Shared atoms in [Frontend/beautyApp/src/app/beauty/provider/](Frontend/beautyApp/src/app/beauty/provider/):
`prov-top-header`, `prov-sub-header`, `prov-tab-bar`, `prov-btn`, `prov-card`, `prov-price-input`, `prov-empty-hint`, `beauty-provider-new-message-toast`, `beauty-provider-toast.service`.

Backend resolvers at `Backend/controller/bff_api/resolvers/beauty_business_*.py`.

## Missing components

- **Messages list/empty/thread** — no `BeautyBusinessMessagesListComponent`, `BeautyBusinessConversationComponent`. Toast atom exists but isolated.
- Backend resolvers `beauty_business_messages_list.py`, `beauty_business_conversation.py` likely also absent.

## Design tokens (`:host`)

```scss
:host {
  --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
  --text: #0F1115; --text-muted: #6B6F77;
  --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF;
  --ink: #0A0A0B;
  --success: #2F7A47; --success-soft: #E5F3EA;
  --warn: #8A6A1F; --warn-soft: #FFF4DA;
  --danger: #C0392B; --danger-soft: #FCE8E5;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-display: 'Cormorant Garamond', Georgia, serif;
  --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
}
```

## Critical UI changes vs current portal

| Current | Required |
|---|---|
| Royal-blue primary | Green `#2F7A47` primary (wizard CTAs), Ink `#0F1115` for utility |
| Price in cents (5000) | `$` prefix decimal (`120.00`) — `prov-price-input` exists |
| Native checkboxes for hours | Segmented Closed/Open/24h per day |
| Top pill nav | Bottom tab bar (5 tabs · badges) — `prov-tab-bar` exists |
| System fonts | Cormorant Garamond display + Inter body + ui-monospace |
| Plain header | Wordmark + baby-blue "Business Portal" pill badge |
| Polling msgs | WebSocket reactive messaging + toast |

## Per-page implementation order (natural user journey)

1. Wizard (8): wiz-1, wiz-1-registered, wiz-2..wiz-5, wiz-6, wiz-6-accepted
2. Dashboard (2): dash-v1, dash-empty
3. Services (5): svc-v1, svc-empty, svc-add, svc-edit, svc-delete
4. Hours (1): hours-1
5. Bookings (2): bookings-1, bookings-empty
6. Profile & Settings (6): prof-1, settings-1, email-contact, pw-1, del-account, signout
7. Messages (5): msg-list, msg-empty, msg-thread, msg-toast-dash, msg-toast-svc

## Per-page workflow

```
1. Read source jsx artboard
2. Edit existing component(s) / create new if absent
3. docker compose up -d --build beauty_frontend (or backend if resolver changed)
4. docker rm -f main_frame-backend-1 ; docker compose up -d backend   # if frontend-only rebuild
5. browser_resize 390x844 (or 1100 for wiz-1)
6. browser_navigate http://localhost:4200/business/...
7. browser_wait_for time=3
8. browser_take_screenshot fullPage=true filename=after-<id>.png
9. Post screenshot path + one-line summary → STOP, wait for approval
10. After approval, write Playwright e2e test → run green → mark todo completed
```

## Auth bootstrap

- Fresh signup: `/welcome` → `/business/signup` → `/business/apply/entity` (wiz-1).
- Backend rebuild rotates JWT signing key; re-signup needed.

## Anti-patterns to avoid

- No bulk-implementation across pages without approval
- No hardcoded badge counts; wire to BFF `_links` / data
- No `(click)="$event.preventDefault()"`, no `href="#"`
- No `--accent-blue-deep` for body text (fails 4.5:1 contrast)
- No `aria-pressed` on on/off toggles (use `role="switch"` + `aria-checked`)
- No live countdown inside button label (spams aria-live)
- No `<div role="grid">` calendar (use `<table role="grid">`)
- No mocked backend in e2e tests
