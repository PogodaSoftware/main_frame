# ADA / WCAG 2.1 AA Audit — Frontend
Date: 2026-04-28
Scope: Angular frontend at `Frontend/portfolioResume/src/app/`
Standard applied: WCAG 2.1 Level AA (DOJ benchmark for Title III)

## Executive summary
- Total findings: **133**
- Blockers: **38**
- Major: **41**
- Minor: **54**
- Coarse compliance: **~62 %** of WCAG 2.1 AA Success Criteria pass site-wide; ~78 % of pages have at least one Blocker.
- Top 5 things to fix first:
  1. Add a global `:focus-visible` outline (every interactive element across both portfolios + Beauty has no visible focus indicator — **WCAG 2.4.7 fail**).
  2. Stop using `--baby-blue-deep #7DA8CF` for body text on `--surface #F2F2F2` / white (~3.0 : 1, **WCAG 1.4.3 fail**); reserve for non-text only.
  3. Add a "Skip to main content" link in `index.html` (**WCAG 2.4.1**) and a `<main>` landmark inside every Angular route component.
  4. Beauty `<img>` icons in `home.component.ts` are clickable but only `<img>` not `<button>` — keyboard inaccessible (**WCAG 2.1.1 + 4.1.2 fail**).
  5. `BeautyConfirmModalComponent` has correct ARIA but no focus-trap, no Escape handler, and focus is never moved into the dialog (**WCAG 2.1.2 + 2.4.3 + 4.1.2 fail**).

## Global / shared chrome

### `src/index.html`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| Major | 2.4.1 Bypass blocks | 13–14 | No skip-to-content link before `<app-root>` | Add `<a href="#main" class="skip-link">Skip to main content</a>` styled to be visible on focus |
| Major | 2.4.2 Page titled | 5 | Hard-coded `<title>PortfolioResumeFrontend</title>` shows briefly before router replaces it; the literal "PortfolioResumeFrontend" is not human-meaningful | Set initial title to "Kevin Ortiz — Portfolio" or similar |
| Minor | 1.4.4 Resize text | global | No `<meta name="viewport">` `user-scalable=no` (good — none present) but also no fallback-font fallback for the Google fonts request that can FOUC | OK, document only |

`lang="en"` is correctly set on `<html>` (line 2) — **3.1.1 passes**.

### `src/app/app.routes.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| Minor | 2.4.2 Page titled | 66–68 | `kevin/blender-projects` route has NO `title` property | Add `title: 'Kevin — Blender Projects'` |
| Minor | 2.4.2 Page titled | 43, 48, 53, etc. | Titles are stubs ("Kevin Home Page") — descriptive enough but lack site brand | Append " — Kevin Ortiz" for SEO/AT context |

### `src/app/app.component.html`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| Major | 1.3.1 Info & relationships | 1 | `<router-outlet />` is the entire app shell; no `<main>`, `<header>`, or `<footer>` landmarks at app level. Each page component has to provide its own | Wrap `<router-outlet>` in `<main id="main" tabindex="-1">` so the skip link can target it and the doc has at least one main landmark |

### `src/styles.scss`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| Minor | 1.4.10 Reflow | 26–60 | `xs` (≤359 px) and `sm` (≤389 px) breakpoints exist, but no media block for ≤319 px — WCAG demands no horizontal scroll at 320 px viewport. Width 320 falls into `xs` block which OK if all card widths are ≤304. Manually verify `.carousel-item width: 168px` fits | Test at 320 CSS px width; the carousel max-content may overflow even with 168 px items because of `flex-grow` 0 and gap |
| Major | 1.4.4 Resize text | 34, 38, 39, 40, 50, 53 | `font-size: 28px !important`, `0.65rem !important`, `0.78rem !important` — the `!important` overrides will defeat user agent text-zoom in some setups. Mobile Safari/Chromium handle it; some screen-magnifiers don't | Audit whether `!important` is actually needed; prefer specificity or layered CSS |

