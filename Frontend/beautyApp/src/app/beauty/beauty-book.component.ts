/**
 * BeautyBookComponent (Presentational)
 * ------------------------------------
 * Customer-web booking / checkout screen. Desktop layout per design
 * `WebCustomerBookingDetail`: shared CustTopNav, breadcrumb + title, a
 * two-column body — left: service card + day/time picker; right: a sticky
 * Review/checkout card (summary, price + tax, total, free-cancel notice,
 * Confirm). Collapses to single column on mobile. RN app untouched.
 *
 * Behaviour preserved & BFF-driven: the BFF supplies a flat list of ISO slot
 * timestamps; we group them by provider-local day, render selectable day +
 * time buttons, and POST `{ service_id, slot_at }` to `submit_href`, then
 * navigate to the success screen with the returned booking id.
 *
 * NOTE: tax is a presentational 8.5% line (the BFF returns no tax/fees yet).
 */

import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { CustTopNavComponent } from './cust-web/cust-top-nav.component';
import { BeautyHomeSearchComponent } from './beauty-home-search.component';

interface BookField {
  name: string;
  type: string;
  label?: string;
  value?: string | number;
  options?: { value: string; label: string }[];
  required?: boolean;
}

interface BookForm {
  submit_method: string;
  submit_href: string;
  success_screen: string;
  success_route_template?: string;
  fields: BookField[];
  submit_label: string;
}

interface DayButton {
  iso: string;       // YYYY-MM-DD (provider-local)
  dow: string;       // Thu
  dayNum: number;    // 14
  hasSlots: boolean;
  isSelected: boolean;
}

interface TimeChip { value: string; label: string; }

const TAX_RATE = 0.085;

