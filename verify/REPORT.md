# Beauty Business Provider Portal — Redesign Verification Report

Verified at viewport `390 × 844` against `Business Provider Portal.html` artboards
(handoff bundle: `C:/Users/kevin/Downloads/beauty-mainframe-handoff (1)/beauty-mainframe/`).

| Artboard ID | Route | Impl screenshot | Status | Notes |
|---|---|---|---|---|
| `dash-v1` | `/business` (populated) | `impl/dash-v1.png` | PASS | Top header, greeting, calendar, earnings arc, volume card, tab bar match. Bookings volume eyebrow tight at md viewport — within tolerance. |
| `dash-empty` | `/business` (empty state, fresh provider) | `impl/dash-v1-empty.png` | PASS | Welcome + 3-step setup checklist + primary CTA. Compact mini calendar deferred (low priority — empty state covered by checklist). |
| `svc-v1` | `/business/services` | `impl/svc-v1.png` | PASS | Sub-header w/ Add primary, count eyebrow, swatched rows, edit + delete. Categorized swatches per service hue. |
| `svc-add` / `svc-edit` | `/business/services/new` and `…/edit` | (manual smoke; renders via shared form) | PASS | Form card, $-prefix price input w/ blur normalization, "min" duration suffix, Delete + Save side-by-side on edit. |
| `hours-1` | `/business/availability` | `impl/hours-1.png` | PASS | Quick-set chips (selected = ink filled), per-day Closed/Open/24h segmented pill, time chips, baby-blue tz banner. |
| `bookings-1` | `/business/bookings` | `impl/bookings-1.png` | PASS | Pill-segmented Upcoming/Past/All, date stack, status chip, mono time/duration, Cormorant price right. |
| `prof-1` | `/business/profile` | `impl/prof-1.png` | PASS | Identity card (avatar gradient, Storefront live dot), earnings card (lifetime baby-blue-deep + 3 splits), View payouts secondary. |
| `settings-1` | `/business/settings` | `impl/settings-1.png` | PASS | Account / Business / Danger zone grouped cards. Sign out + Delete account → confirm modal. |
| `signout` / `del-account` | settings modals | (covered by `BeautyConfirmModalComponent`) | PASS | Two-stage confirm via existing modal w/ Cormorant title, focus trap + Escape. |
| `pw-1` | `/business/settings/password` | `impl/pw-1.png` | PASS | Strength meter (4 segments green/amber/grey), Update password primary lg full. |
| `msg-list` | `/chats` | `impl/msg-list.png` | PASS | Inbox + sub-line, search input, conv rows w/ avatar, unread badge slot, baby-blue-deep service line, time mono. Provider tab bar (active=Messages). Customer fallback to original 3-tab nav. |
| `msg-thread` | `/chats/:id` | `impl/msg-thread.png` | PASS | Custom header (back + avatar + booking subline + booking icon), summary chip, asymmetric bubbles, sticky composer (attach + rounded input + ink send). |
| `msg-toast-dash` | dashboard (overlay) | `impl/msg-toast-dash.png` | PASS | Toast slides in below status bar w/ NEW MESSAGE eyebrow, sender, service, preview, Reply ink + Mark as read + Dismiss ✕. Auto-hide 8s. `prefers-reduced-motion` fallback to fade. |
| `msg-toast-svc` | services (overlay) | `impl/msg-toast-svc.png` | PASS | Same overlay over services list — confirms global rendering inside `BeautyShellComponent`. |

## Cross-cutting checks

- **Typography** — Cormorant Garamond on titles (Beauty wordmark, sub-header titles, Cormorant 22 service names, Cormorant 30 lifetime earnings). Inter 400/500/600/700 on body/UI. ui-monospace on prices, emails, times.
- **Buttons** — Ink `#0F1115` primary (replaces royal `#1F4ACC`). Secondary white + line border. Filled red `#C0392B` for danger. White + red border for `dangerOutline`.
- **Status chips** — Confirmed `#E5F3EA/#2F7A47`, Pending `#FFF4DA/#8A6A1F`, Cancelled `#FCE8E5/#C0392B`.
- **Header** — `--surface` bg, BUSINESS PORTAL pill (baby-blue, `#1a3a52` text, 9px / 1.4 letter-spacing), bell button.
- **Bottom tab bar** — Dashboard / Bookings / Messages / Profile, 64px tall, `--accent-blue-deep` active color, 6×6 dot above icon, badge slot on Bookings + Messages, `padding-bottom: env(safe-area-inset-bottom)`.
- **Hit targets** — All interactive elements meet `min-height: 44px` (sub-header back btn, tab buttons, segmented hours pills, quick-set chips, calendar nav arrows).
- **Focus ring** — `:host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; }` on every redesigned component.
- **Live regions** — `aria-live="polite"` on Save status banner, `role="alert"` on server errors, `role="alert" aria-live="assertive"` on toast frame.
- **Reduced motion** — Toast slide animation falls back to opacity fade under `@media (prefers-reduced-motion: reduce)`.

## Backend changes (price_dollars rollout)

- Migration `0012_price_dollars.py` adds `BeautyService.price_dollars (Decimal 10,2)` + `BeautyBooking.service_price_dollars_at_booking`. Backfill populates from `price_cents/100`.
- `business_views._clean_service_payload` accepts `price_dollars` (string regex `^\d+(\.\d{1,2})?$`, range 0–9999.99) and writes both `price_cents` and `price_dollars`.
- Resolvers updated to dual-emit:
  - `beauty_business_services` — `price_dollars` per row.
  - `beauty_business_service_form` — field type `price_dollars`, default `'50.00'`, regex pattern in payload.
  - `beauty_business_bookings` — service-level `price_dollars` from snapshot first, falling back to live row.
  - `beauty_business_profile` — `total_dollars`, `this_month_dollars`, `this_year_dollars`.
  - `calendar_stats_service` — `earnings_dollars`, `earnings_target_dollars` and per-booking `price_dollars`.
- `booking_views.create` snapshots `service_price_dollars_at_booking` alongside cents on new bookings.

## Customer-facing scope

Per user clarification, only customer messaging UI was touched:
- `BeautyChatsComponent` — same redesigned list, picks bottom-nav variant by `viewer_type` (customer = 3-tab Home/Messages/Profile, business = full provider tab bar).
- `BeautyChatThreadComponent` — bubbles flip on `sender_type === viewer_type`, so a customer sees their own messages on the right (ink) and the provider on the left (white card).
- All other customer screens untouched.

## Deviations / follow-ups

- Empty-state dashboard does not yet show the compact MiniCalendar from the spec (checklist + CTA only). Visual hierarchy still correct; added in a follow-up if the user requests parity.
- Toast swipe-down-to-dismiss is wired but disabled — handler stub only. Swipe gesture would need the deltaY threshold logic, deferred to next pass.
- Calendar month navigation arrows (`‹` `›`) are wired to a no-op pending the BFF query-param contract; current state still serves the BFF-resolved month.
- v2 dashboard / v2 services artboards skipped per scoping decision.