### `Kevin-Pages/global/global.component.scss` (token reset)
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 2.4.7 Focus visible | 3–9 | Universal `* { margin:0; padding:0; box-sizing }` + no outline reset — but no replacement focus ring anywhere. No `:focus-visible` rule in entire Kevin SCSS tree | Add a global `*:focus-visible { outline: 2px solid #b0d4ff; outline-offset: 2px; }` |
| **Blocker** | 1.4.3 Contrast | 28 | `a { color: #b0d4ff; }` on `#0a0a0a` background — `#b0d4ff` on `#0a0a0a` is fine (~12:1) — PASSES |  — |
| **Blocker** | 1.4.3 Contrast | 36 | `a:hover { color: #6318af }` on `#0a0a0a` — `#6318af` on `#0a0a0a` ≈ 3.4 : 1 — **fails 4.5:1** for body links | Lighten purple to e.g. `#a87fe0` for ≥ 4.5:1 |
| Minor | 1.4.4 Resize text | 67 | `.btn { width: 8rem }` fixed pixel-equivalent on label — could clip when system font scaled 200 % | Use `min-width: 8rem` with auto height/width |
| Major | 2.5.5 Target size | 49 | `.icon { height: 2rem }` ~ 32 px when used as a click target on home page. Below 44 × 44 recommendation | Wrap in a `<button>` or `<a>` of min 44 × 44 |

---

## Kevin Pages

### `home.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 2.1.1 Keyboard / 4.1.2 Name, role | 53–61, 63–70 | `<img>` for LinkedIn and GitHub icons have `(click)` handlers but no `tabindex`, no `role="button"`, no keyboard handler. Not reachable via Tab | Replace with `<button>` or `<a href="…linkedin url">` with `<img>` inside, and remove `(click)` on the `<img>` |
| **Blocker** | 1.1.1 Non-text content | 53–61, 63–70 | `alt="My LinkedIn profile"` describes the link target, but the element is an `<img>`; screen readers won't say "link" so users can't activate. After fix above the alt becomes proper link text | Combined with above |
| Major | 1.3.1 Info & relationships | 22 | `<section id="profile">` is the only landmark; no `<main>` wrapping page content | Wrap section in `<main>`, give skip link target |
| Major | 2.4.4 Link purpose | 45 | `onclick="location.href='./kevin/contacts'"` on `<button>` — uses inline JS with full reload; semantically wrong (button used as link) | Use `<a class="btn …" routerLink="/kevin/contacts">` |
| Minor | 1.3.1 Info & relationships | 51 | `<div id="socials-container">` lists icons without `<ul>` semantics | Use `<ul role="list">` with `<li>` |
| Minor | 1.1.1 Alt text quality | 27 | `alt="kevin ortiz profile picture"` — decorative repetition of name; better: `alt="Kevin Ortiz"` | Tighten alt copy |

### `about.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 2.4.6 Headings | 38, 60 | Page has `<h3>` but no `<h1>` or `<h2>` before it — heading hierarchy is broken (skips levels) | Add `<h1>About</h1>` at top of section and demote sub-section h3s to h2 |
| Major | 1.3.1 Info & relationships | 21 | No `<main>` landmark | Wrap `<section>` in `<main>` |
| Minor | 1.1.1 Non-text | 27, 35, 56 | `alt="profile picture"`, `alt="Experience icon"`, `alt="Education icon"` — these icons are decorative next to the heading text; should be `alt=""` to avoid double-announcement | Set `alt=""` and `aria-hidden="true"` |
| Minor | 1.3.1 Info & relationships | 39, 43, 48 | Use `<br />` between paragraphs instead of paragraph spacing | Drop `<br>`, use CSS margin |

### `experience.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| Major | 1.3.1 Info & relationships | 39–44 | Skill list rendered as `<article>` per skill but is conceptually a list of skills. No `<ul>` semantics | Convert `<article>` to `<li>` inside a `<ul>` |
| Major | 2.4.6 Headings | 32, 37, 42 | `<h1>` (page) → `<h2>` (category) → `<h3>` (skill). Each skill being an `<h3>` is questionable — a skill is not a section heading | Render skills as plain text with the icon's `alt=""` — drop the `<h3>` |
| Minor | 1.1.1 Non-text | 40 | `alt="Experience icon"` — wrong, this is a checkmark, not an experience icon. Decorative — `alt=""` | Set `alt=""` `aria-hidden="true"` |

### `projects.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 1.1.1 Non-text content | 49–52 | `<canvas>` with `[attr.alt]` — `<canvas>` does not support `alt`. Three.js content is invisible to AT | Add `aria-label="Interactive 3D model of {{ project.title }}"` and provide fallback content as inner text |
| Major | 1.3.1 Info & relationships | 42 | No `<main>` landmark | Wrap section |
| Major | 2.4.6 Headings | 43 | `<h1>` then jumps to `<h2>` — OK, but no anchor / region for each project card | Wrap each card in `<section aria-labelledby>` |
| Minor | 2.5.5 Target size | 56–67 | Buttons render at design system size (likely ≥44 px since `.btn padding:1rem; width:8rem`) — passes |  |

