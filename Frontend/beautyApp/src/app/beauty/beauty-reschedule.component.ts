/**
 * BeautyRescheduleComponent (Presentational)
 * ------------------------------------------
 * Customer-web reschedule screen. Desktop layout mirroring the booking flow
 * (`WebCustomerBookingDetail`): shared CustTopNav, breadcrumb + title, a
 * two-column body — left: a "currently booked" note + day/time picker; right:
 * a sticky Review card (Service / Studio / Current time / New time) with a
 * Confirm-new-time button. Collapses on mobile. RN app untouched.
 *
 * Behaviour preserved & BFF-driven: the BFF `form` block carries a `slot_at`
 * select whose options are real availability (current slot excluded). On
 * confirm we POST `{ slot_at }` to `submit_href`, then NAV back to the
 * booking-detail screen so the new slot shows immediately.
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

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';
import { formatSlotLocal } from './beauty-time.util';
import { CustTopNavComponent } from './cust-web/cust-top-nav.component';
import { BeautyHomeSearchComponent } from './beauty-home-search.component';

interface ReField { name: string; type: string; label?: string; value?: string | number; options?: { value: string; label: string }[]; required?: boolean; }
interface ReForm { submit_method: string; submit_href: string; success_screen: string; success_route_template?: string; fields: ReField[]; submit_label: string; }
interface DayButton { iso: string; dow: string; dayNum: number; hasSlots: boolean; isSelected: boolean; }
interface TimeChip { value: string; label: string; }

@Component({
  selector: 'app-beauty-reschedule',
  standalone: true,
  imports: [CommonModule, CustTopNavComponent, BeautyHomeSearchComponent],
  template: `
    <div class="cust-resched">
      <app-cust-top-nav active="" [links]="links" [signedIn]="true" (follow)="emit($event)">
        <app-beauty-home-search topnav-search></app-beauty-home-search>
      </app-cust-top-nav>

      <main id="main" class="resched-main">
        <div class="resched-inner">
          <div class="crumb">
            <button type="button" class="crumb-link" (click)="emit(links['booking'])" [disabled]="!links['booking']">{{ links['booking']?.prompt || 'Booking' }}</button>
            <span class="crumb-sep">›</span>
            <span class="crumb-current">Reschedule</span>
          </div>
          <h1 class="title">Reschedule {{ serviceName }}</h1>
          <div class="subtitle" *ngIf="providerName">at {{ providerName }}<span *ngIf="providerLoc"> · {{ providerLoc }}</span></div>

          <div class="grid">
            <!-- LEFT -->
            <div class="col-main">
              <div class="card current-card">
                <div class="cur-k">Currently booked for</div>
                <div class="cur-v">{{ currentSlotLabel }}</div>
              </div>

              <div class="card picker" *ngIf="hasAnySlots; else noSlots">
                <h3 class="picker-title">Pick a new day</h3>
                <div class="day-grid">
                  <button *ngFor="let d of dayButtons" type="button" class="day" [class.is-selected]="d.isSelected" [disabled]="!d.hasSlots" (click)="selectDay(d.iso)">
                    <span class="day-dow">{{ d.dow }}</span>
                    <span class="day-num">{{ d.dayNum }}</span>
                    <span class="day-off" *ngIf="!d.hasSlots">Closed</span>
                  </button>
                </div>
                <h3 class="picker-title">Pick a new time</h3>
                <div class="time-grid" *ngIf="timeChipsForSelectedDay.length; else noTimes">
                  <button *ngFor="let t of timeChipsForSelectedDay" type="button" class="time" [class.is-selected]="t.value === selectedSlot" (click)="selectSlot(t.value)">{{ t.label }}</button>
                </div>
                <ng-template #noTimes><div class="empty">No times available for this day.</div></ng-template>
              </div>
              <ng-template #noSlots><div class="card"><div class="empty">No alternative times available right now.</div></div></ng-template>

              <p *ngIf="serverError" class="server-error" role="alert" aria-live="assertive">{{ serverError }}</p>
            </div>

            <!-- RIGHT -->
            <aside class="col-side">
              <div class="card checkout">
                <h3 class="picker-title">Review</h3>
                <div class="rev-rows">
                  <div class="rev-row"><span class="mono">Service</span><span class="rev-v">{{ serviceName }}</span></div>
                  <div class="rev-row"><span class="mono">Studio</span><span class="rev-v">{{ providerName || '—' }}</span></div>
                  <div class="rev-row"><span class="mono">Current</span><span class="rev-v rev-old">{{ currentSlotShort }}</span></div>
                  <div class="rev-row"><span class="mono">New time</span><span class="rev-v rev-new">{{ newWhenLabel }}</span></div>
                </div>
                <button type="button" class="btn-confirm" [disabled]="!canSubmit() || isSubmitting" (click)="onSubmit()">
                  <span *ngIf="isSubmitting" class="spinner" aria-hidden="true"></span>
                  <span>{{ isSubmitting ? 'Rescheduling…' : (form?.submit_label || 'Confirm new time') }}</span>
                </button>
                <div class="note mono">Free reschedule up to 4 hours before.</div>
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
      --ink: #0A0A0B; --ink-soft: #1F1F22; --danger: #C0392B;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh; background: var(--surface);
      font-family: var(--font-body); color: var(--text);
    }
    * { box-sizing: border-box; }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }

    .cust-resched { display: flex; flex-direction: column; min-height: 100dvh; }
    .resched-main { flex: 1; padding: 24px 32px 48px; }
    .resched-inner { max-width: 1280px; margin: 0 auto; }
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

    .current-card { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
    .cur-k { font-size: 11px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); }
    .cur-v { font-size: 15px; font-weight: 600; }

    .picker-title { font-family: var(--font-display); font-size: 22px; font-weight: 500; margin-bottom: 14px; }
    .picker .picker-title:nth-of-type(2) { margin-top: 22px; }
    .day-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; margin-bottom: 22px; }
    .day { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 0; border: 1.5px solid var(--line); border-radius: 12px; background: #fff; color: var(--text); cursor: pointer; font-family: var(--font-body); }
    .day:hover:not(:disabled) { border-color: var(--text); }
    .day:disabled { opacity: .5; cursor: not-allowed; color: var(--text-muted); }
    .day.is-selected { background: var(--ink); color: #fff; border-color: var(--ink); }
    .day-dow { font-size: 10px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; color: var(--text-muted); }
    .day.is-selected .day-dow { color: rgba(255,255,255,0.7); }
    .day-num { font-family: var(--font-display); font-size: 22px; font-weight: 500; }
    .day-off { font-family: var(--font-mono); font-size: 9px; }
    .time-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
    .time { padding: 10px 0; border: 1.5px solid var(--line); border-radius: 10px; background: #fff; color: var(--text); cursor: pointer; font-family: var(--font-mono); font-size: 12px; font-weight: 600; }
    .time:hover { border-color: var(--accent-blue-deep); }
    .time.is-selected { background: var(--ink); color: #fff; border-color: var(--ink); }
    .empty { color: var(--text-muted); font-size: 13px; padding: 8px 0; }
    .server-error { background: #FCE8E5; border: 1px solid #F4B5AE; border-radius: 10px; padding: 10px 14px; color: #8A2419; font-size: 13px; }

    .col-side { position: sticky; top: 88px; }
    .checkout { display: flex; flex-direction: column; }
    .rev-rows { display: flex; flex-direction: column; gap: 10px; padding-bottom: 16px; margin-bottom: 16px; border-bottom: 1px solid var(--surface); }
    .rev-row { display: flex; justify-content: space-between; gap: 12px; }
    .rev-v { font-size: 13px; font-weight: 600; text-align: right; }
    .rev-old { color: var(--text-muted); text-decoration: line-through; }
    .rev-new { color: var(--accent-blue-text); }
    .btn-confirm { width: 100%; height: 48px; border-radius: 10px; cursor: pointer; background: var(--ink); color: #fff; border: 1px solid var(--ink); font-family: var(--font-body); font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-confirm:hover:not(:disabled) { background: var(--ink-soft); border-color: var(--ink-soft); }
    .btn-confirm:disabled { background: #D4D4D7; border-color: #D4D4D7; color: #9A9AA0; cursor: not-allowed; }
    .note { text-align: center; margin-top: 10px; }

    .spinner { width: 16px; height: 16px; border: 2.5px solid rgba(255,255,255,0.4); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) { .spinner { animation: none; } }

    @media (max-width: 980px) {
      .grid { grid-template-columns: 1fr; }
      .col-side { position: static; }
      .title { font-size: 34px; }
      .resched-main { padding: 20px; }
      .time-grid { grid-template-columns: repeat(4, 1fr); }
    }
  `],
})
export class BeautyRescheduleComponent implements OnChanges {
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

  ngOnChanges(_: SimpleChanges): void { this.rebuildSlots(); }

  get form(): ReForm | null { return (this.data['form'] as ReForm) || null; }
  get slotField(): ReField | null { return this.form?.fields.find((f) => f.name === 'slot_at') || null; }
  get providerTimezone(): string | undefined { return (this.data['provider'] as { timezone?: string })?.timezone; }
  get serviceName(): string { return (this.data['service'] as { name?: string })?.name || 'service'; }
  get providerName(): string { return (this.data['provider'] as { name?: string })?.name || ''; }
  get providerLoc(): string { return (this.data['provider'] as { location_label?: string })?.location_label || ''; }

  get currentSlotLabel(): string {
    const b = this.data['booking'] as { current_slot_at?: string; current_slot_label?: string } | undefined;
    if (b?.current_slot_at) {
      const local = formatSlotLocal(b.current_slot_at, this.providerTimezone);
      if (local) return local;
    }
    return b?.current_slot_label || '';
  }
  get currentSlotShort(): string {
    const b = this.data['booking'] as { current_slot_at?: string } | undefined;
    if (!b?.current_slot_at) return this.currentSlotLabel;
    const d = new Date(b.current_slot_at);
    return this.fmt(d, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  get hasAnySlots(): boolean { return this.slotDays.size > 0; }

  get allTimeChips(): TimeChip[] {
    return (this.slotField?.options || []).map((o) => ({ value: o.value, label: this.fmtTime(o.value) || o.label }));
  }
  get timeChipsForSelectedDay(): TimeChip[] {
    if (!this.selectedDay) return [];
    return this.allTimeChips.filter((c) => this.toLocalDateIso(c.value) === this.selectedDay);
  }
  get selectedSlot(): string {
    const v = this.values['slot_at'];
    return typeof v === 'string' ? v : '';
  }
  get newWhenLabel(): string {
    const slot = this.selectedSlot;
    if (!slot) return 'Select a time';
    const d = new Date(slot);
    return this.fmt(d, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  get dayButtons(): DayButton[] {
    if (!this.earliestDay) return [];
    const out: DayButton[] = [];
    const [sy, sm, sd] = this.earliestDay.split('-').map((n) => parseInt(n, 10));
    let cur = new Date(sy, sm - 1, sd, 12);
    const [ey, em, ed] = this.latestDay.split('-').map((n) => parseInt(n, 10));
    const end = new Date(ey, em - 1, ed, 12);
    let guard = 0;
    while (cur <= end && guard < 21) {
      const iso = this.toLocalDateIsoFromDate(cur);
      out.push({ iso, dow: cur.toLocaleDateString(undefined, { weekday: 'short' }), dayNum: cur.getDate(), hasSlots: this.slotDays.has(iso), isSelected: iso === this.selectedDay });
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1, 12);
      guard++;
    }
    return out;
  }

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
      next: () => {
        this.isSubmitting = false;
        const target: BffLink = this.links['booking'] || {
          rel: 'success', href: null, method: 'NAV',
          screen: this.form?.success_screen || 'beauty_booking_detail',
          route: this.form?.success_route_template ?? null, prompt: null,
        };
        this.followLink.emit(target);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.serverError = (err?.error?.detail as string) || 'Could not reschedule. Please try a different time.';
      },
    });
  }

  emit(link: BffLink | null | undefined): void { if (link) this.followLink.emit(link); }

  private rebuildSlots(): void {
    this.values = {};
    this.slotDays = new Set<string>();
    let earliest = '', latest = '';
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
    if (tz) { try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); } catch { /* */ } }
    return this.toLocalDateIsoFromDate(d);
  }
  private toLocalDateIsoFromDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  private fmtTime(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '' : this.fmt(d, { hour: 'numeric', minute: '2-digit' });
  }
  private fmt(d: Date, opts: Intl.DateTimeFormatOptions): string {
    if (isNaN(d.getTime())) return '';
    const o: Intl.DateTimeFormatOptions = { ...opts };
    if (this.providerTimezone) o.timeZone = this.providerTimezone;
    try { return new Intl.DateTimeFormat(undefined, o).format(d); }
    catch { return new Intl.DateTimeFormat(undefined, opts).format(d); }
  }
}
