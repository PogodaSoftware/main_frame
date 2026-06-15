/**
 * AdminPortalProviderDetailComponent — `/admin/portal/crm/provider/:id`
 *
 * Desktop redesign (web) per `web-admin-pages2.jsx` WebAdminDetail (kind=provider).
 * Twin of the customer detail: shared slate chrome + 320px left rail (identity,
 * performance, risk, tags) + a wide right column with section tabs
 * (Overview / Services / Reviews / Hours / Risk / Notes).
 *
 * Real data only — performance, service catalog, review star-buckets, weekly
 * hours, notes all come from the resolver. Real actions: In-app message (gated
 * on an active booking thread) + Add note (shell-wired sendMessage/saveNote),
 * inline tag assign/unassign (RN parity, in-place refetch), Export, Suspend.
 * Dropped: payouts card (resolver returns none), and the design's fabricated
 * SMS/email/force-sign-out + fake counts.
 *
 * @Input/@Output contract + messageResult/noteResult unchanged (shell wiring).
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { BffLink } from '../beauty-bff.types';
import { BeautyAuthService } from '../beauty-auth.service';
import { BeautyBffService } from '../beauty-bff.service';
import { BeautyAdminWebSidebarComponent } from '../admin-web/admin-web-sidebar.component';
import { BeautyAdminWebTopbarComponent } from '../admin-web/admin-web-topbar.component';
import { BeautyAdminWebSessionBarComponent } from '../admin-web/admin-web-session-bar.component';
import { BeautyAdminWebPageHeaderComponent, AdminWebTab } from '../admin-web/admin-web-page-header.component';

interface PerfStat { value: string; label: string; }
interface ServiceItem { id: number; name: string; duration: string; price: string; category: string; }
interface WeekRow { day: string; hours: string; closed?: boolean; }
interface InternalNote { author: string; when: string; text: string; you?: boolean; }
interface ReviewBucket { stars: number; pct: number; }
interface DetailTag { id: string; label: string; color: string; tone: string; }

@Component({
  selector: 'app-admin-portal-provider-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BeautyAdminWebSidebarComponent,
    BeautyAdminWebTopbarComponent,
    BeautyAdminWebSessionBarComponent,
    BeautyAdminWebPageHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="admin-web aw-shell">
      <app-admin-web-sidebar active="crm-providers"
        [adminName]="adminName" [adminEmail]="adminEmail" [badges]="navBadges"
        (follow)="followLink.emit($event)"></app-admin-web-sidebar>

      <div class="aw-col">
        <app-admin-web-topbar [notifCount]="notifCount" [adminName]="adminName" [adminEmail]="adminEmail"
          (follow)="followLink.emit($event)"></app-admin-web-topbar>
        <app-admin-web-session-bar [sessionRemaining]="sessionRemaining"
          (follow)="followLink.emit($event)"></app-admin-web-session-bar>

        <main class="aw-main" role="main" [class.is-stale]="loading">
          <app-admin-web-page-header
            [breadcrumb]="['CRM', 'Providers', businessName]"
            [title]="businessName"
            [sub]="email"
            [tabs]="detailTabs"
            [activeTab]="activeTab"
            (tabSelect)="activeTab = $event">
            <div slot="actions" class="aw-hactions">
              <button type="button" class="aw-btn aw-btn--sec" (click)="onMessage()"
                      [disabled]="!hasActiveBooking" title="{{ hasActiveBooking ? 'Send in-app message' : 'No active booking thread' }}">In-app message</button>
              <button type="button" class="aw-btn aw-btn--sec" (click)="toggleNoteComposer()">Add note</button>
              <button type="button" class="aw-btn aw-btn--sec" (click)="onExport()">Export</button>
              <button type="button" class="aw-btn aw-btn--danger" (click)="onSuspend()">{{ isSuspended ? 'Reinstate' : 'Suspend' }}</button>
            </div>
          </app-admin-web-page-header>

          <div class="aw-body">
            <!-- LEFT RAIL -->
            <div class="aw-rail">
              <div class="aw-card aw-card--pad">
                <div class="aw-id">
                  <span class="aw-avatar" aria-hidden="true">{{ initials }}</span>
                  <div class="aw-id-text">
                    <div class="aw-id-name">{{ businessName }}</div>
                    <div class="mono aw-id-email">{{ email }}</div>
                  </div>
                </div>
                <div class="aw-chips">
                  <span class="aw-schip" [class.is-suspended]="isSuspended">{{ statusLabel }}</span>
                  <span *ngIf="verified" class="aw-schip is-verified">Verified</span>
                  <span *ngFor="let t of attachedTags" class="aw-tchip"
                        [style.background]="t.tone" [style.color]="t.color" [style.borderColor]="t.color + '33'">
                    <span class="aw-tdot" [style.background]="t.color"></span>{{ t.label }}
                  </span>
                </div>
                <div class="aw-meta">
                  <div><div class="aw-eyebrow">Phone</div><div class="mono v">{{ phone }}</div></div>
                  <div><div class="aw-eyebrow">Provider ID</div><div class="mono v">prov_{{ accountIdHex }}</div></div>
                  <div><div class="aw-eyebrow">Joined</div><div class="mono v">{{ joinedLabel }}</div></div>
                  <div><div class="aw-eyebrow">Last seen</div><div class="mono v">{{ lastSeenLabel }}</div></div>
                </div>
              </div>

              <div class="aw-card aw-card--pad">
                <div class="aw-eyebrow mb">Performance</div>
                <div class="aw-stats">
                  <div *ngFor="let s of performance" class="aw-stat">
                    <div class="aw-stat-v">{{ s.value }}</div>
                    <div class="aw-stat-l">{{ s.label }}</div>
                  </div>
                </div>
              </div>

              <div class="aw-card aw-card--pad">
                <div class="aw-eyebrow mb">Risk signals</div>
                <div class="aw-risk-head">
                  <div class="aw-risk-num">{{ riskScore }}<span class="aw-risk-denom">/100</span></div>
                  <span class="aw-risk-chip" [style.background]="riskColor + '1A'" [style.color]="riskColor">{{ riskLabel }}</span>
                </div>
                <div class="aw-risk-bar"><div class="aw-risk-fill" [style.width.%]="riskScore" [style.background]="riskColor"></div></div>
                <div class="aw-risk-axis mono"><span>0</span><span>30</span><span>70</span><span>100</span></div>
              </div>

              <div class="aw-card aw-card--pad">
                <div class="aw-eyebrow mb">Tags · admin-only</div>
                <div class="aw-tags">
                  <button type="button" *ngFor="let t of attachedTags" class="aw-tchip is-btn"
                          [style.background]="t.tone" [style.color]="t.color" [style.borderColor]="t.color + '33'"
                          (click)="onUnassignTag(t.id)" [attr.aria-label]="'Remove tag ' + t.label">
                    <span class="aw-tdot" [style.background]="t.color"></span>{{ t.label }}<span class="aw-x">×</span>
                  </button>
                  <span *ngIf="!attachedTags.length" class="aw-muted">No tags attached.</span>
                </div>
                <div class="aw-eyebrow mb mt">Suggested</div>
                <div class="aw-tags">
                  <button type="button" *ngFor="let t of suggestedTags" class="aw-tsug"
                          (click)="onAssignTag(t.id)" [attr.aria-label]="'Attach tag ' + t.label">
                    <span class="aw-tdot" [style.background]="t.color"></span>{{ t.label }}<span class="aw-plus mono">+</span>
                  </button>
                  <button type="button" class="aw-tsug aw-tpick-toggle" (click)="toggleTagPicker()"
                          [attr.aria-expanded]="tagPickerOpen" aria-label="Add any tag">
                    <span class="aw-plus mono">+</span> Add tag
                  </button>
                  <a class="aw-link" (click)="onManageTags($event)" href="#">Manage tags →</a>
                </div>

                <!-- Full tag picker: attach ANY existing tag, not just the suggested few. -->
                <div class="aw-tpicker" *ngIf="tagPickerOpen">
                  <input class="aw-tpick-search" type="text" [(ngModel)]="tagFilter"
                         placeholder="Find a tag…" aria-label="Filter tags" autocomplete="off" />
                  <div class="aw-tpick-list">
                    <button type="button" *ngFor="let t of filteredAvailableTags" class="aw-tpick-item"
                            (click)="onAssignTag(t.id)" [attr.aria-label]="'Attach tag ' + t.label">
                      <span class="aw-tdot" [style.background]="t.color"></span>{{ t.label }}
                    </button>
                    <div *ngIf="!filteredAvailableTags.length" class="aw-muted aw-tpick-empty">
                      {{ availableTags.length ? 'No tags match.' : 'All tags attached.' }}
                      <a class="aw-link" (click)="onManageTags($event)" href="#">Manage tags →</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- RIGHT COLUMN -->
            <div class="aw-rightcol">
              <div class="aw-card aw-card--pad aw-composer" *ngIf="messageOpen">
                <div class="aw-eyebrow mb">Send in-app message</div>
                <textarea rows="3" class="aw-ta" [(ngModel)]="messageBody" name="msg"
                          placeholder="Message to {{ businessName }}…" aria-label="Message body"></textarea>
                <div class="aw-composer-actions">
                  <span class="aw-hint" *ngIf="!hasActiveBooking">No active booking thread — message cannot be delivered.</span>
                  <span class="aw-hint err" *ngIf="messageError" role="alert">{{ messageError }}</span>
                  <span class="aw-hint ok" *ngIf="messageSent" role="status">Sent.</span>
                  <span class="grow"></span>
                  <button type="button" class="aw-btn aw-btn--sec" (click)="messageOpen = false">Cancel</button>
                  <button type="button" class="aw-btn aw-btn--pri" (click)="onSendMessage()" [disabled]="!messageBody.trim() || !hasActiveBooking">Send</button>
                </div>
              </div>

              <div class="aw-card aw-card--pad aw-composer" *ngIf="noteOpen">
                <div class="aw-eyebrow mb">Add internal note</div>
                <textarea rows="3" class="aw-ta" [(ngModel)]="noteBody" name="note"
                          placeholder="Private note (admin-only)…" aria-label="Note body"></textarea>
                <div class="aw-composer-actions">
                  <span class="aw-hint err" *ngIf="noteError" role="alert">{{ noteError }}</span>
                  <span class="aw-hint ok" *ngIf="noteSaved" role="status">Saved.</span>
                  <span class="grow"></span>
                  <button type="button" class="aw-btn aw-btn--sec" (click)="noteOpen = false">Cancel</button>
                  <button type="button" class="aw-btn aw-btn--pri" (click)="onSaveNote()" [disabled]="!noteBody.trim()">Save note</button>
                </div>
              </div>

              <div class="aw-card aw-card--pad aw-export" *ngIf="exportNotice" role="status">{{ exportNotice }}</div>

              <!-- Overview: services preview + hours + reviews summary -->
              <ng-container *ngIf="activeTab === 'overview'">
                <div class="aw-two">
                  <div class="aw-card">
                    <div class="aw-cardhead"><h3 class="aw-h3">Services</h3><span class="aw-muted mono">{{ services.length }}</span></div>
                    <table class="aw-table" *ngIf="services.length">
                      <tbody>
                        <tr *ngFor="let s of services.slice(0, 6)" class="aw-srow">
                          <td class="c-svc">{{ s.name }}</td>
                          <td class="mono muted">{{ s.duration }}</td>
                          <td class="c-price mono">{{ s.price }}</td>
                        </tr>
                      </tbody>
                    </table>
                    <div class="aw-empty" *ngIf="!services.length">No services listed.</div>
                  </div>
                  <div class="aw-card aw-card--pad">
                    <h3 class="aw-h3 mb">Reviews</h3>
                    <div class="aw-rev-head">
                      <div class="aw-rev-avg">{{ avgRating }}<span class="aw-rev-star">★</span></div>
                      <span class="aw-muted">{{ reviewsCount }} review{{ reviewsCount === 1 ? '' : 's' }}</span>
                    </div>
                    <div class="aw-empty" *ngIf="!reviewBuckets.length">No reviews yet.</div>
                    <div class="aw-rev-bar" *ngFor="let r of reviewBuckets">
                      <span class="mono aw-rev-stars">{{ r.stars }}★</span>
                      <span class="aw-rev-track"><span class="aw-rev-fill" [style.width.%]="r.pct"></span></span>
                      <span class="mono aw-rev-pct">{{ r.pct }}%</span>
                    </div>
                  </div>
                </div>
                <div class="aw-card aw-card--pad">
                  <h3 class="aw-h3 mb">Weekly hours</h3>
                  <div class="aw-empty" *ngIf="!weeklyHours.length">No hours set.</div>
                  <div class="aw-hours">
                    <div *ngFor="let w of weeklyHours" class="aw-hour" [class.closed]="w.closed">
                      <span class="aw-hour-day">{{ w.day }}</span><span class="mono aw-hour-val">{{ w.hours }}</span>
                    </div>
                  </div>
                </div>
              </ng-container>

              <!-- Services tab -->
              <div class="aw-card" *ngIf="activeTab === 'services'">
                <div class="aw-cardhead"><h3 class="aw-h3">Service catalog</h3><span class="aw-muted mono">{{ services.length }}</span></div>
                <table class="aw-table" *ngIf="services.length">
                  <thead><tr><th>Service</th><th>Category</th><th class="c-dur">Duration</th><th class="c-price">Price</th></tr></thead>
                  <tbody>
                    <tr *ngFor="let s of services" class="aw-srow">
                      <td class="c-svc">{{ s.name }}</td>
                      <td class="muted">{{ s.category || '—' }}</td>
                      <td class="c-dur mono muted">{{ s.duration }}</td>
                      <td class="c-price mono">{{ s.price }}</td>
                    </tr>
                  </tbody>
                </table>
                <div class="aw-empty" *ngIf="!services.length">No services listed.</div>
              </div>

              <!-- Reviews tab -->
              <div class="aw-card aw-card--pad" *ngIf="activeTab === 'reviews'">
                <h3 class="aw-h3 mb">Reviews</h3>
                <div class="aw-rev-head">
                  <div class="aw-rev-avg">{{ avgRating }}<span class="aw-rev-star">★</span></div>
                  <span class="aw-muted">{{ reviewsCount }} review{{ reviewsCount === 1 ? '' : 's' }}</span>
                </div>
                <div class="aw-empty" *ngIf="!reviewBuckets.length">No reviews yet.</div>
                <div class="aw-rev-bar" *ngFor="let r of reviewBuckets">
                  <span class="mono aw-rev-stars">{{ r.stars }}★</span>
                  <span class="aw-rev-track"><span class="aw-rev-fill" [style.width.%]="r.pct"></span></span>
                  <span class="mono aw-rev-pct">{{ r.pct }}%</span>
                </div>
              </div>

              <!-- Hours tab -->
              <div class="aw-card aw-card--pad" *ngIf="activeTab === 'hours'">
                <h3 class="aw-h3 mb">Weekly hours</h3>
                <div class="aw-empty" *ngIf="!weeklyHours.length">No hours set.</div>
                <div class="aw-hours">
                  <div *ngFor="let w of weeklyHours" class="aw-hour" [class.closed]="w.closed">
                    <span class="aw-hour-day">{{ w.day }}</span><span class="mono aw-hour-val">{{ w.hours }}</span>
                  </div>
                </div>
              </div>

              <!-- Risk tab -->
              <div class="aw-card aw-card--pad" *ngIf="activeTab === 'risk'">
                <h3 class="aw-h3 mb">Risk signals</h3>
                <div class="aw-risk-head">
                  <div class="aw-risk-num" style="font-size:2rem">{{ riskScore }}<span class="aw-risk-denom">/100</span></div>
                  <span class="aw-risk-chip" [style.background]="riskColor + '1A'" [style.color]="riskColor">{{ riskLabel }}</span>
                </div>
                <div class="aw-risk-bar"><div class="aw-risk-fill" [style.width.%]="riskScore" [style.background]="riskColor"></div></div>
                <div class="aw-risk-axis mono"><span>0</span><span>30</span><span>70</span><span>100</span></div>
                <div class="aw-muted" style="margin-top:12px">Heuristic score from account state (suspension + dispute history).</div>
              </div>

              <!-- Notes (overview + notes tab) -->
              <div class="aw-card aw-card--pad" *ngIf="activeTab === 'overview' || activeTab === 'notes'">
                <h3 class="aw-h3 mb">Internal notes</h3>
                <div class="aw-empty" *ngIf="!internalNotes.length">No internal notes yet.</div>
                <div *ngFor="let n of internalNotes" class="aw-note" [class.is-you]="n.you">
                  <div class="aw-note-head"><span class="aw-note-author">{{ n.author }}</span><span class="mono aw-note-when">{{ n.when }}</span></div>
                  <div class="aw-note-text">{{ n.text }}</div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --line: #DCDCDF; --text: #0F1115; --text-muted: #6B6F77;
      --surface: #F2F2F2; --surface-2: #E9E9EB; --danger: #C0392B; --admin-red: #B23A2D;
      --ok: #2F7A47; --slate: #0E1620; --info: #7DA8CF;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh;
    }
    * { box-sizing: border-box; }
    .mono { font-family: var(--font-mono); }
    .grow { flex: 1; }
    .mb { margin-bottom: 10px; } .mt { margin-top: 14px; }
    .muted, .aw-muted { color: var(--text-muted); }
    .aw-muted { font-size: 0.75rem; }

    .aw-shell { display: flex; width: 100%; height: 100dvh; background: var(--surface); font-family: var(--font-body); color: var(--text); overflow: hidden; }
    .aw-col { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .aw-main { flex: 1; overflow: auto; background: var(--surface); transition: opacity 120ms ease; }
    .aw-main.is-stale { opacity: 0.6; }
    .aw-body { padding: 20px 28px 32px; display: grid; grid-template-columns: 320px 1fr; gap: 16px; align-items: start; }

    .aw-hactions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .aw-btn { height: 38px; padding: 0 14px; border-radius: 10px; font-family: var(--font-body); font-size: 0.8125rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; line-height: 1; border: 1px solid transparent; }
    .aw-btn--sec { background: #fff; color: var(--text); border-color: var(--line); }
    .aw-btn--pri { background: #0F1115; color: #fff; border-color: #0F1115; }
    .aw-btn--danger { background: var(--admin-red); color: #fff; border-color: var(--admin-red); }
    .aw-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .aw-card { background: #fff; border: 1px solid var(--line); border-radius: 14px; }
    .aw-card--pad { padding: 18px; }
    .aw-rail { display: flex; flex-direction: column; gap: 12px; }
    .aw-rightcol { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
    .aw-eyebrow { font-size: 0.625rem; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-muted); }
    .aw-h3 { margin: 0; font-family: var(--font-display); font-size: 1.25rem; font-weight: 500; color: var(--text); line-height: 1.1; }

    .aw-id { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
    .aw-avatar { width: 56px; height: 56px; border-radius: 14px; background: #2A3441; color: #fff; display: grid; place-items: center; font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; flex-shrink: 0; }
    .aw-id-text { min-width: 0; }
    .aw-id-name { font-family: var(--font-display); font-size: 1.375rem; font-weight: 500; line-height: 1.1; }
    .aw-id-email { font-size: 0.6875rem; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; }
    .aw-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
    .aw-schip { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 0.625rem; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; background: #E5F3EA; color: var(--ok); }
    .aw-schip.is-suspended { background: #FCE8E5; color: var(--danger); }
    .aw-schip.is-verified { background: #E6F0FA; color: #2c6a9e; }
    .aw-tchip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; border: 1px solid; font-size: 0.625rem; font-weight: 600; line-height: 1.2; }
    .aw-tdot { width: 6px; height: 6px; border-radius: 50%; }
    .aw-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .aw-meta .v { font-size: 0.75rem; color: var(--text); margin-top: 3px; }
    .aw-meta .aw-eyebrow { font-size: 0.5625rem; }

    .aw-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .aw-stat-v { font-family: var(--font-display); font-size: 1.375rem; font-weight: 500; line-height: 1; }
    .aw-stat-l { font-size: 0.625rem; color: var(--text-muted); margin-top: 3px; }

    .aw-risk-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
    .aw-risk-num { font-family: var(--font-display); font-size: 1.5rem; line-height: 1; }
    .aw-risk-denom { color: var(--text-muted); font-size: 1rem; }
    .aw-risk-chip { padding: 3px 10px; border-radius: 999px; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.4px; }
    .aw-risk-bar { height: 6px; border-radius: 3px; background: #ECECEE; overflow: hidden; }
    .aw-risk-fill { height: 100%; border-radius: 3px; }
    .aw-risk-axis { display: flex; justify-content: space-between; font-size: 0.5625rem; color: var(--text-muted); margin-top: 4px; }

    .aw-tags { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
    .aw-tchip.is-btn { cursor: pointer; }
    .aw-tchip .aw-x { margin-left: 2px; font-family: var(--font-mono); font-size: 0.625rem; opacity: 0.7; }
    .aw-tsug { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 999px; background: var(--surface); border: 1px solid var(--line); font-family: var(--font-body); font-size: 0.625rem; color: var(--text); cursor: pointer; }
    .aw-tsug .aw-plus { color: var(--text-muted); }
    .aw-tpick-toggle { border-style: dashed; font-weight: 600; }
    .aw-tpicker { margin-top: 10px; border: 1px solid var(--line); border-radius: 10px; background: #fff; padding: 8px; }
    .aw-tpick-search { width: 100%; height: 32px; background: var(--surface); border: 1px solid var(--line); border-radius: 8px; padding: 0 10px; font-family: var(--font-body); font-size: 0.75rem; color: var(--text); outline: none; margin-bottom: 8px; }
    .aw-tpick-search:focus { border-color: var(--text); }
    .aw-tpick-list { display: flex; flex-wrap: wrap; gap: 6px; max-height: 168px; overflow-y: auto; }
    .aw-tpick-item { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 999px; background: #fff; border: 1px solid var(--line); font-family: var(--font-body); font-size: 0.625rem; font-weight: 600; color: var(--text); cursor: pointer; }
    .aw-tpick-item:hover { background: var(--surface); }
    .aw-tpick-empty { padding: 8px 2px; font-size: 0.6875rem; }
    .aw-link { font-size: 0.75rem; color: var(--text); font-weight: 600; cursor: pointer; text-decoration: none; }

    .aw-two { display: grid; grid-template-columns: 1.3fr 1fr; gap: 14px; align-items: start; }
    .aw-cardhead { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--line); }
    .aw-table { width: 100%; border-collapse: collapse; }
    .aw-table thead tr { background: var(--surface); }
    .aw-table th { padding: 9px 12px; font-size: 0.625rem; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted); text-align: left; }
    .aw-table th.c-price { text-align: right; }
    .aw-table td { padding: 11px 12px; font-size: 0.8125rem; vertical-align: middle; border-top: 1px solid var(--surface); }
    .aw-srow:first-child td { border-top: none; }
    .c-svc { font-weight: 600; } .c-price { text-align: right; font-weight: 600; width: 80px; } .c-dur { width: 90px; }

    .aw-rev-head { display: flex; align-items: baseline; gap: 10px; margin-bottom: 12px; }
    .aw-rev-avg { font-family: var(--font-display); font-size: 1.75rem; font-weight: 500; line-height: 1; }
    .aw-rev-star { color: #C9A227; font-size: 1.1rem; margin-left: 2px; }
    .aw-rev-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .aw-rev-stars { font-size: 0.6875rem; color: var(--text-muted); width: 24px; }
    .aw-rev-track { flex: 1; height: 6px; border-radius: 3px; background: #ECECEE; overflow: hidden; }
    .aw-rev-fill { height: 100%; background: #C9A227; border-radius: 3px; }
    .aw-rev-pct { font-size: 0.625rem; color: var(--text-muted); width: 34px; text-align: right; }

    .aw-hours { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .aw-hour { display: flex; justify-content: space-between; font-size: 0.8125rem; padding: 4px 0; border-bottom: 1px solid var(--surface); }
    .aw-hour.closed .aw-hour-val { color: var(--text-muted); }
    .aw-hour-day { font-weight: 600; }
    .aw-hour-val { color: var(--text); }

    .aw-composer .aw-ta { width: 100%; background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; font-family: var(--font-body); font-size: 0.8125rem; color: var(--text); resize: vertical; min-height: 64px; outline: none; }
    .aw-composer .aw-ta:focus { border-color: var(--text); }
    .aw-composer-actions { display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
    .aw-hint { font-size: 0.6875rem; color: var(--text-muted); }
    .aw-hint.err { color: var(--danger); } .aw-hint.ok { color: var(--ok); }
    .aw-export { color: var(--ok); font-size: 0.8125rem; font-weight: 600; }

    .aw-note { background: #FFF8DC; border: 1px solid rgba(165,122,31,0.20); border-radius: 12px; padding: 10px 12px; margin-bottom: 8px; }
    .aw-note.is-you { background: #0F1115; border-color: #0F1115; color: #fff; }
    .aw-note-head { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .aw-note-author { font-size: 0.6875rem; font-weight: 700; }
    .aw-note-when { font-size: 0.5625rem; color: #8A6A1F; }
    .aw-note.is-you .aw-note-when { color: rgba(255,255,255,0.55); }
    .aw-note-text { font-size: 0.75rem; line-height: 1.5; }

    .aw-empty { padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 0.8125rem; }

    :host *:focus-visible { outline: 2px solid var(--admin-red); outline-offset: 2px; border-radius: 6px; }
    @media screen and (max-width: 1100px) { .aw-body { grid-template-columns: 1fr; } .aw-two { grid-template-columns: 1fr; } }
  `],
})
export class AdminPortalProviderDetailComponent {
  private _data: Record<string, unknown> = {};
  @Input() set data(v: Record<string, unknown>) { this._data = v || {}; this.local = null; }
  get data(): Record<string, unknown> { return this._data; }
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();
  @Output() sendMessage = new EventEmitter<string>();
  @Output() saveNote = new EventEmitter<string>();
  @Output() exportAccount = new EventEmitter<void>();

  private local: Record<string, unknown> | null = null;
  private get d(): Record<string, unknown> { return this.local ?? this._data; }

  loading = false;
  activeTab = 'overview';
  messageOpen = false; messageBody = ''; messageError: string | null = null; messageSent = false;
  noteOpen = false; noteBody = ''; noteError: string | null = null; noteSaved = false;
  exportNotice: string | null = null;

  tagPickerOpen = false;
  tagFilter = '';

  constructor(
    private location: Location,
    private auth: BeautyAuthService,
    private bff: BeautyBffService,
    private cdr: ChangeDetectorRef,
  ) {}

  get notifCount(): number | null { return (this.d['notif_count'] as number | null) ?? null; }
  get adminName(): string { return (this.d['first_name'] as string) || 'Maria R.'; }
  get adminEmail(): string { return (this.d['admin_email'] as string) || 'maria@beauty.io'; }
  get sessionRemaining(): string { return (this.d['session_remaining'] as string) ?? '14:32'; }
  get navBadges(): Record<string, number> {
    const badges = (this.d['tab_badges'] as Record<string, number | null>) ?? {};
    const out: Record<string, number> = {};
    if (badges['tickets']) out['tickets'] = badges['tickets'] as number;
    return out;
  }

  get businessName(): string { return (this.d['business_name'] as string) ?? 'Provider'; }
  get initials(): string {
    const parts = this.businessName.split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  get email(): string { return (this.d['email'] as string) ?? ''; }
  get phone(): string { return (this.d['phone'] as string) ?? '—'; }
  get joinedLabel(): string { return (this.d['joined_label'] as string) ?? '—'; }
  get lastSeenLabel(): string { return (this.d['last_seen_label'] as string) ?? '—'; }
  get accountIdHex(): string { return ((this.d['id'] as number) ?? 0).toString(16).padStart(6, '0'); }
  get isSuspended(): boolean { return Boolean(this.d['is_suspended']); }
  get verified(): boolean { return Boolean(this.d['verified']); }
  get statusLabel(): string { return this.isSuspended ? 'Suspended' : 'Active'; }
  get attachedTags(): DetailTag[] { return (this.d['attached_tags'] as DetailTag[]) ?? []; }
  get suggestedTags(): DetailTag[] { return (this.d['suggested_tags'] as DetailTag[]) ?? []; }
  /** Full catalog of unattached tags (resolver `available_tags`) for the picker. */
  get availableTags(): DetailTag[] { return (this.d['available_tags'] as DetailTag[]) ?? []; }
  get filteredAvailableTags(): DetailTag[] {
    const q = this.tagFilter.trim().toLowerCase();
    return q ? this.availableTags.filter((t) => t.label.toLowerCase().includes(q)) : this.availableTags;
  }
  get performance(): PerfStat[] { return (this.d['performance'] as PerfStat[]) ?? []; }
  get services(): ServiceItem[] { return (this.d['services'] as ServiceItem[]) ?? []; }
  get weeklyHours(): WeekRow[] { return (this.d['weekly_hours'] as WeekRow[]) ?? []; }
  get avgRating(): string { return (this.d['avg_rating'] as string) ?? '—'; }
  get reviewsCount(): number { return (this.d['reviews_count'] as number) ?? 0; }
  get reviewBuckets(): ReviewBucket[] { return (this.d['review_buckets'] as ReviewBucket[]) ?? []; }
  get internalNotes(): InternalNote[] { return (this.d['internal_notes'] as InternalNote[]) ?? []; }
  get riskScore(): number { return (this.d['risk_score'] as number) ?? 0; }
  get riskLabel(): string { return (this.d['risk_label'] as string) ?? 'Low'; }
  get riskColor(): string { return this.riskScore < 30 ? '#2F7A47' : this.riskScore < 70 ? '#8A6A1F' : '#C0392B'; }
  get hasActiveBooking(): boolean { return Boolean(this.d['has_active_booking']); }

  get detailTabs(): AdminWebTab[] {
    return [
      { id: 'overview', label: 'Overview' },
      { id: 'services', label: 'Services', count: this.services.length || null },
      { id: 'reviews', label: 'Reviews', count: this.reviewsCount || null },
      { id: 'hours', label: 'Hours' },
      { id: 'risk', label: 'Risk' },
      { id: 'notes', label: 'Notes', count: this.internalNotes.length || null },
    ];
  }

  onMessage(): void { this.messageOpen = !this.messageOpen; this.messageError = null; this.messageSent = false; }
  toggleNoteComposer(): void { this.noteOpen = !this.noteOpen; this.noteError = null; this.noteSaved = false; }
  onSendMessage(): void { const b = this.messageBody.trim(); if (!b || !this.hasActiveBooking) return; this.sendMessage.emit(b); }
  onSaveNote(): void { const b = this.noteBody.trim(); if (!b) return; this.saveNote.emit(b); }
  onExport(): void { this.exportAccount.emit(); }

  messageResult(ok: boolean, err?: string): void {
    if (ok) { this.messageSent = true; this.messageBody = ''; setTimeout(() => { this.messageOpen = false; this.messageSent = false; this.cdr.markForCheck(); }, 1200); }
    else { this.messageError = err ?? 'Failed to send.'; }
    this.cdr.markForCheck();
  }
  noteResult(ok: boolean, err?: string): void {
    if (ok) { this.noteSaved = true; this.noteBody = ''; setTimeout(() => { this.noteOpen = false; this.noteSaved = false; this.cdr.markForCheck(); }, 1000); }
    else { this.noteError = err ?? 'Failed to save.'; }
    this.cdr.markForCheck();
  }

  onBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) { this.location.back(); return; }
    const link = this.links['back']; if (link) this.followLink.emit(link);
  }
  onSuspend(): void { const link = this.links['suspend']; if (link) this.followLink.emit(link); }
  onManageTags(ev?: Event): void { if (ev) ev.preventDefault(); const link = this.links['manage_tags']; if (link) this.followLink.emit(link); }

  toggleTagPicker(): void { this.tagPickerOpen = !this.tagPickerOpen; if (!this.tagPickerOpen) this.tagFilter = ''; }

  onAssignTag(slug: string): void {
    const link = this.links['tag_assign_template'];
    if (!link?.href) return;
    const id = (this.d['id'] as number) ?? 0;
    const call: BffLink = { ...link, href: link.href.replace(':slug', slug) };
    this.tagPickerOpen = false; this.tagFilter = '';
    this.auth.follow(call, { type: 'business', id }, true).subscribe({ next: () => this.refetch(), error: () => this.refetch() });
  }
  onUnassignTag(slug: string): void {
    const link = this.links['tag_unassign_template'];
    if (!link?.href) return;
    const call: BffLink = { ...link, href: link.href.replace(':slug', slug) };
    this.auth.follow(call, undefined, true).subscribe({ next: () => this.refetch(), error: () => this.refetch() });
  }

  private refetch(): void {
    const id = (this.d['id'] as number) ?? 0;
    this.loading = true;
    this.cdr.markForCheck();
    this.bff.resolve('beauty_admin_portal_provider_detail', { id: String(id) }).subscribe({
      next: (resp) => { if (resp && resp.action === 'render' && resp.data) { this.local = resp.data as Record<string, unknown>; } this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }
}