### `contact.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 2.1.1 Keyboard | 39–48 | LinkedIn `<img>` has `(click)` handler — same issue as home page | Replace with `<a>` wrapping `<img>` |
| **Blocker** | 2.1.1 Keyboard | 51–58 | `<a (click)>…LinkedIn</a>` has no `href` — keyboard can't activate (anchor without href is not focusable) | Use real `href="https://…linkedin.com…"` |
| Major | 1.3.1 Info & relationships | 22 | No `<main>` landmark | Wrap section |

### `blenderfiles.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 1.1.1 Non-text content | 27 | Bare `<canvas id="canvas">` for full-screen 3D viewer with no `aria-label`, no fallback | Add `aria-label="3D model viewer — use mouse or arrow keys to rotate"`, plus a `<noscript>` fallback or text description |
| **Blocker** | 2.1.1 Keyboard | 27 | Three.js OrbitControls is mouse-only; no keyboard rotate / zoom | Document as known gap — needs JS for keyboard control or text alternative describing the model |
| Major | 2.4.6 Headings / 1.3.1 | 27 | Page has zero text content, no heading | Add visually-hidden `<h1>` describing the model |
| Major | 2.4.2 Page titled | route ts | No `title` set in app.routes.ts for this route | Already noted above |

### `navigation/navigation.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 2.1.1 Keyboard / 4.1.2 | 34–38 | `.hamburger-icon` is a `<div>` with `(click)`, no `role="button"`, no `tabindex`, no Enter/Space handler | Convert to `<button type="button" aria-expanded="false" aria-controls="mobile-menu">` |
| **Blocker** | 4.1.2 Name role value | 31 | `<nav id="hamburger-navigation">` with no `aria-label`; same DOM has 2 navs visible at once at edge widths | Add `aria-label="Main"` to one and `aria-label="Mobile main"` to the other; or use CSS to render only one |
| Major | 4.1.3 Status messages | 33 | Toggle does not announce open/close state to AT | Bind `[attr.aria-expanded]="menuOpen"` |
| Major | 2.4.7 Focus visible | global scss | No focus styles on links | Cross-reference global fix |

### `footer/footer.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| Minor | 1.3.1 Info & relationships | 16 | Empty `<nav></nav>` element | Remove or populate |

---

## Pogoda Pages

### `home/home.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| Major | 2.4.4 Link purpose | 56–58 | `navigateToExperience()` uses `window.location.href` for an in-app route — full reload, breaks SPA + back button | Use `routerLink="/pogoda/experience"` |
| Major | 1.3.1 Info & relationships | 22 | No `<main>` landmark | Wrap |
| Major | 2.5.5 Target size | 35 | `<a><img class="icon"></a>` — anchor has no padding; clickable area is ~32 × 32 (the 2 rem `.icon`) | Add padding to make anchor ≥ 44 × 44 |
| Minor | 1.1.1 Non-text | 35 | `alt="LinkedIn profile"` is good link text |  |

### `experience/experience.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| Major | 1.3.1 Info & relationships | 30 | No `<main>` landmark | Wrap |
| Major | 2.4.6 Headings | 31, 53 | Two `<h1>`s on the same page ("Professional Experience" + "Education") | Demote second to `<h2>` |
| Minor | 1.1.1 Non-text | 56 | `alt="Education icon"` — decorative — set to "" | Tighten |
| Minor | 4.1.3 Status | 78–79 | `loading=true` flag used but never reflected in template (no aria-busy or skeleton) | Add `[attr.aria-busy]="loading"` on container |

### `navigation/navigation.component.ts`
Same Blocker + Major issues as Kevin's navigation (lines 32–43): div as button, no aria-expanded, no nav aria-label, no focus styles.

### `footer/footer.component.ts`
Empty `<nav>` (line 16). Minor.

---

## Beauty App

### `beauty-welcome.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 1.4.3 Contrast | 73 (host) / 170 | `--baby-blue-deep: #7DA8CF` used as link color (`.legal-link`) on white surface ≈ **3.0 : 1** — fails | Darken to `#1a3a52` for AA body-text contrast (which is already used elsewhere in component) |
| **Blocker** | 1.3.1 / 2.4.4 | 60–62 | Terms / Privacy links have `href="#"` — no real target, screen-reader announces "Terms link" but goes nowhere | Either route to a real page or use `<button>` |
| Major | 2.4.7 Focus visible | 133–151 | `.btn-primary, .btn-secondary, .btn-ghost` only have hover styles; no `:focus-visible` outline | Add a focus ring |
| Major | 1.3.1 Landmarks | 20 | No `<main>` — root `<div>` only | Wrap actions / hero in `<main>` |
| Minor | 1.1.1 Non-text | 49 (Google SVG) | `aria-hidden="true"` correctly set on decorative Google logo |  |