@Component({
  selector: 'app-beauty-book',
  standalone: true,
  imports: [CommonModule, FormsModule, CustTopNavComponent, BeautyHomeSearchComponent],
  template: `
    <div class="cust-book">
      <app-cust-top-nav active="" [links]="links" [signedIn]="true" (follow)="emit($event)">
        <app-beauty-home-search topnav-search></app-beauty-home-search>
      </app-cust-top-nav>

      <main id="main" class="book-main">
        <div class="book-inner">
          <!-- Breadcrumb + title -->
          <div class="crumb">
            <button type="button" class="crumb-link" (click)="emit(links['provider'])" [disabled]="!links['provider']">{{ providerName || 'Studio' }}</button>
            <span class="crumb-sep">›</span>
            <span class="crumb-current">{{ serviceName }}</span>
          </div>
          <h1 class="title">{{ serviceName }}</h1>
          <div class="subtitle" *ngIf="metaLine">{{ metaLine }}</div>

          <div class="grid">
            <!-- LEFT -->
            <div class="col-main">
              <!-- Service card -->
              <div class="card svc-card">
                <span class="svc-thumb" [style.--hue]="heroHue"></span>
                <div class="svc-body">
                  <div class="svc-cat" *ngIf="categoryLabel">{{ categoryLabel }}</div>
                  <div class="svc-name">{{ serviceName }}</div>
                  <div class="svc-meta">
                    <span class="mono">{{ durationMinutes }} min</span>
                    <span class="mono" *ngIf="priceLabel">{{ priceLabel }}.00</span>
                    <span class="svc-cancel">· Free cancel up to 5 min after booking</span>
                  </div>
                  <p class="svc-desc" *ngIf="serviceDescription">{{ serviceDescription }}</p>
                </div>
              </div>

              <!-- Day / time picker -->
              <div class="card picker" *ngIf="hasAnySlots; else noSlots">
                <h3 class="picker-title">Pick a day</h3>
                <div class="day-grid">
                  <button
                    *ngFor="let d of dayButtons"
                    type="button"
                    class="day"
                    [class.is-selected]="d.isSelected"
                    [disabled]="!d.hasSlots"
                    (click)="selectDay(d.iso)"
                  >
                    <span class="day-dow">{{ d.dow }}</span>
                    <span class="day-num">{{ d.dayNum }}</span>
                    <span class="day-off mono" *ngIf="!d.hasSlots">Closed</span>
                  </button>
                </div>

                <h3 class="picker-title">Pick a time</h3>
                <div class="time-grid" *ngIf="timeChipsForSelectedDay.length; else noTimes">
                  <button
                    *ngFor="let t of timeChipsForSelectedDay"
                    type="button"
                    class="time"
                    [class.is-selected]="t.value === selectedSlot"
                    (click)="selectSlot(t.value)"
                  >{{ t.label }}</button>
                </div>
                <ng-template #noTimes><div class="empty">No times available for this day.</div></ng-template>
              </div>
              <ng-template #noSlots>
                <div class="card"><div class="empty">No availability right now. Check back soon.</div></div>
              </ng-template>

              <p *ngIf="serverError" class="server-error" role="alert" aria-live="assertive">{{ serverError }}</p>
            </div>

            <!-- RIGHT: review / checkout -->
            <aside class="col-side">
              <div class="card checkout">
                <h3 class="picker-title">Review</h3>
                <div class="rev-rows">
                  <div class="rev-row"><span class="mono">Service</span><span class="rev-v">{{ serviceName }}</span></div>
                  <div class="rev-row"><span class="mono">Studio</span><span class="rev-v">{{ providerName || '—' }}</span></div>
                  <div class="rev-row"><span class="mono">When</span><span class="rev-v">{{ whenLabel }}</span></div>
                  <div class="rev-row"><span class="mono">Length</span><span class="rev-v">{{ durationMinutes }} min</span></div>
                </div>
                <div class="rev-price">
                  <div class="rev-line"><span>Service</span><span class="mono">{{ priceLabel }}.00</span></div>
                  <div class="rev-line"><span>Tax</span><span class="mono">{{ taxLabel }}</span></div>
                </div>
                <div class="rev-total">
                  <span class="rev-total-l">Total</span>
                  <span class="rev-total-v">{{ totalLabel }}</span>
                </div>
                <div class="cancel-note">Free cancel for 5 minutes after booking. After that, a $20 cancel fee applies within 24 hours.</div>
                <button
                  type="button"
                  class="btn-confirm"
                  [disabled]="!canSubmit() || isSubmitting"
                  (click)="onSubmit()"
                >
                  <span *ngIf="isSubmitting" class="spinner" aria-hidden="true"></span>
                  <span>{{ confirmLabel }}</span>
                </button>
                <div class="pay-line mono">Apple Pay · Google Pay · Card</div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --accent-blue-text: #1a3a52;
      --ink: #0A0A0B; --ink-soft: #1F1F22; --danger: #C0392B; --hue: #5C4A3F;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh; background: var(--surface);
      font-family: var(--font-body); color: var(--text);
    }
    * { box-sizing: border-box; }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    .cust-book { display: flex; flex-direction: column; min-height: 100dvh; }
    .book-main { flex: 1; padding: 24px 32px 48px; }
    .book-inner { max-width: 1280px; margin: 0 auto; }
    .mono { font-family: var(--font-mono); font-size: 12px; color: var(--text-muted); }

    .crumb { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
    .crumb-link { background: none; border: none; padding: 0; color: var(--text-muted); cursor: pointer; font: inherit; }
    .crumb-link:hover:not(:disabled) { color: var(--text); text-decoration: underline; }
    .crumb-sep { margin: 0 6px; }
    .crumb-current { color: var(--text); font-weight: 600; }
    .title { font-family: var(--font-display); font-size: 44px; font-weight: 500; line-height: 1.1; }
    .subtitle { margin-top: 8px; font-size: 14px; color: var(--text-muted); }

    .grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 24px; margin-top: 24px; align-items: start; }
    .col-main { display: flex; flex-direction: column; gap: 14px; }

    .card { background: #fff; border: 1px solid var(--line); border-radius: 16px; padding: 24px; }

    .svc-card { display: flex; gap: 16px; align-items: flex-start; }
    .svc-thumb { width: 96px; height: 96px; border-radius: 14px; flex-shrink: 0;
      background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--hue) 18%, transparent) 0, color-mix(in srgb, var(--hue) 18%, transparent) 8px, color-mix(in srgb, var(--hue) 28%, transparent) 8px, color-mix(in srgb, var(--hue) 28%, transparent) 16px), color-mix(in srgb, var(--hue) 42%, #fff); }
    .svc-cat { font-size: 11px; font-weight: 700; letter-spacing: 1.4px; text-transform: uppercase; color: var(--accent-blue-deep); }
    .svc-name { font-family: var(--font-display); font-size: 28px; font-weight: 500; margin-top: 4px; }
    .svc-meta { margin-top: 8px; display: flex; gap: 14px; flex-wrap: wrap; align-items: baseline; font-size: 13px; }
    .svc-meta .mono { color: var(--text); }
    .svc-cancel { color: var(--text-muted); }
    .svc-desc { margin-top: 16px; font-size: 14px; line-height: 1.6; }

    .picker-title { font-family: var(--font-display); font-size: 22px; font-weight: 500; margin-bottom: 14px; }
    .picker .picker-title:nth-of-type(2) { margin-top: 22px; }
    .day-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 22px; }
    .day {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 12px 0; border: 1.5px solid var(--line); border-radius: 12px;
      background: #fff; color: var(--text); cursor: pointer; font-family: var(--font-body);
    }
    .day:hover:not(:disabled) { border-color: var(--text); }
    .day:disabled { opacity: .5; cursor: not-allowed; color: var(--text-muted); }
    .day.is-selected { background: var(--ink); color: #fff; border-color: var(--ink); }
    .day-dow { font-size: 10px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; color: var(--text-muted); }
    .day.is-selected .day-dow { color: rgba(255,255,255,0.7); }
    .day-num { font-family: var(--font-display); font-size: 22px; font-weight: 500; }
    .day-off { font-size: 9px; }

    .time-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
    .time {
      padding: 10px 0; border: 1.5px solid var(--line); border-radius: 10px;
      background: #fff; color: var(--text); cursor: pointer;
      font-family: var(--font-mono); font-size: 12px; font-weight: 600;
    }
    .time:hover { border-color: var(--accent-blue-deep); }
    .time.is-selected { background: var(--ink); color: #fff; border-color: var(--ink); }

    .empty { color: var(--text-muted); font-size: 13px; padding: 8px 0; }
    .server-error { background: #FCE8E5; border: 1px solid #F4B5AE; border-radius: 10px; padding: 10px 14px; color: #8A2419; font-size: 13px; }

    /* Checkout */
    .col-side { position: sticky; top: 88px; }
    .checkout { display: flex; flex-direction: column; }
    .rev-rows { display: flex; flex-direction: column; gap: 10px; padding-bottom: 14px; border-bottom: 1px solid var(--surface); }
    .rev-row { display: flex; justify-content: space-between; gap: 12px; }
    .rev-v { font-size: 13px; font-weight: 500; text-align: right; }
    .rev-price { padding: 14px 0; border-bottom: 1px solid var(--surface); display: flex; flex-direction: column; gap: 8px; }
    .rev-line { display: flex; justify-content: space-between; font-size: 13px; }
    .rev-line .mono { color: var(--text); }
    .rev-total { display: flex; justify-content: space-between; align-items: baseline; padding: 14px 0; }
    .rev-total-l { font-size: 14px; font-weight: 700; }
    .rev-total-v { font-family: var(--font-display); font-size: 26px; font-weight: 500; }
    .cancel-note { background: var(--accent-blue); border: 1px solid rgba(125,168,207,0.33); color: var(--accent-blue-text); border-radius: 10px; padding: 12px; font-size: 12px; line-height: 1.5; margin-bottom: 14px; }
    .btn-confirm {
      width: 100%; height: 48px; border-radius: 10px; cursor: pointer;
      background: var(--ink); color: #fff; border: 1px solid var(--ink);
      font-family: var(--font-body); font-size: 15px; font-weight: 600;
      display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn-confirm:hover:not(:disabled) { background: var(--ink-soft); border-color: var(--ink-soft); }
    .btn-confirm:disabled { background: #D4D4D7; border-color: #D4D4D7; color: #9A9AA0; cursor: not-allowed; }
    .pay-line { text-align: center; margin-top: 10px; }

    .spinner { width: 16px; height: 16px; border: 2.5px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }

    @media (max-width: 980px) {
      .grid { grid-template-columns: 1fr; }
      .col-side { position: static; }
      .title { font-size: 34px; }
      .book-main { padding: 20px; }
      .time-grid { grid-template-columns: repeat(4, 1fr); }
    }
  `],
})
export class BeautyBookComponent implements OnChanges {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  values: Record<string, string | number> = {};
  isSubmitting = false;
  serverError = '';
  selectedDay = '';

