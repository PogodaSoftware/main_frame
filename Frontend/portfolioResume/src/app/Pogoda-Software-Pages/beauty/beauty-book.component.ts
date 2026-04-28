/**
 * BeautyBookComponent (Presentational)
 * ------------------------------------
 * Service detail / booking screen — invoked when a customer taps a
 * service from the home carousel. Matches the Beauty App Design System
 * BookingDetailPage artboard: hero stripe, day picker, time slot grid,
 * provider card, filled green confirm CTA.
 *
 * BFF integration: the resolver supplies a `form` block with a
 * `slot_at` select whose options are pre-computed ISO timestamps. We
 * group those slots by local date to render the day picker, then
 * filter to time-of-day chips for the selected day. POST body is
 * unchanged (`{ service_id, slot_at }`).
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
import { formatSlotLocal } from './beauty-time.util';

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

interface DayChip {
  iso: string;          // YYYY-MM-DD (local)
  weekday: string;      // MON, TUE, …
  dayNum: number;
}

interface TimeChip {
  value: string;        // raw ISO from BFF — POSTed as `slot_at`
  label: string;        // 12:30 PM
}

@Component({
  selector: 'app-beauty-book',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="beauty-app">
      <header class="sub-header">
        <button
          type="button"
          class="back-btn"
          (click)="emit(links['provider'] || links['home'])"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <span class="sub-header-title">{{ categoryLabel || 'Service' }}</span>
        <span class="sub-header-spacer"></span>
      </header>

      <section class="hero-stripe" [attr.aria-label]="categoryLabel || 'Service hero'">
        <span class="hero-tag">img · {{ heroSlug }}</span>
      </section>

      <section class="detail-section">
        <div class="title-row">
          <h1 class="title">{{ serviceName }}</h1>
          <span *ngIf="priceLabel" class="price">{{ priceLabel }}</span>
        </div>
        <div class="meta">{{ metaLine }}</div>

        <ng-container *ngIf="dayChips.length">
          <div class="section-label">Choose a day</div>
          <div class="day-row">
            <button
              *ngFor="let d of dayChips"
              type="button"
              class="day-chip"
              [class.is-selected]="d.iso === selectedDay"
              (click)="selectDay(d.iso)"
            >
              <span class="day-wd">{{ d.weekday }}</span>
              <span class="day-num">{{ d.dayNum }}</span>
            </button>
          </div>

          <div class="section-label">Available times</div>
          <div *ngIf="timeChipsForSelectedDay.length; else noTimes" class="time-grid">
            <button
              *ngFor="let t of timeChipsForSelectedDay"
              type="button"
              class="time-chip"
              [class.is-selected]="t.value === selectedSlot"
              (click)="selectSlot(t.value)"
            >{{ t.label }}</button>
          </div>
          <ng-template #noTimes>
            <div class="time-empty">No times available for this day.</div>
          </ng-template>
        </ng-container>

        <div *ngIf="providerName" class="provider-card">
          <div class="provider-avatar">{{ providerInitial }}</div>
          <div class="provider-info">
            <div class="provider-name">{{ providerName }}</div>
            <div *ngIf="providerSub" class="provider-sub">{{ providerSub }}</div>
          </div>
          <button
            *ngIf="links['provider']"
            type="button"
            class="provider-change"
            (click)="emit(links['provider'])"
          >Change</button>
        </div>

        <p *ngIf="serverError" class="server-error">{{ serverError }}</p>
      </section>

      <div class="cta-row">
        <button
          type="submit"
          class="btn-confirm"
          [disabled]="!canSubmit() || isSubmitting"
          (click)="onSubmit()"
        >
          <svg *ngIf="!isSubmitting" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span *ngIf="isSubmitting" class="spinner" aria-hidden="true"></span>
          <span>{{ confirmLabel }}</span>
        </button>
      </div>

      <nav class="bottom-nav">
        <button type="button" class="nav-tab" (click)="emit(links['bookings'])" [disabled]="!links['bookings']">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2.5"/>
            <path d="M3 10h18M8 3v4M16 3v4"/>
          </svg>
          <span class="nav-label">Bookings</span>
        </button>
        <button type="button" class="nav-tab is-active" (click)="emit(links['home'])" [disabled]="!links['home']">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M3 11l9-7 9 7v9a1.5 1.5 0 0 1-1.5 1.5H4.5A1.5 1.5 0 0 1 3 20v-9z"/>
          </svg>
          <span class="nav-label">Home</span>
        </button>
        <button type="button" class="nav-tab" (click)="emit(links['profile'])" [disabled]="!links['profile']">
          <span class="nav-dot"></span>
          <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="8.5" r="3.8"/>
            <path d="M4.5 21c0-4.1 3.4-7.5 7.5-7.5s7.5 3.4 7.5 7.5"/>
          </svg>
          <span class="nav-label">Profile</span>
        </button>
      </nav>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --surface-2: #E9E9EB; --line: #DCDCDF;
      --text: #0F1115; --text-muted: #6B6F77;
      --baby-blue: #CFE3F5; --baby-blue-deep: #7DA8CF;
      --ink: #0A0A0B; --success: #2F7A47; --success-hover: #256238; --danger: #C0392B;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
    }
    * { box-sizing: border-box; }
    .beauty-app { display: flex; flex-direction: column; min-height: 100dvh; background: var(--surface); font-family: var(--font-body); color: var(--text); }

    .sub-header { display: flex; align-items: center; height: 56px; padding: 0 12px; background: var(--surface); border-bottom: 1px solid var(--line); flex-shrink: 0; }
    .sub-header-title { flex: 1; text-align: center; font-size: 0.95rem; font-weight: 600; color: var(--text); letter-spacing: 0.2px; }
    .sub-header-spacer { width: 36px; height: 36px; flex-shrink: 0; }
    .back-btn { width: 36px; height: 36px; border-radius: 8px; background: transparent; border: none; color: var(--text); display: grid; place-items: center; cursor: pointer; flex-shrink: 0; }
    .back-btn:hover { background: var(--surface-2); }

    .hero-stripe {
      position: relative;
      height: 180px;
      flex-shrink: 0;
      background:
        repeating-linear-gradient(135deg, rgba(58,58,58,0.10) 0, rgba(58,58,58,0.10) 8px, rgba(58,58,58,0.16) 8px, rgba(58,58,58,0.16) 16px),
        linear-gradient(180deg, #3A3A3A 0%, #2A2A2A 100%);
    }
    .hero-stripe::after {
      content: '';
      position: absolute; inset: 0;
      background: linear-gradient(180deg, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%);
    }
    .hero-tag {
      position: absolute; right: 12px; top: 12px;
      font-family: ui-monospace, 'SF Mono', Menlo, monospace;
      font-size: 9px; color: rgba(255,255,255,0.6);
      background: rgba(0,0,0,0.3); padding: 3px 7px; border-radius: 4px;
      z-index: 1;
    }

    .detail-section { padding: 20px 20px 12px; flex: 1; overflow-y: auto; }
    .title-row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 4px; }
    .title { font-family: var(--font-display); font-size: 1.75rem; font-weight: 500; line-height: 1.15; letter-spacing: 0.2px; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .price { font-family: var(--font-display); font-size: 1.4rem; font-weight: 500; flex-shrink: 0; }
    .meta { font-size: 0.75rem; color: var(--text-muted); margin-bottom: 18px; }

    .section-label { font-size: 0.7rem; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 8px; }

    .day-row {
      display: flex; gap: 5px; margin-bottom: 18px;
      overflow-x: auto; scrollbar-width: none;
      scroll-snap-type: x mandatory;
    }
    .day-row::-webkit-scrollbar { display: none; }
    .day-chip {
      flex: 0 0 calc((100% - 30px) / 7);
      min-width: 44px;
      scroll-snap-align: start;
      height: 52px; border-radius: 9px;
      background: #FFFFFF; color: var(--text); border: 1px solid var(--line);
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px;
      font-family: var(--font-body); cursor: pointer;
      transition: background-color .15s ease, border-color .15s ease, color .15s ease;
    }
    .day-chip:hover { border-color: var(--text); }
    .day-chip.is-selected { background: var(--text); color: #FFFFFF; border-color: var(--text); }
    .day-wd { font-size: 9px; opacity: 0.7; letter-spacing: 1px; }
    .day-num { font-family: var(--font-display); font-size: 17px; font-weight: 500; }

    .time-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 18px; }
    .time-chip {
      height: 38px; border-radius: 10px;
      background: #FFFFFF; color: var(--text);
      border: 1px solid var(--line);
      font-family: var(--font-body); font-size: 13px; font-weight: 500;
      cursor: pointer;
      transition: background-color .15s ease, border-color .15s ease;
    }
    .time-chip:hover { border-color: var(--baby-blue-deep); }
    .time-chip.is-selected {
      background: var(--baby-blue);
      border: 1.5px solid var(--baby-blue-deep);
      color: #1a3a52; font-weight: 600;
    }
    .time-empty { color: var(--text-muted); font-size: 0.8rem; padding: 12px 0; }

    .provider-card {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px;
      background: #FFFFFF; border: 1px solid var(--line); border-radius: 10px;
      margin-bottom: 14px;
    }
    .provider-avatar {
      width: 34px; height: 34px; border-radius: 50%;
      background: linear-gradient(135deg, #BFD8EE, var(--baby-blue-deep));
      display: grid; place-items: center;
      font-size: 13px; font-weight: 700; color: #1a3a52;
      flex-shrink: 0;
    }
    .provider-info { flex: 1; min-width: 0; }
    .provider-name { font-size: 13px; font-weight: 600; color: var(--text); }
    .provider-sub { font-size: 11px; color: var(--text-muted); }
    .provider-change {
      background: none; border: none; padding: 0;
      font-size: 11px; font-weight: 600; color: var(--baby-blue-deep);
      cursor: pointer;
    }
    .provider-change:hover { color: #1a3a52; text-decoration: underline; }

    .server-error {
      background: #FCE8E5; border: 1px solid #F4B5AE; border-radius: 10px;
      padding: 10px 14px; color: #8A2419; font-size: 0.8rem; line-height: 1.4; margin: 0 0 10px;
    }

    .cta-row {
      padding: 10px 20px 14px; background: var(--surface);
      border-top: 1px solid var(--line); flex-shrink: 0;
    }
    .btn-confirm {
      width: 100%; height: 46px; border-radius: 10px; cursor: pointer;
      background: var(--success); color: #FFFFFF; border: 1px solid var(--success);
      font-family: var(--font-body); font-size: 14px; font-weight: 600; letter-spacing: 0.2px;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      box-shadow: 0 2px 8px rgba(47,122,71,0.2);
      transition: background-color .15s ease, border-color .15s ease;
    }
    .btn-confirm:hover:not(:disabled) { background: var(--success-hover); border-color: var(--success-hover); }
    .btn-confirm:disabled { background: #D4D4D7; border-color: #D4D4D7; color: #9A9AA0; box-shadow: none; cursor: not-allowed; }

    .bottom-nav { display: flex; background: #FFFFFF; border-top: 1px solid var(--line); box-shadow: 0 -2px 14px rgba(15,35,60,0.08); flex-shrink: 0; padding-bottom: env(safe-area-inset-bottom); }
    .nav-tab { flex: 1; height: 64px; background: transparent; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; position: relative; color: var(--text); font-family: var(--font-body); }
    .nav-tab:disabled { opacity: 0.4; cursor: not-allowed; }
    .nav-tab.is-active { color: var(--baby-blue-deep); }
    .nav-dot { position: absolute; top: 6px; width: 6px; height: 6px; border-radius: 50%; background: transparent; }
    .nav-tab.is-active .nav-dot { background: var(--baby-blue-deep); }
    .nav-icon { width: 24px; height: 24px; }
    .nav-label { font-size: 0.7rem; font-weight: 500; line-height: 1; letter-spacing: 0.1px; }
    .nav-tab.is-active .nav-label { font-weight: 600; }

    .spinner {
      width: 16px; height: 16px;
      border: 2.5px solid rgba(255,255,255,0.4);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
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

  dayChips: DayChip[] = [];
  selectedDay = '';

  constructor(private authService: BeautyAuthService) {}

  ngOnChanges(_: SimpleChanges): void {
    this.rebuildSlots();
  }

  get form(): BookForm | null {
    return (this.data['form'] as BookForm) || null;
  }

  get slotField(): BookField | null {
    return this.form?.fields.find((f) => f.name === 'slot_at') || null;
  }

  get serviceName(): string {
    const svc = this.data['service'] as { name?: string } | undefined;
    return svc?.name || 'Service';
  }

  get categoryLabel(): string {
    const svc = this.data['service'] as { category?: string } | undefined;
    return svc?.category ? this.toTitle(svc.category) : '';
  }

  get heroSlug(): string {
    const svc = this.data['service'] as { category?: string } | undefined;
    return (svc?.category || 'service').toLowerCase().replace(/\s+/g, '-');
  }

  get priceLabel(): string {
    const svc = this.data['service'] as { price_cents?: number } | undefined;
    if (!svc || svc.price_cents == null) return '';
    return `$${(svc.price_cents / 100).toFixed(0)}`;
  }

  get metaLine(): string {
    const svc = this.data['service'] as { duration_minutes?: number } | undefined;
    const prov = this.data['provider'] as { name?: string; location_label?: string } | undefined;
    const parts: string[] = [];
    if (prov?.name) parts.push(prov.name);
    if (prov?.location_label) parts.push(prov.location_label);
    if (svc?.duration_minutes) parts.push(`${svc.duration_minutes} min`);
    return parts.join(' · ');
  }

  get providerName(): string {
    const p = this.data['provider'] as { name?: string } | undefined;
    return p?.name || '';
  }

  get providerInitial(): string {
    return (this.providerName.trim().charAt(0) || '?').toUpperCase();
  }

  get providerSub(): string {
    const p = this.data['provider'] as { short_description?: string } | undefined;
    return p?.short_description || '';
  }

  get timeChipsForSelectedDay(): TimeChip[] {
    if (!this.selectedDay) return [];
    return this.allTimeChips.filter((c) => this.toLocalDateIso(c.value) === this.selectedDay);
  }

  get allTimeChips(): TimeChip[] {
    const opts = this.slotField?.options || [];
    return opts.map((o) => ({
      value: o.value,
      label: this.formatTimeOnly(o.value) || o.label,
    }));
  }

  get selectedSlot(): string {
    const v = this.values['slot_at'];
    return typeof v === 'string' ? v : '';
  }

  get confirmLabel(): string {
    if (this.isSubmitting) return 'Booking…';
    const base = this.form?.submit_label || 'Confirm booking';
    const slot = this.selectedSlot;
    if (!slot) return base;
    const day = this.dayChips.find((d) => d.iso === this.toLocalDateIso(slot));
    const time = this.formatTimeOnly(slot);
    if (day && time) return `${base} · ${day.weekday[0]}${day.weekday.slice(1).toLowerCase()}, ${time}`;
    return base;
  }

  selectDay(iso: string): void {
    this.selectedDay = iso;
    // Drop any selected time outside this day.
    if (this.toLocalDateIso(this.selectedSlot) !== iso) {
      this.values['slot_at'] = '';
    }
  }

  selectSlot(value: string): void {
    this.values['slot_at'] = value;
    this.selectedDay = this.toLocalDateIso(value);
  }

  canSubmit(): boolean {
    const slot = this.selectedSlot;
    return !!slot && this.allTimeChips.some((c) => c.value === slot);
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
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
      rel: 'submit',
      href: this.form.submit_href,
      method: (this.form.submit_method as BffLink['method']) || 'POST',
      screen: null,
      route: null,
      prompt: null,
    };

    this.authService.follow(submitLink, body).subscribe({
      next: (resp: unknown) => {
        this.isSubmitting = false;
        const bookingId = (resp as { id?: number | string } | null)?.id ?? null;
        const template = this.form?.success_route_template;
        let route: string | null = null;
        if (template && bookingId != null) {
          route = template.replace(':bookingId', String(bookingId));
        }
        const target: BffLink = {
          rel: 'success',
          href: null,
          method: 'NAV',
          screen: this.form?.success_screen || 'beauty_bookings',
          route,
          prompt: null,
        };
        this.followLink.emit(target);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.serverError =
          (err?.error?.detail as string) ||
          'Could not create that booking. Please try again.';
      },
    });
  }

  // ── Slot helpers ──────────────────────────────────────────

  private rebuildSlots(): void {
    // Seed values from BFF defaults (e.g. hidden service_id field).
    const next: Record<string, string | number> = {};
    for (const f of this.form?.fields || []) {
      if (f.value != null) next[f.name] = f.value;
    }
    this.values = next;

    // Build day chips from unique local dates, ordered chronologically.
    const seen = new Set<string>();
    const chips: DayChip[] = [];
    for (const o of this.slotField?.options || []) {
      const iso = this.toLocalDateIso(o.value);
      if (!iso || seen.has(iso)) continue;
      seen.add(iso);
      const d = new Date(o.value);
      chips.push({
        iso,
        weekday: d.toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase(),
        dayNum: d.getDate(),
      });
    }
    this.dayChips = chips;
    this.selectedDay = chips[0]?.iso || '';
  }

  private toLocalDateIso(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private formatTimeOnly(value: string): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(d);
  }

  private toTitle(s: string): string {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }
}