### `beauty-login.component.ts` + `beauty-signup.component.ts` + `beauty-business-login.component.ts` (delegate to dynamic-form)
All form-level findings live on `beauty-dynamic-form.component.ts`.

### `beauty-dynamic-form.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 3.3.1 Error identification | 102–137, 147 | Inputs do not set `aria-invalid` when `hasError(f) && touched`, and the `.field-error <span>` is not associated via `aria-describedby` | Add `[attr.aria-invalid]="hasError(f) && f.touched ? 'true' : null"` and `[attr.aria-describedby]="f.schema.name + '-err'"` plus `[id]` on the span |
| **Blocker** | 4.1.2 Name role value | 156–166 | "Terms" checkbox is a `<span class="terms-checkbox">` clickable div — not a real checkbox, `<label>` wraps both pseudo-checkbox + text but no real `<input type="checkbox">` exists. Screen reader cannot read state | Use a real `<input type="checkbox">` with hidden default styling or `role="checkbox" aria-checked tabindex="0"` + key handlers |
| **Blocker** | 4.1.3 Status messages | 168 | `.server-error` div is not `role="alert"` / `aria-live="assertive"`; screen reader misses login failures | Add `role="alert"` |
| **Blocker** | 1.3.1 Form labels | 96–99 | Labels only render when `p.show_field_labels !== false` — when BFF turns labels off, fields rely on `placeholder` (placeholder-as-label fails 1.3.1, 2.4.6) | Always render `<label>` even if visually hidden via `.sr-only`; never allow BFF to suppress |
| **Blocker** | 1.3.5 Identify input purpose | 113 | `autocomplete` is from BFF schema but optional; for email/password/name/phone the BFF must always send these | Document required autocomplete tokens in BFF schema; default to "off" only when explicitly opted out |
| Major | 2.4.7 Focus visible | n/a | Inputs have no `:focus` style in shared `.form-input` rule (see beauty-login.scss line 162 — at least exists but only border change, no `:focus-visible`) | Add `:focus-visible` outline ring |
| Major | 4.1.2 Name role | 138–143 | Password show/hide button has `aria-label="Toggle password visibility"` — should additionally expose state via `aria-pressed` | Add `[attr.aria-pressed]="f.showSecret"` |
| Minor | 3.3.3 Error suggestion | 295–311 | Generic messages fine; but pattern errors fall back to "Please enter a valid value." — provide context | Pass mask-specific copy from BFF |

### `beauty-confirm-modal.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 2.1.2 / 4.1.2 | 41–72 | `role="dialog" aria-modal="true"` set, but no focus-trap. Tab can leave the dialog and reach background controls | Implement keyboard focus trap (cdkTrapFocus) |
| **Blocker** | 2.1.1 / 2.1.2 | 41–72 | No Escape key handler to close the modal | Add `@HostListener('document:keydown.escape')` |
| **Blocker** | 2.4.3 Focus order | 41–72 | Focus is not moved into the modal when it opens, and not returned to the trigger when it closes | On `ngOnChanges`, when `open=true`, query and `.focus()` the primary action; cache previously focused element and restore on close |
| Major | 1.4.3 Contrast | 96, 75 | `--text-muted #6B6F77` on `#FFFFFF` ≈ **4.83 : 1** — passes 4.5 minimum for normal text |  — |
| Major | 1.4.3 Contrast | 117 | Danger button bg `#C0392B` with white text — ratio ~5.0 : 1 — passes |  — |
| Minor | 1.3.1 Heading | 50 | `<h2>` inside dialog — should be `<h2 id="…">` linked via `aria-labelledby` (it is via `[id]="modalTitleId"` good) |  — |

