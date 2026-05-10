/**
 * BeautyBusinessAvailabilityComponent — redesigned per Business Provider Portal handoff (hours-1).
 * Hosts the shared weekly-hours editor inside the provider shell + tab bar.
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
import { BeautyProviderSubHeaderComponent } from './provider/prov-sub-header.component';
import { BeautyProviderTabBarComponent, ProviderTab } from './provider/prov-tab-bar.component';
import { resolveTabLink } from './provider/prov-tab-nav';
import { BeautyProviderButtonComponent } from './provider/prov-btn.component';
import {
  BeautyWeeklyHoursEditorComponent,
  DayRow,
} from './beauty-weekly-hours-editor.component';

@Component({
  selector: 'app-beauty-business-availability',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BeautyProviderSubHeaderComponent,
    BeautyProviderTabBarComponent,
    BeautyProviderButtonComponent,
    BeautyWeeklyHoursEditorComponent,
  ],
  template: `
    <div class="beauty-app prov-shell">
      <app-prov-sub-header back="Dashboard" title="Weekly hours"
                           (backClick)="emit(links['business_home'])">
        <app-prov-btn slot="right" variant="primary" size="sm"
                      (clicked)="save()" [disabled]="isSaving">
          {{ isSaving ? 'Saving…' : 'Save' }}
        </app-prov-btn>
      </app-prov-sub-header>

      <main id="main" class="prov-body">
        <p class="hint">Set when your storefront is open. Customers can only book during these hours.</p>

        <app-beauty-weekly-hours-editor [rows]="rows"></app-beauty-weekly-hours-editor>

        <p *ngIf="message" class="msg" [class.error]="isError"
           [attr.role]="isError ? 'alert' : 'status'" aria-live="polite">{{ message }}</p>
      </main>

      <app-prov-tab-bar active="dashboard" [badges]="tabBadges" (tabClick)="onTab($event)"></app-prov-tab-bar>
    </div>
  `,
  styles: [`
    :host {
      --surface: #F2F2F2; --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --accent-blue: #CFE3F5; --accent-blue-deep: #7DA8CF; --danger: #C0392B;
      --font-body: 'Inter', system-ui, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      display: block;
      background: var(--surface);
    }
    :host *:focus-visible { outline: 2px solid #1a3a52; outline-offset: 2px; border-radius: 6px; }
    .prov-shell {
      display: flex; flex-direction: column;
      min-height: 100vh;
      background: var(--surface); color: var(--text);
      font-family: var(--font-body);
    }
    .prov-body { flex: 1; padding: 14px 16px; overflow-y: auto; }
    .hint {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.5;
      margin: 0 0 12px;
    }

    .msg {
      padding: 12px 0;
      color: var(--accent-blue-deep);
      font-size: 13px;
    }
    .msg.error { color: var(--danger); }

    @media screen and (min-width: 768px) {
      .beauty-app { max-width: 430px; margin: 0 auto; box-shadow: 0 0 40px rgba(15,35,60,0.15); }
    }
  `],
})
export class BeautyBusinessAvailabilityComponent implements OnChanges {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  rows: DayRow[] = [];
  isSaving = false;
  message = '';
  isError = false;

  constructor(private authService: BeautyAuthService) {}

  ngOnChanges(_: SimpleChanges): void {
    const incoming = (this.data['weekly_hours'] as DayRow[]) || [];
    this.rows = incoming.map((r) => ({ ...r, is_24h: !!r.is_24h }));
  }

  get tabBadges(): { bookings?: number; messages?: number } {
    const b = (this.data['badges'] as { messages_unread?: number; bookings_unread?: number }) || {};
    return { bookings: b.bookings_unread || 0, messages: b.messages_unread || 0 };
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  onTab(tab: ProviderTab): void {
    this.emit(resolveTabLink(tab, this.links));
  }

  save(): void {
    if (this.isSaving) return;
    this.isSaving = true;
    this.message = '';
    this.isError = false;

    const submitLink: BffLink = {
      rel: 'submit',
      href: (this.data['submit_href'] as string) || '/api/beauty/protected/business/availability/',
      method: ((this.data['submit_method'] as string) || 'PUT') as BffLink['method'],
      screen: null, route: null, prompt: null,
    };

    this.authService.follow(submitLink, { weekly_hours: this.rows }).subscribe({
      next: () => {
        this.isSaving = false;
        this.message = 'Saved.';
        const self = this.links['self'];
        if (self) this.followLink.emit(self);
      },
      error: (err) => {
        this.isSaving = false;
        this.isError = true;
        this.message = err?.error?.detail || 'Could not save. Please check the times.';
      },
    });
  }
}