  private slotDays = new Set<string>();
  private earliestDay = '';
  private latestDay = '';

  constructor(private authService: BeautyAuthService) {}

  ngOnChanges(_: SimpleChanges): void {
    this.rebuildSlots();
  }

  // ── Data accessors ─────────────────────────────
  get form(): BookForm | null { return (this.data['form'] as BookForm) || null; }
  get slotField(): BookField | null { return this.form?.fields.find((f) => f.name === 'slot_at') || null; }
  get providerTimezone(): string | undefined {
    return (this.data['provider'] as { timezone?: string } | undefined)?.timezone;
  }
  get serviceName(): string { return (this.data['service'] as { name?: string })?.name || 'Service'; }
  get serviceDescription(): string { return (this.data['service'] as { description?: string })?.description || ''; }
  get categoryLabel(): string {
    const c = (this.data['service'] as { category?: string })?.category;
    return c ? this.toTitle(c) : '';
  }
  get heroHue(): string {
    const HUE: Record<string, string> = { hair: '#5C4A3F', nails: '#A88A7A', brows: '#5F5A4A', lashes: '#574A3D', facial: '#7A8B6E', facials: '#7A8B6E', massage: '#3A3A3A', wax: '#A06B2C', makeup: '#5C4A8A', skin: '#7A8B6E' };
    const c = ((this.data['service'] as { category?: string })?.category || '').toLowerCase();
    return HUE[c] || '#5C4A3F';
  }
  get durationMinutes(): number {
    return (this.data['service'] as { duration_minutes?: number })?.duration_minutes || 0;
  }
  get priceCents(): number {
    return (this.data['service'] as { price_cents?: number })?.price_cents || 0;
  }
  get priceLabel(): string {
    return this.priceCents ? `$${(this.priceCents / 100).toFixed(0)}` : '';
  }
  get taxLabel(): string { return `$${((this.priceCents * TAX_RATE) / 100).toFixed(2)}`; }
  get totalLabel(): string { return `$${((this.priceCents * (1 + TAX_RATE)) / 100).toFixed(2)}`; }
  get metaLine(): string {
    const prov = this.data['provider'] as { name?: string; location_label?: string } | undefined;
    const parts: string[] = [];
    if (prov?.name) parts.push(`at ${prov.name}`);
    if (prov?.location_label) parts.push(prov.location_label);
    return parts.join(' · ');
  }
  get providerName(): string { return (this.data['provider'] as { name?: string })?.name || ''; }