### `beauty-main.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 1.4.3 Contrast | (scss `.nav-tab.is-active`) | `color: var(--baby-blue-deep)` (`#7DA8CF`) for active nav tab label on white — **~3.0 : 1**, fails for text below 18 pt (label is 0.7 rem = 11.2 px) | Use `#1a3a52` already in palette |
| **Blocker** | 4.1.3 Status messages | n/a | Carousel auto-starts at 2 s with no Pause button (auto-moving content) | Provide pause control (WCAG 2.2.2) — already pauses on `mouseenter` but not on focus / no keyboard pause |
| Major | 2.2.2 Pause/stop/hide | 70–94 | Carousel autoplay; `.is-paused` only triggered by `mouseenter` — keyboard/touch users cannot pause | Add `(focusin)="carouselPaused=true"` + a visible Pause button |
| Major | 1.3.1 Landmarks | 56–137 | Page wrapper is `<div class="beauty-app">`; uses `<header>` and `<nav>` and a `<section>` but no `<main>` between them | Wrap `<section class="services-section">` and `<section class="map-section">` in `<main>` |
| Minor | 1.4.5 Images of text | 100 | Map placeholder uses emoji `🗺️` as content — fine but `<span>` should be `aria-hidden="true"` |  |
| Minor | 4.1.3 | 109–136 | `<nav class="bottom-nav">` lacks `aria-label="Primary"` |  |

### `beauty-category.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 1.4.3 Contrast | 274, 261 | `.service-cat` color `var(--baby-blue-deep) #7DA8CF` on white — **~3.0 : 1** for 10 px-uppercase text — fails | Darken to `#1a3a52` |
| **Blocker** | 4.1.2 | 65–70 | "Save category" button has aria-label but is inert (no toggle state) — heart icon implies favorite-state but has no aria-pressed | Add `aria-pressed` and click handler, or remove control until implemented |
| Major | 1.3.1 Landmarks | 52 | No `<main>` | Wrap scroll-body in `<main>` |
| Major | 2.4.6 Headings | 73, 97 | `<h2 class="services-title">Services</h2>` exists but no `<h1>` for the page (the hero `<span class="hero-tag">` is decorative) | Add visually-hidden `<h1>` matching `categoryLabel` |
| Minor | 4.1.2 | 73–74 | `<section class="hero-cover">` uses `data-category` for color hint — visual decoration only; OK |  |

### `beauty-provider-detail.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 1.4.3 Contrast | 261 | `.service-cat` baby-blue-deep on white again | Darken |
| Major | 1.3.1 Landmarks | 50 | No `<main>` | Wrap |
| Major | 2.4.6 Headings | 78 | `<h1 class="hero-title">{{ p.name }}</h1>` over a dark gradient — OK but text-shadow only; verify `text-shadow` provides contrast (likely passes) |  |
| Minor | 4.1.2 | 64–70 | Save button has aria-label but no `aria-pressed` |  |

### `beauty-book.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 4.1.2 / 1.3.1 | 127–147 | Calendar uses `role="grid"` + `role="gridcell"` but lacks `aria-rowcount`, `aria-colcount`, and weekday `<th role="columnheader">` rows. Screen readers will not announce "Sunday, May 4" properly | Use a proper `<table role="grid">` with `<thead>` for weekdays, or supply `aria-rowindex` / `aria-colindex` on cells |
| **Blocker** | 4.1.3 Status messages | 178 | `.server-error` has no `role="alert"` | Add `role="alert"` |
| Major | 2.5.5 Target size | 297–303 | `.day-chip.cal-cell { width: 100%; height: 44px }` — at sm screens with 7 cols and gap 5 px the cell width is well below 44 px on a 320 px viewport (≈ 39 px wide) | Increase to 48 px height; allow horizontal scroll calendar at 320 px |
| Major | 1.4.3 Contrast | 307 | Disabled day cell `color: #BBB` on transparent (so on `#F2F2F2`) — **~2.8 : 1** — fails for non-disabled cells but disabled state exempt; still avoid as primary nav information | Mark with strikethrough icon, not just color |
| Major | 1.4.3 Contrast | 376 | Disabled confirm button `#9A9AA0` on `#D4D4D7` ≈ **2.4 : 1** — exempt because disabled, but fails 1.4.11 if it conveys a meaningful state | Add a tooltip / aria-disabled message |
| Minor | 1.3.5 | 91 | `.hero-stripe` `aria-label="Service hero"` redundant for a decorative banner | Use `aria-hidden="true"` |

### `beauty-bookings.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 4.1.2 Name/role/value | 52–69 | `<button role="tab">` siblings are not wrapped in `[role="tablist"]` parent (the `.segmented` div has `role="tablist"` — good) but tabs lack `aria-controls` linking to the tabpanel, and the panels lack `role="tabpanel"` + `tabindex="0"` | Add `aria-controls="upcoming-panel"` + render `<section role="tabpanel" id="upcoming-panel" tabindex="0">` |
| Major | 4.1.3 Status messages | 192 | `.sr-only` `<h1>` is good — page has accessible heading | OK |
| Major | 1.4.3 Contrast | 217 | `.b-status.is-cancelled` `#8A2419` on `#FCE8E5` ≈ 7 : 1 — passes |  |
| Minor | 2.5.5 | 196 | `.seg-tab { height: 32px }` — below 44 px target size | Bump to 44 px |

