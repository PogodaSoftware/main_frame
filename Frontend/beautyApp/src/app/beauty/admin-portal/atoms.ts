/**
 * Admin Portal — atomic UI primitives.
 *
 * One file for the whole atom set so pages can `import { AdmBtn, AdmCard, ... }`
 * in a single line. Each component is standalone and can be tree-shaken.
 *
 * Tokens come from admin-portal.scss (loaded globally via src/styles.scss).
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

/* ---------------- iOS status bar (slate) ---------------- */
@Component({
  selector: 'adm-status-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bar" [class.on-light]="tone === 'light'">
      <span class="time">9:41</span>
      <div class="icons">
        <svg width="16" height="10" viewBox="0 0 16 10"><rect x="0" y="7" width="2" height="3" rx="0.5"/><rect x="4" y="5" width="2" height="5" rx="0.5"/><rect x="8" y="3" width="2" height="7" rx="0.5"/><rect x="12" y="0" width="2" height="10" rx="0.5"/></svg>
        <svg width="14" height="10" viewBox="0 0 14 10"><path d="M7 9.5a1 1 0 100-2 1 1 0 000 2zM3.2 6.4a5.4 5.4 0 017.6 0l-1 1a4 4 0 00-5.6 0l-1-1zM.7 4a8.8 8.8 0 0112.6 0l-1 1a7.4 7.4 0 00-10.6 0L.7 4z"/></svg>
        <svg width="22" height="10" viewBox="0 0 22 10" fill="none"><rect x="0.5" y="0.5" width="18" height="9" rx="2" stroke="currentColor" opacity="0.5"/><rect x="2" y="2" width="15" height="6" rx="1" fill="currentColor"/><rect x="19.5" y="3.5" width="1.5" height="3" rx="0.5" fill="currentColor" opacity="0.5"/></svg>
      </div>
    </div>
  `,
  styles: [`
    .bar { height: 44px; display: flex; justify-content: space-between; align-items: center; padding: 0 24px 0 28px; font-family: var(--adm-font-body); font-size: 13px; font-weight: 600; color: #fff; flex-shrink: 0; }
    .bar.on-light { color: var(--text); }
    .icons { display: inline-flex; gap: 6px; align-items: center; }
    svg { fill: currentColor; }
  `],
})
export class AdmStatusBarComponent {
  @Input() tone: 'slate' | 'light' = 'slate';
}

/* ---------------- iOS home indicator ---------------- */
@Component({
  selector: 'adm-home-indicator',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="hi" [class.on-light]="tone === 'light'"><span class="bar"></span></div>`,
  styles: [`
    .hi { height: 34px; background: var(--adm-slate); display: grid; place-items: center; flex-shrink: 0; }
    .hi.on-light { background: #fff; }
    .bar { width: 134px; height: 5px; border-radius: 3px; background: #fff; }
    .hi.on-light .bar { background: #0A0A0B; }
  `],
})
export class AdmHomeIndicatorComponent {
  @Input() tone: 'slate' | 'light' = 'slate';
}

/* ---------------- Brand mark ---------------- */
@Component({
  selector: 'adm-brand-mark',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2"/>
      <path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2"/>
    </svg>
  `,
})
export class AdmBrandMarkComponent {
  @Input() size = 20;
}

/* ---------------- Brand row with ADMIN badge ---------------- */
@Component({
  selector: 'adm-brand-row',
  standalone: true,
  imports: [CommonModule, AdmBrandMarkComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="row">
      <adm-brand-mark [size]="size"></adm-brand-mark>
      <span class="word adm-display">Beauty</span>
      <span class="badge">Admin</span>
    </div>
  `,
  styles: [`
    .row { display: inline-flex; align-items: center; gap: 8px; color: #fff; }
    .word { font-size: 22px; line-height: 1; }
    .badge { font-family: var(--adm-font-body); font-size: 9px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: #fff; background: var(--adm-red); padding: 4px 8px; border-radius: 999px; margin-left: 2px; }
  `],
})
export class AdmBrandRowComponent {
  @Input() size = 20;
}

/* ---------------- Top header (slate) ---------------- */
@Component({
  selector: 'adm-top-header',
  standalone: true,
  imports: [CommonModule, AdmBrandRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="hdr">
      <div class="row">
        <adm-brand-row></adm-brand-row>
        <span class="spacer"></span>
        <button class="icon-btn" aria-label="Notifications" type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8ECF1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
            <path d="M10 21a2 2 0 0 0 4 0"/>
          </svg>
          <span class="badge" *ngIf="notifCount">{{ notifCount }}</span>
        </button>
        <div class="avatar" [attr.aria-label]="signedInAs">{{ initials }}</div>
      </div>
    </header>
  `,
  styles: [`
    .hdr { background: var(--adm-slate); color: #fff; padding: 0 14px; border-bottom: 1px solid var(--adm-slate-line); flex-shrink: 0; }
    .row { height: 56px; display: flex; align-items: center; gap: 10px; }
    .spacer { flex: 1; }
    .icon-btn { width: 34px; height: 34px; border-radius: 8px; background: transparent; border: none; cursor: pointer; display: grid; place-items: center; position: relative; color: var(--adm-slate-muted); }
    .badge { position: absolute; top: 4px; right: 4px; min-width: 14px; height: 14px; padding: 0 3px; border-radius: 999px; background: var(--adm-red); color: #fff; font-size: 9px; font-weight: 700; line-height: 14px; text-align: center; border: 1.5px solid var(--adm-slate); font-family: var(--adm-font-body); }
    .avatar { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #C8A57E, #6B4F3A); color: #fff; display: grid; place-items: center; font-size: 11px; font-weight: 700; letter-spacing: 0.4px; border: 1.5px solid var(--adm-slate-3); font-family: var(--adm-font-body); }
  `],
})
export class AdmTopHeaderComponent {
  @Input() signedInAs = 'maria@beauty.io';
  @Input() initials = 'MR';
  @Input() notifCount: number | null = null;
}

/* ---------------- Sub-header (back + title + slot) ---------------- */
@Component({
  selector: 'adm-sub-header',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sh" [class.on-slate]="tone === 'slate'">
      <button class="adm-back" type="button" (click)="backClick.emit()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        {{ back }}
      </button>
      <h1 class="title adm-display">{{ title }}</h1>
      <span class="grow"></span>
      <ng-content></ng-content>
    </header>
  `,
  styles: [`
    .sh { min-height: 56px; padding: 8px 12px; display: flex; align-items: center; gap: 10px; background: var(--surface); color: var(--text); border-bottom: 1px solid var(--line); flex-shrink: 0; }
    .sh.on-slate { background: var(--adm-slate); color: #fff; border-bottom-color: var(--adm-slate-line); }
    .sh .adm-back { color: var(--text-muted); }
    .sh.on-slate .adm-back { color: var(--adm-slate-muted); }
    .title { margin: 0; font-size: 22px; }
    .grow { flex: 1; }
  `],
})
export class AdmSubHeaderComponent {
  @Input() back = 'Back';
  @Input() title = '';
  @Input() tone: 'slate' | 'light' = 'light';
  @Output() backClick = new EventEmitter<void>();
}

/* ---------------- Search bar ---------------- */
@Component({
  selector: 'adm-search-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sb" [class.on-slate]="tone === 'slate'">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>
      </svg>
      <span class="placeholder">{{ placeholder }}</span>
      <span class="kbd adm-mono">⌘K</span>
    </div>
  `,
  styles: [`
    .sb { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid var(--line); border-radius: 10px; height: 36px; padding: 0 10px; color: var(--text-muted); }
    .sb.on-slate { background: var(--adm-slate-2); border-color: var(--adm-slate-line); color: var(--adm-slate-muted); }
    .placeholder { flex: 1; font-family: var(--adm-font-body); font-size: 13px; line-height: 1.2; }
    .kbd { padding: 2px 5px; border-radius: 4px; background: var(--surface-2); }
    .sb.on-slate .kbd { background: rgba(255,255,255,0.06); }
  `],
})
export class AdmSearchBarComponent {
  @Input() placeholder = 'Search name, email, phone, ID, business…';
  @Input() tone: 'slate' | 'light' = 'light';
}

/* ---------------- Tab bar (bottom nav) ---------------- */
type AdmTabKind = 'home' | 'crm' | 'bookings' | 'tickets' | 'team';

@Component({
  selector: 'adm-tab-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="bar" aria-label="Admin primary">
      <button *ngFor="let t of tabs" class="tab" type="button" [class.is-active]="t.kind === active" (click)="select.emit(t.kind)" [attr.aria-label]="t.label">
        <span class="accent" *ngIf="t.kind === active"></span>
        <span class="icon">
          <ng-container [ngSwitch]="t.kind">
            <svg *ngSwitchCase="'home'"     width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2v-9z"/></svg>
            <svg *ngSwitchCase="'crm'"      width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="9.5" r="2.5"/><path d="M14.5 18.5c.4-2.4 2.4-4 5-4 .7 0 1.4.1 2 .3"/></svg>
            <svg *ngSwitchCase="'bookings'" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
            <svg *ngSwitchCase="'tickets'"  width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8z"/><path d="M10 6v12" stroke-dasharray="2 2"/></svg>
            <svg *ngSwitchCase="'team'"     width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="9" r="3"/><circle cx="17" cy="9" r="3"/><path d="M2 19c0-2.8 2.7-5 6-5s6 2.2 6 5M14 19c0-2.4 2-4.5 4.5-5"/></svg>
          </ng-container>
          <span class="badge" *ngIf="badges[t.kind]">{{ badges[t.kind] }}</span>
        </span>
        <span class="label">{{ t.label }}</span>
      </button>
    </nav>
  `,
  styles: [`
    .bar { display: flex; background: var(--adm-slate); box-shadow: 0 -2px 14px rgba(0,0,0,0.4); border-top: 1px solid var(--adm-slate-line); flex-shrink: 0; padding-bottom: env(safe-area-inset-bottom); }
    .tab { flex: 1; height: 64px; background: transparent; border: none; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 0; position: relative; font-family: var(--adm-font-body); color: var(--adm-slate-muted); }
    .tab.is-active { color: #fff; }
    .accent { position: absolute; top: 6px; width: 22px; height: 2px; border-radius: 2px; background: var(--adm-red); }
    .icon { position: relative; color: inherit; }
    .badge { position: absolute; top: -3px; right: -8px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 999px; background: var(--adm-red); color: #fff; font-size: 10px; font-weight: 700; line-height: 16px; text-align: center; border: 1.5px solid var(--adm-slate); }
    .label { font-size: 10.5px; font-weight: 500; letter-spacing: 0.1px; line-height: 1; }
    .tab.is-active .label { font-weight: 600; }
  `],
})
export class AdmTabBarComponent {
  @Input() active: AdmTabKind = 'home';
  @Input() badges: Partial<Record<AdmTabKind, number | string | null>> = {};
  @Output() select = new EventEmitter<AdmTabKind>();
  readonly tabs: { kind: AdmTabKind; label: string }[] = [
    { kind: 'home', label: 'Home' },
    { kind: 'crm', label: 'CRM' },
    { kind: 'bookings', label: 'Bookings' },
    { kind: 'tickets', label: 'Tickets' },
    { kind: 'team', label: 'Team' },
  ];
}

/* ---------------- Button ---------------- */
type AdmBtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerOutline' | 'slate' | 'slatePrimary';

@Component({
  selector: 'adm-btn',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button [type]="type" [disabled]="disabled" [class]="'b v-' + variant + ' s-' + size" [class.is-full]="full" (click)="press.emit($event)">
      <ng-content></ng-content>
    </button>
  `,
  styles: [`
    .b { border-radius: 10px; font-family: var(--adm-font-body); font-weight: 600; letter-spacing: 0.2px; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 6px; white-space: nowrap; line-height: 1; }
    .b:disabled { cursor: not-allowed; opacity: 0.5; }
    .s-sm { height: 32px; padding: 0 12px; font-size: 12px; }
    .s-md { height: 40px; padding: 0 16px; font-size: 13px; }
    .s-lg { height: 48px; padding: 0 20px; font-size: 14px; }
    .is-full { width: 100%; }
    .v-primary       { background: #0F1115; color: #fff; border: 1px solid #0F1115; }
    .v-secondary     { background: #fff; color: #0F1115; border: 1px solid var(--line); }
    .v-ghost         { background: transparent; color: #0F1115; border: 1px solid transparent; }
    .v-danger        { background: var(--adm-red); color: #fff; border: 1px solid var(--adm-red); }
    .v-dangerOutline { background: #fff; color: var(--adm-red); border: 1px solid rgba(178,58,45,0.33); }
    .v-slate         { background: var(--adm-slate-2); color: #fff; border: 1px solid var(--adm-slate-line); }
    .v-slatePrimary  { background: #fff; color: var(--adm-slate); border: 1px solid #fff; }
  `],
})
export class AdmBtnComponent {
  @Input() variant: AdmBtnVariant = 'primary';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() full = false;
  @Input() disabled = false;
  @Input() type: 'button' | 'submit' = 'button';
  @Output() press = new EventEmitter<MouseEvent>();
}

/* ---------------- Card ---------------- */
@Component({
  selector: 'adm-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="c" [style.padding.px]="padding"><ng-content></ng-content></div>`,
  styles: [`.c { background: #fff; border: 1px solid var(--line); border-radius: 14px; }`],
})
export class AdmCardComponent {
  @Input() padding = 14;
}

/* ---------------- Status chip ---------------- */
type AdmStatus = 'Active' | 'Suspended' | 'Pending' | 'Deleted' | 'Flagged' | 'Verified' | 'VIP' | 'AtRisk';
const STATUS_PALETTE: Record<AdmStatus, { bg: string; fg: string; label?: string }> = {
  Active:    { bg: '#E5F3EA', fg: '#2F7A47' },
  Suspended: { bg: '#FCE8E5', fg: '#C0392B' },
  Pending:   { bg: '#FFF4DA', fg: '#8A6A1F' },
  Deleted:   { bg: '#E9E9EB', fg: '#6B6F77' },
  Flagged:   { bg: '#FFF4DA', fg: '#8A6A1F' },
  Verified:  { bg: '#E5F3EA', fg: '#2F7A47' },
  VIP:       { bg: '#F1E8DA', fg: '#7A5A1F' },
  AtRisk:    { bg: '#FCE8E5', fg: '#C0392B', label: 'At risk' },
};

@Component({
  selector: 'adm-status-chip',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="chip" [style.background]="palette.bg" [style.color]="palette.fg">{{ palette.label ?? status }}</span>`,
  styles: [`.chip { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 999px; font-family: var(--adm-font-body); font-size: 10px; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; line-height: 1; }`],
})
export class AdmStatusChipComponent {
  @Input() status: AdmStatus = 'Active';
  get palette() { return STATUS_PALETTE[this.status] ?? STATUS_PALETTE.Active; }
}

/* ---------------- Avatar with initials ---------------- */
@Component({
  selector: 'adm-avatar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="av" [style.width.px]="size" [style.height.px]="size" [style.fontSize.px]="size * 0.32" [style.background]="grad">{{ initials }}</div>`,
  styles: [`.av { border-radius: 50%; color: #fff; display: grid; place-items: center; font-weight: 700; letter-spacing: 0.4px; border: 2px solid #fff; box-shadow: 0 0 0 1px var(--line); font-family: var(--adm-font-body); flex-shrink: 0; }`],
})
export class AdmAvatarComponent {
  @Input() initials = 'AB';
  @Input() size = 36;
  @Input() kind: 'customer' | 'provider' = 'customer';
  get grad() {
    return this.kind === 'provider'
      ? 'linear-gradient(135deg, #CFE3F5, #7DA8CF)'
      : 'linear-gradient(135deg, #C8A57E, #6B4F3A)';
  }
}

/* ---------------- Filter chip (pill + underline) ---------------- */
@Component({
  selector: 'adm-filter-chip',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" class="chip" [class.is-active]="active" [class.is-underline]="style === 'underline'" (click)="press.emit()">
      <ng-content></ng-content>
      <span class="count adm-mono" *ngIf="count !== null && count !== undefined">{{ count }}</span>
      <span class="underline" *ngIf="style === 'underline' && active"></span>
    </button>
  `,
  styles: [`
    .chip { background: #fff; color: #0F1115; border: 1px solid var(--line); border-radius: 999px; height: 30px; padding: 0 12px; font-family: var(--adm-font-body); font-size: 12px; font-weight: 600; letter-spacing: 0.1px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; line-height: 1; }
    .chip.is-active { background: #0F1115; color: #fff; border-color: #0F1115; }
    .count { font-size: 10px; font-weight: 600; color: var(--text-muted); background: var(--surface); padding: 1px 5px; border-radius: 999px; line-height: 1.2; }
    .chip.is-active .count { color: #fff; background: rgba(255,255,255,0.18); }
    .chip.is-underline { background: transparent; border: none; padding: 8px 4px; height: auto; color: var(--text-muted); font-weight: 500; position: relative; border-radius: 0; }
    .chip.is-underline.is-active { color: var(--text); font-weight: 700; }
    .chip.is-underline .count { font-size: 10px; background: transparent; border: 1px solid var(--line); padding: 1px 5px; }
    .chip.is-underline.is-active .count { background: var(--surface-2); border: none; }
    .underline { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: #0F1115; border-radius: 1px; }
  `],
})
export class AdmFilterChipComponent {
  @Input() active = false;
  @Input() count: number | string | null = null;
  @Input() style: 'pill' | 'underline' = 'pill';
  @Output() press = new EventEmitter<void>();
}

/* ---------------- Section title ---------------- */
@Component({
  selector: 'adm-section-title',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="st">
      <div class="text">
        <h2 class="title adm-display"><ng-content></ng-content></h2>
        <div class="sub" *ngIf="sub">{{ sub }}</div>
      </div>
      <ng-content select="[slot=action]"></ng-content>
    </div>
  `,
  styles: [`
    .st { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 10px; gap: 10px; }
    .title { margin: 0; font-size: 20px; color: var(--text); }
    .sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
  `],
})
export class AdmSectionTitleComponent {
  @Input() sub = '';
}

/* ---------------- Empty state ---------------- */
@Component({
  selector: 'adm-empty',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="e">
      <div class="icon" *ngIf="icon"><ng-content select="[slot=icon]"></ng-content></div>
      <div class="title adm-display">{{ title }}</div>
      <div class="body">{{ body }}</div>
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .e { padding: 32px 16px; text-align: center; }
    .icon { margin-bottom: 10px; opacity: 0.45; }
    .title { font-size: 20px; color: var(--text); margin-bottom: 6px; }
    .body { font-size: 12px; color: var(--text-muted); margin: 0 auto 14px; max-width: 260px; line-height: 1.5; }
  `],
})
export class AdmEmptyComponent {
  @Input() icon = false;
  @Input() title = '';
  @Input() body = '';
}