  get hasAnySlots(): boolean { return this.slotDays.size > 0; }

  get allTimeChips(): TimeChip[] {
    return (this.slotField?.options || []).map((o) => ({
      value: o.value,
      label: this.formatTimeOnly(o.value) || o.label,
    }));
  }
  get timeChipsForSelectedDay(): TimeChip[] {
    if (!this.selectedDay) return [];
    return this.allTimeChips.filter((c) => this.toLocalDateIso(c.value) === this.selectedDay);
  }
  get selectedSlot(): string {
    const v = this.values['slot_at'];
    return typeof v === 'string' ? v : '';
  }

  /** Consecutive days from earliest→latest slot day (capped), like the design row. */
  get dayButtons(): DayButton[] {
    if (!this.earliestDay) return [];
    const out: DayButton[] = [];
    const [sy, sm, sd] = this.earliestDay.split('-').map((n) => parseInt(n, 10));
    let cur = new Date(sy, sm - 1, sd, 12);
    const end = (() => { const [y, m, d] = this.latestDay.split('-').map((n) => parseInt(n, 10)); return new Date(y, m - 1, d, 12); })();
    let guard = 0;
    while (cur <= end && guard < 21) {
      const iso = this.toLocalDateIsoFromDate(cur);
      out.push({
        iso,
        dow: cur.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNum: cur.getDate(),
        hasSlots: this.slotDays.has(iso),
        isSelected: iso === this.selectedDay,
      });
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1, 12);
      guard++;
    }
    return out;
  }

  get whenLabel(): string {
    const slot = this.selectedSlot;
    if (!slot) return 'Select a time';
    const day = this.formatDayLabel(this.selectedDay);
    const time = this.formatTimeOnly(slot);
    return [day, time].filter(Boolean).join(' · ');
  }

  get confirmLabel(): string {
    if (this.isSubmitting) return 'Booking…';
    return this.form?.submit_label || 'Confirm booking';
  }

  // ── Interaction ─────────────────────────────
  selectDay(iso: string): void {
    this.selectedDay = iso;
    if (this.toLocalDateIso(this.selectedSlot) !== iso) this.values['slot_at'] = '';
  }
  selectSlot(value: string): void {
    this.values['slot_at'] = value;
    this.selectedDay = this.toLocalDateIso(value);
  }
  canSubmit(): boolean {
    const slot = this.selectedSlot;
    return !!slot && this.allTimeChips.some((c) => c.value === slot);
  }
  emit(link: BffLink | null | undefined): void { if (link) this.followLink.emit(link); }

  onSubmit(): void {
    if (!this.form || this.isSubmitting || !this.canSubmit()) return;
    this.serverError = '';
    this.isSubmitting = true;

    const body: Record<string, unknown> = {};
    for (const f of this.form.fields) {
      body[f.name] = f.type === 'hidden' ? f.value : this.values[f.name];
    }

    const submitLink: BffLink = {
      rel: 'submit', href: this.form.submit_href,
      method: (this.form.submit_method as BffLink['method']) || 'POST',
      screen: null, route: null, prompt: null,
    };

    this.authService.follow(submitLink, body).subscribe({
      next: (resp: unknown) => {
        this.isSubmitting = false;
        const bookingId = (resp as { id?: number | string } | null)?.id ?? null;
        const template = this.form?.success_route_template;
        const route = template && bookingId != null ? template.replace(':bookingId', String(bookingId)) : null;
        this.followLink.emit({
          rel: 'success', href: null, method: 'NAV',
          screen: this.form?.success_screen || 'beauty_bookings', route, prompt: null,
        });
      },
      error: (err) => {
        this.isSubmitting = false;
        this.serverError = (err?.error?.detail as string) || 'Could not create that booking. Please try again.';
      },
    });
  }

  // ── Slot helpers ─────────────────────────────
  private rebuildSlots(): void {
    const next: Record<string, string | number> = {};
    for (const f of this.form?.fields || []) {
      if (f.value != null) next[f.name] = f.value;
    }
    this.values = next;

    this.slotDays = new Set<string>();
    let earliest = '';
    let latest = '';
    for (const o of this.slotField?.options || []) {
      const iso = this.toLocalDateIso(o.value);
      if (!iso) continue;
      this.slotDays.add(iso);
      if (!earliest || iso < earliest) earliest = iso;
      if (!latest || iso > latest) latest = iso;
    }
    this.earliestDay = earliest;
    this.latestDay = latest || earliest;
    this.selectedDay = earliest;
  }

  private toLocalDateIso(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const tz = this.providerTimezone;
    if (tz) {
      try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
      } catch { /* fall through */ }
    }
    return this.toLocalDateIsoFromDate(d);
  }

  private toLocalDateIsoFromDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private formatDayLabel(iso: string): string {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
    if (!y) return '';
    return new Date(y, m - 1, d, 12).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  private formatTimeOnly(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const opts: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
    if (this.providerTimezone) opts.timeZone = this.providerTimezone;
    try {
      return new Intl.DateTimeFormat(undefined, opts).format(d);
    } catch {
      return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d);
    }
  }

  private toTitle(s: string): string { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
}