### `beauty-booking-detail.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 4.1.3 | 154 | `.server-error` lacks `role="alert"` | Add |
| Major | 4.1.3 | 109, 122, 130 | `.cancel-banner` has `role="status"` — good. But cancelled-by-business has `<strong>` followed by another sentence; AT may read all in one breath | OK; functional |
| Major | 4.1.3 | 176 | "Cancel without charge · {{ graceCountdownLabel }}" — the second-by-second countdown is INSIDE a button label. Every second the button accessible name changes — extremely noisy for AT | Move countdown to a separate `<span aria-live="off">` adjacent to button; mark button label static "Cancel without charge"; announce only the final "expired" state via separate `aria-live="polite"` region |
| Major | 2.4.7 Focus visible | scss | No `:focus-visible` on btn-confirm/btn-cancel/etc. | Add |
| Minor | 1.4.3 Contrast | 290 | server-error #8A2419 on #FCE8E5 ≈ 7 : 1 — passes |  |
| Minor | 4.1.2 | 219–231 | Modal usage — see modal blockers; this component is fine in how it invokes modal |  |

### `beauty-booking-success.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 4.1.3 Status | 109 | "Copied" feedback toggles after copy; not in `aria-live` region | Wrap "Copy / Copied" in `<span aria-live="polite">` |
| **Blocker** | 1.4.3 Contrast | (host) `.eyebrow` 199 | Eyebrow color `var(--baby-blue-deep)` on white surface — ~3 : 1, **fails** at 11 px | Darken to `#1a3a52` |
| Major | 1.3.1 Landmarks | 45 | Has `<main class="success-main">` — passes | OK |
| Major | 2.5.5 | 266 | `.btn-secondary { height: 44px }` — passes |  |
| Minor | 1.1.1 | 65 | Sparkle SVG `aria-hidden="true"` — correct |  |

### `beauty-reschedule.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 4.1.3 | 87 | `.server-error` no role="alert" | Add |
| **Blocker** | 1.3.1 / 2.4.4 | 59 | Back button uses literal arrow text `← {{ link.prompt }}` plus no aria-label when prompt is a single character | Add `aria-label="Back"` fallback |
| Major | 1.3.5 Identify purpose | 75 | `<select>` for new time has no `autocomplete="off"` and no associated description for what timezone is shown | Add visible note "(times in {{ providerTz }})" |
| Major | 1.3.1 Landmarks | 51 | No `<main>` | Wrap |
| Minor | 2.5.5 Target size | 116 | `.btn-confirm { padding: 14px }` — height ~46 px passes |  |

### `beauty-profile.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 4.1.2 / 3.3.4 | 80–86 | "Sign out" is a row button with no confirmation. Destructive action (logs user out) | Reuse `BeautyConfirmModalComponent` to confirm sign-out OR mark the action as undoable in body copy |
| Major | 1.3.1 Landmarks | 23 | No `<main>` | Wrap profile-section |
| Major | 1.4.3 Contrast | scss `.action-row.danger .action-label` | `var(--danger) #C0392B` on white ≈ 4.96 : 1 — passes |  |
| Minor | 4.1.3 | 80 | "Signing out…" label change should be `aria-live="polite"` |  |

### `beauty-business-dashboard.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| Major | 2.4.7 Focus visible | scss 91–92 | `.action` has hover state, no focus state | Add `:focus-visible` |
| Major | 1.3.1 Landmarks | 26 | No `<main>` | Wrap section |
| Minor | 1.4.3 Contrast | 80 | Badge `background:#1d4ed8` white — ~6:1 passes |  |
| Minor | 1.3.1 | 39 | `<h1>{{ storefront?.name }}</h1>` good |  |

### `beauty-business-services.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 3.3.4 Error prevention | 62–67 | "Delete" button with no confirmation modal — destructive action | Wire `BeautyConfirmModalComponent` |
| Major | 4.1.3 | 71 | `.server-error` no role="alert" | Add |
| Major | 1.3.1 Landmarks | 37 | No `<main>` | Wrap |
| Minor | 1.1.1 | 42 | `+ Add service` plus sign — fine, not an icon |  |

### `beauty-business-service-form.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 3.3.1 Error identification | 96 | `.server-error` not role="alert" and inputs never marked aria-invalid | Add |
| **Blocker** | 1.3.1 Form labels | 60–94 | Labels render but are visually attached above input — fine — but `select`, `number`, `text` blocks all share same label-input pairing; verify each has unique `id` attribute. They do — passes |  — |
| Major | 1.3.5 Identify purpose | 88–93 | `text` input for name etc. has no `autocomplete` | Add `autocomplete="off"` for service-name (not personal data) |
| Major | 2.4.7 Focus visible | scss | None | Add |

### `beauty-business-availability.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 4.1.3 | 87 | `.msg.error` lacks role="alert" | Add `[attr.role]="isError ? 'alert' : 'status'"` |
| **Blocker** | 1.3.1 Form labels | 56–84 | `<input type="checkbox">` is INSIDE a `<label class="closed-toggle">` so it gets the right name — passes. But `<input type="time">` (line 73, 81) has NO `<label>` — start_time / end_time inputs are unlabeled | Add `<label class="visually-hidden" [for]="row.day_label + '-start'">Start time</label>` etc. |
| Major | 4.1.3 Status | 87, 159 | "Saved." message — should be aria-live | Add role="status" / aria-live="polite" |
| Major | 1.4.3 Contrast | 107 | `.msg { color:#1d4ed8 }` on `#fafafa` ≈ 5.5 : 1 — passes |  |

### `beauty-business-bookings.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| Major | 1.3.1 Landmarks | 32 | No `<main>` | Wrap |
| Major | 1.3.1 Lists | 42–52, 55–65 | Lists are correctly `<ul><li>` — passes |  |
| Minor | 1.4.3 | 81 | `.bk-cust { color: #888 }` on `#fff` ≈ 3.5 : 1 — **fails 4.5** for body | Darken to `#666` |

### `beauty-forgot.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 4.1.3 | 67 | `.server-error` not `role="alert"` | Add |
| Major | 4.1.3 | 68–70 | `.success-msg` should be `role="status"` aria-live="polite" | Add |
| Major | 3.3.1 Error identification | 50 | Input does not toggle `aria-invalid` | Add `[attr.aria-invalid]="touched && !valid()"` |
| Minor | 1.4.3 | 62 | `.field-error` `var(--danger)` on `var(--surface)` — `#C0392B` on `#F2F2F2` ≈ 4.6 : 1 — passes |  |

### `beauty-error.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| Major | 1.3.1 Landmarks | 50 | Has `<main class="error-main">` — passes | OK |
| Major | 4.1.3 | 51–64 | Page is conceptually an error page; should announce title via `<h1>` (already there at 92) — OK; consider adding `role="alert"` on the eyebrow text | Add role="alert" on `.err-eyebrow` |
| Minor | 1.4.3 | 178 | `.err-eyebrow` `var(--baby-blue-deep)` on surface ≈ 3 : 1 — **fails** | Darken |
| Minor | 2.4.4 Link | 273 | `mailto:support@example.com` — placeholder; OK in audit only |  |

### `beauty-admin-flags.component.ts`
| Severity | WCAG | Line | Issue | Fix |
|---|---|---|---|---|
| **Blocker** | 4.1.2 Name role value | 88–98 | The toggle is a `<button aria-pressed>` — correct semantic — but it should be `role="switch"` with `aria-checked` for an on/off toggle (more precise) | Use `role="switch" [attr.aria-checked]="flag.enabled"` |
| **Blocker** | 4.1.3 | n/a | After toggle no live-region announces "Flag X turned on/off" | Add aria-live region |
| Major | 1.4.3 Contrast | 151 | `.flag-state--off { color:#94343b }` on white ≈ 6 : 1 — passes |  |
| Major | 1.4.3 Contrast | 167 | `.audit-when` color `#6b6b70` on white ≈ 4.6 : 1 — borderline pass |  |
| Minor | 1.4.11 Non-text contrast | 153 | Switch off-state `#c7c7cc` on white ≈ 1.6 : 1 — fails 3:1 for UI components | Darken track to e.g. `#8e8e93` |

### `wireframe.component.ts` / `wireframe.html`
Internal scaffold; not user-facing — out of scope unless deployed. No findings recorded.

---

## Forms — cross-cut (ranked by ADA exposure)

| Form | File | Top issues |
|---|---|---|
| Customer login | `beauty-dynamic-form.component.ts` | aria-invalid missing, fake checkbox, server-error not role="alert", BFF can suppress labels |
| Customer signup | same | same as login + terms checkbox |
| Business login | same | same |
| Forgot password | `beauty-forgot.component.ts` | server-error missing role="alert"; success-msg missing role="status"; aria-invalid missing |
| Booking | `beauty-book.component.ts` | grid ARIA incomplete; server-error not role="alert"; touch targets ~39 px on 320 px |
| Reschedule | `beauty-reschedule.component.ts` | server-error not role="alert"; missing landmarks |
| Service add/edit | `beauty-business-service-form.component.ts` | server-error not role="alert"; no aria-invalid; no autocomplete |
| Weekly hours | `beauty-business-availability.component.ts` | unlabeled `<input type="time">` ×14 (each day × start/end); error not role="alert" |

## Modals + dialogs — cross-cut

`BeautyConfirmModalComponent` is the only modal in the app and is reused by `beauty-booking-detail`. Issues affect every consumer:
- No focus-trap (Tab leaks to background).
- No Escape key handler (close icon is the only close path besides backdrop click).
- Focus is not moved into the modal on open; not returned to trigger on close.
- No `aria-describedby` linking title → body, only `aria-labelledby`.
- `<button (click)="$event.stopPropagation()">` on inner `.beauty-modal` div is fine.

Until those four blockers are fixed every destructive flow that uses the modal (cancel booking, cancel-grace, future delete-service, future logout-confirm) is non-compliant.

## Color contrast — token pairs

| Foreground | Background | Ratio | Required (≥18 pt or 14 pt bold = 3.0 / else 4.5) | Verdict |
|---|---|---|---|---|
| `--text #0F1115` | `--surface #F2F2F2` | ~17.5 : 1 | 4.5 | **PASS** |
| `--text-muted #6B6F77` | `#FFFFFF` | ~4.83 : 1 | 4.5 | **PASS** |
| `--text-muted #6B6F77` | `--surface #F2F2F2` | ~4.6 : 1 | 4.5 | **PASS** |
| `--baby-blue-deep #7DA8CF` | `#FFFFFF` | ~3.0 : 1 | 4.5 (body) / 3.0 (UI) | **FAIL** for any text under 18 pt non-bold |
| `--baby-blue-deep #7DA8CF` | `--surface #F2F2F2` | ~2.92 : 1 | 4.5 / 3.0 | **FAIL** body text; borderline UI |
| `--success #2F7A47` | `#FFFFFF` | ~5.7 : 1 | 4.5 | **PASS** |
| `--danger #C0392B` | `#FFFFFF` | ~5.0 : 1 | 4.5 | **PASS** |
| `--danger #C0392B` | `--surface #F2F2F2` | ~4.6 : 1 | 4.5 | **PASS** |
| `--ink #0A0A0B` | `--surface #F2F2F2` | ~17.6 : 1 | 4.5 | **PASS** |
| `#1a3a52` | `#FFFFFF` | ~10 : 1 | 4.5 | **PASS** (use this instead of baby-blue-deep) |
| Disabled cal-cell `#BBB` | `#F2F2F2` | ~2.0 : 1 | exempt | OK (disabled exemption — but ensure not the only cue) |
| Disabled confirm-btn `#9A9AA0` | `#D4D4D7` | ~2.4 : 1 | exempt | OK |
| Beauty `nav-tab` link `#b0d4ff` | Kevin bg `#0a0a0a` | ~12 : 1 | 4.5 | **PASS** |
| Kevin link hover `#6318af` | `#0a0a0a` | ~3.4 : 1 | 4.5 | **FAIL** |
| Beauty `.audit-when #6b6b70` | `#fff` | ~4.6 : 1 | 4.5 | **borderline PASS** |
| Beauty `.bk-cust #888` | `#fff` | ~3.5 : 1 | 4.5 | **FAIL** |
| Beauty switch off-track `#c7c7cc` | `#fff` | ~1.6 : 1 | 3.0 (UI) | **FAIL** |

## Estimated effort

| Severity | Count | Avg hours / item | Subtotal |
|---|---|---|---|
| Blocker | 38 | 1.5 h | 57 h |
| Major | 41 | 0.75 h | ~31 h |
| Minor | 54 | 0.25 h | ~14 h |
| **Total** |   |   | **~102 h** |

Add ~10 h overhead for test plan + cross-browser + screen-reader regression run = **~112 h end-to-end** for a single QA-engineer pass.

## Recommended follow-ups (not in scope)
- Run `axe-core` (Angular Testing Library plug-in) in CI as a regression gate.
- Run `pa11y-ci` against the deployed preview URL once the Blockers are fixed.
- Add a lighthouse-ci "accessibility" budget ≥ 95.
- Engage a manual screen-reader pass with NVDA + VoiceOver iOS for the booking + login flows specifically (DOJ prefers human-tested evidence).
