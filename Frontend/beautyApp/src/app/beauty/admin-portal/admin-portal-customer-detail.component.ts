/**
 * AdminPortalCustomerDetailComponent — `/admin/portal/crm/customer/:id`
 *
 * Desktop redesign (web) per `web-admin-pages2.jsx` WebAdminDetail (kind=customer):
 * shared slate chrome + page header (actions) + a 320px left rail (identity,
 * lifetime, risk, tags) and a wide right column (bookings table, activity
 * timeline, support tickets, internal notes + inline composers).
 *
 * Mirrors RN `crm/customer/[id].tsx` for behavior. Real actions only:
 *   - In-app message (gated on an active booking thread), Add note → real POSTs
 *     (shell-wired via sendMessage/saveNote, with messageResult/noteResult feedback).
 *   - Inline tag assign/unassign (suggested → attach, attached × → remove) →
 *     real POST/DELETE + in-place refetch (RN parity; the old mobile screen only
 *     deep-linked the tag manager — this restores RN's inline tagging).
 *   - Export, Suspend/Reinstate → real HATEOAS links.
 * Dropped vs the design: fabricated tab strip + fake counts, Send SMS / Send
 * email / Force sign-out (no endpoints), and the payment-methods card when the
 * resolver supplies none.
 *
 * @Input/@Output contract + messageResult/noteResult are unchanged (shell wiring).
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

interface LifetimeStat { value: string; label: string; }
interface BookingRow { id: number; mon: string; day: number; weekday: string; service: string; with_name: string; price: string; status: 'Confirmed' | 'Cancelled' | 'Pending' | string; }
interface TimelineEvent { when: string; color: string; title: string; meta: string; }
interface SupportTicket { id: string; subject: string; category: string; status: string; when: string; }
interface InternalNote { author: string; when: string; text: string; you?: boolean; }
interface DetailTag { id: string; label: string; color: string; tone: string; }

@Component({
  selector: 'app-admin-portal-customer-detail',
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
      <app-admin-web-sidebar active="crm-customers"
        [adminName]="adminName" [adminEmail]="adminEmail" [badges]="navBadges"
        (follow)="followLink.emit($event)"></app-admin-web-sidebar>

      <div class="aw-col">
        <app-admin-web-topbar [notifCount]="notifCount" [adminName]="adminName" [adminEmail]="adminEmail"
          (follow)="followLink.emit($event)"></app-admin-web-topbar>
        <app-admin-web-session-bar [sessionRemaining]="sessionRemaining"
          (follow)="followLink.emit($event)"></app-admin-web-session-bar>

        <main class="aw-main" role="main" [class.is-stale]="loading">
          <app-admin-web-page-header
            [breadcrumb]="['CRM', 'Customers', displayName]"
            [title]="displayName"
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
                    <div class="aw-id-name">{{ displayName }}</div>
                    <div class="mono aw-id-email">{{ email }}</div>
                  </div>
                </div>
                <div class="aw-chips">
                  <span class="aw-schip" [class.is-suspended]="isSuspended">{{ statusLabel }}</span>
                  <span *ngFor="let t of attachedTags" class="aw-tchip"
                        [style.background]="t.tone" [style.color]="t.color" [style.borderColor]="t.color + '33'">
                    <span class="aw-tdot" [style.background]="t.color"></span>{{ t.label }}
                  </span>
                </div>
                <div class="aw-meta">
                  <div><div class="aw-eyebrow">Phone</div><div class="mono v">{{ phone }}</div></div>
                  <div><div class="aw-eyebrow">Account ID</div><div class="mono v">cust_{{ accountIdHex }}</div></div>
                  <div><div class="aw-eyebrow">Joined</div><div class="mono v">{{ joinedLabel }}</div></div>
                  <div><div class="aw-eyebrow">Last seen</div><div class="mono v">{{ lastSeenLabel }}</div></div>
                </div>
              </div>

              <div class="aw-card aw-card--pad">
                <div class="aw-eyebrow mb">Lifetime</div>
                <div class="aw-stats">
                  <div *ngFor="let s of lifetimeStats" class="aw-stat">
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
              <!-- Inline composers -->
              <div class="aw-card aw-card--pad aw-composer" *ngIf="messageOpen">
                <div class="aw-eyebrow mb">Send in-app message</div>
                <textarea rows="3" class="aw-ta" [(ngModel)]="messageBody" name="msg"
                          placeholder="Message to {{ displayName }}…" aria-label="Message body"></textarea>
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

              <div class="aw-two" *ngIf="activeTab === 'overview'">
                <!-- Recent bookings -->
                <div class="aw-card">
                  <div class="aw-cardhead">
                    <h3 class="aw-h3">Recent bookings</h3>
                    <span class="aw-muted mono">{{ bookings.length }} of {{ totalBookings }}</span>
                  </div>
                  <table class="aw-table" *ngIf="bookings.length">
                    <tbody>
                      <tr *ngFor="let b of bookings" class="aw-brow" role="link" tabindex="0"
                          (click)="openBooking(b)" (keydown.enter)="openBooking(b)"
                          [attr.aria-label]="'Open booking ' + b.service">
                        <td class="c-date mono"><span class="bk-mon">{{ b.mon }}</span> {{ b.day }}</td>
                        <td class="c-svc"><div class="bk-svc">{{ b.service }}</div><div class="mono bk-with">{{ b.with_name }}</div></td>
                        <td class="c-status"><span class="aw-schip" [class.is-cancel]="b.status === 'Cancelled'">{{ b.status }}</span></td>
                        <td class="c-price mono">{{ b.price }}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div class="aw-empty" *ngIf="!bookings.length">No bookings yet.</div>
                </div>

                <!-- Activity timeline -->
                <div class="aw-card aw-card--pad">
                  <h3 class="aw-h3 mb">Activity timeline</h3>
                  <div class="aw-empty" *ngIf="!timeline.length">No recent activity.</div>
                  <div class="aw-tl">
                    <div *ngFor="let e of timeline; let last = last" class="aw-tlrow" [class.last]="last">
                      <span class="aw-tldot" [style.background]="e.color"></span>
                      <div class="aw-tlbody">
                        <div class="aw-tltitle" [innerHTML]="e.title"></div>
                        <div class="mono aw-tlmeta">{{ e.when }} · {{ e.meta }}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Bookings tab: full recent list -->
              <div class="aw-card" *ngIf="activeTab === 'bookings'">
                <div class="aw-cardhead">
                  <h3 class="aw-h3">Bookings</h3>
                  <span class="aw-muted mono">{{ bookings.length }} of {{ totalBookings }} · most recent</span>
                </div>
                <table class="aw-table" *ngIf="bookings.length">
                  <tbody>
                    <tr *ngFor="let b of bookings" class="aw-brow" role="link" tabindex="0"
                        (click)="openBooking(b)" (keydown.enter)="openBooking(b)"
                        [attr.aria-label]="'Open booking ' + b.service">
                      <td class="c-date mono"><span class="bk-mon">{{ b.mon }}</span> {{ b.day }}</td>
                      <td class="c-svc"><div class="bk-svc">{{ b.service }}</div><div class="mono bk-with">{{ b.with_name }}</div></td>
                      <td class="c-status"><span class="aw-schip" [class.is-cancel]="b.status === 'Cancelled'">{{ b.status }}</span></td>
                      <td class="c-price mono">{{ b.price }}</td>
                    </tr>
                  </tbody>
                </table>
                <div class="aw-empty" *ngIf="!bookings.length">No bookings yet.</div>
              </div>

              <!-- Payments tab -->
              <div class="aw-card aw-card--pad" *ngIf="activeTab === 'payments'">
                <h3 class="aw-h3 mb">Payment methods</h3>
                <div class="aw-empty">No cards on file. (Beauty charges per-booking via Stripe Checkout — no stored cards.)</div>
              </div>

              <!-- Reviews tab -->
              <div class="aw-card aw-card--pad" *ngIf="activeTab === 'reviews'">
                <h3 class="aw-h3 mb">Reviews</h3>
                <div class="aw-empty">No reviews surfaced for this account.</div>
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
                <div class="aw-muted" style="margin-top:12px">Heuristic score from account state (suspension + chargeback history). Updated on each load.</div>
              </div>

              <!-- Audit tab: this account's audit trail -->
              <div class="aw-card aw-card--pad" *ngIf="activeTab === 'audit'">
                <h3 class="aw-h3 mb">Audit trail</h3>
                <div class="aw-empty" *ngIf="!timeline.length">No audit events.</div>
                <div class="aw-tl">
                  <div *ngFor="let e of timeline; let last = last" class="aw-tlrow" [class.last]="last">
                    <span class="aw-tldot" [style.background]="e.color"></span>
                    <div class="aw-tlbody">
                      <div class="aw-tltitle" [innerHTML]="e.title"></div>
                      <div class="mono aw-tlmeta">{{ e.when }} · {{ e.meta }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Support tickets -->
              <div class="aw-card" *ngIf="activeTab === 'overview'">
                <div class="aw-cardhead">
                  <h3 class="aw-h3">Support tickets</h3>
                  <a class="aw-link" (click)="onTickets($event)" href="#">{{ ticketsOpenCount }} open →</a>
                </div>
                <table class="aw-table" *ngIf="ticketRows.length">
                  <tbody>
                    <tr *ngFor="let t of ticketRows" class="aw-brow">
                      <td class="c-svc"><div class="bk-svc">{{ t.subject }}</div><div class="mono bk-with">{{ t.id }} · {{ t.category }} · {{ t.when }}</div></td>
                      <td class="c-status"><span class="aw-schip" [class.is-cancel]="t.status !== 'Resolved'">{{ t.status }}</span></td>
                    </tr>
                  </tbody>
                </table>
                <div class="aw-empty" *ngIf="!ticketRows.length">No support tickets.</div>
              </div>

              <!-- Internal notes -->
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
      --ok: #2F7A47; --slate: #0E1620;
      --font-body: 'Inter', system-ui, -apple-system, sans-serif;
      --font-display: 'Cormorant Garamond', Georgia, serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, monospace;
      display: block; min-height: 100dvh;
    }
    * { box-sizing: border-box; }
    .mono { font-family: var(--font-mono); }
    .grow { flex: 1; }
    .mb { margin-bottom: 10px; } .mt { margin-top: 14px; }
    .aw-muted { color: var(--text-muted); font-size: 0.75rem; }

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

    /* identity */
    .aw-id { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
    .aw-avatar { width: 56px; height: 56px; border-radius: 14px; background: var(--slate); color: #fff; display: grid; place-items: center; font-family: var(--font-display); font-size: 1.25rem; font-weight: 600; flex-shrink: 0; }
    .aw-id-text { min-width: 0; }
    .aw-id-name { font-family: var(--font-display); font-size: 1.375rem; font-weight: 500; line-height: 1.1; }
    .aw-id-email { font-size: 0.6875rem; color: var(--text-muted); margin-top: 2px; overflow: hidden; text-overflow: ellipsis; }
    .aw-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
    .aw-schip { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 999px; font-size: 0.625rem; font-weight: 700; letter-spacing: 0.4px; text-transform: uppercase; background: #E5F3EA; color: var(--ok); }
    .aw-schip.is-suspended, .aw-schip.is-cancel { background: #FCE8E5; color: var(--danger); }
    .aw-tchip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 999px; border: 1px solid; font-size: 0.625rem; font-weight: 600; line-height: 1.2; }
    .aw-tdot { width: 6px; height: 6px; border-radius: 50%; }
    .aw-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .aw-meta .v { font-size: 0.75rem; color: var(--text); margin-top: 3px; }
    .aw-meta .aw-eyebrow { font-size: 0.5625rem; }

    /* lifetime stats */
    .aw-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .aw-stat-v { font-family: var(--font-display); font-size: 1.375rem; font-weight: 500; line-height: 1; }
    .aw-stat-l { font-size: 0.625rem; color: var(--text-muted); margin-top: 3px; }

    /* risk */
    .aw-risk-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
    .aw-risk-num { font-family: var(--font-display); font-size: 1.5rem; line-height: 1; }
    .aw-risk-denom { color: var(--text-muted); font-size: 1rem; }
    .aw-risk-chip { padding: 3px 10px; border-radius: 999px; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.4px; }
    .aw-risk-bar { height: 6px; border-radius: 3px; background: #ECECEE; overflow: hidden; }
    .aw-risk-fill { height: 100%; border-radius: 3px; }
    .aw-risk-axis { display: flex; justify-content: space-between; font-size: 0.5625rem; color: var(--text-muted); margin-top: 4px; }

    /* tags */
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

    /* right column */
    .aw-two { display: grid; grid-template-columns: 1.4fr 1fr; gap: 14px; align-items: start; }
    .aw-cardhead { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--line); }
    .aw-table { width: 100%; border-collapse: collapse; }
    .aw-table td { padding: 11px 12px; font-size: 0.8125rem; vertical-align: middle; border-top: 1px solid var(--surface); }
    .aw-table tr:first-child td { border-top: none; }
    .aw-brow { cursor: default; }
    .aw-brow[role="link"] { cursor: pointer; }
    .aw-brow:hover { background: #FAFAFA; }
    .c-date { width: 64px; color: var(--text-muted); font-size: 0.75rem; } .c-date .bk-mon { font-weight: 700; }
    .bk-svc { font-weight: 600; }
    .bk-with { font-size: 0.6875rem; color: var(--text-muted); margin-top: 2px; }
    .c-status { width: 110px; } .c-price { text-align: right; font-weight: 600; width: 70px; }

    .aw-tl { position: relative; }
    .aw-tlrow { display: flex; gap: 12px; padding-bottom: 14px; position: relative; }
    .aw-tlrow.last { padding-bottom: 0; }
    .aw-tldot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; border: 2px solid #fff; box-shadow: 0 0 0 1px var(--line); }
    .aw-tltitle { font-size: 0.8125rem; line-height: 1.4; }
    .aw-tltitle ::ng-deep b { font-weight: 700; }
    .aw-tlmeta { font-size: 0.625rem; color: var(--text-muted); margin-top: 2px; }

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
    @media screen and (max-width: 1100px) {
      .aw-body { grid-template-columns: 1fr; }
      .aw-two { grid-template-columns: 1fr; }
    }
  `],
})
export class AdminPortalCustomerDetailComponent {
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
  messageOpen = false;
  messageBody = '';
  messageError: string | null = null;
  messageSent = false;

  noteOpen = false;
  noteBody = '';
  noteError: string | null = null;
  noteSaved = false;

  exportNotice: string | null = null;

  tagPickerOpen = false;
  tagFilter = '';

  constructor(
    private location: Location,
    private auth: BeautyAuthService,
    private bff: BeautyBffService,
    private cdr: ChangeDetectorRef,
  ) {}

  // ---- chrome getters ----
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

  // ---- data getters ----
  get displayName(): string { return (this.d['display_name'] as string) ?? 'Customer'; }
  get initials(): string {
    const parts = this.displayName.split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  get email(): string { return (this.d['email'] as string) ?? ''; }
  get phone(): string { return (this.d['phone'] as string) ?? '—'; }
  get joinedLabel(): string { return (this.d['joined_label'] as string) ?? '—'; }
  get lastSeenLabel(): string { return (this.d['last_seen_label'] as string) ?? '—'; }
  get accountIdHex(): string { return ((this.d['id'] as number) ?? 0).toString(16).padStart(6, '0'); }
  get isSuspended(): boolean { return Boolean(this.d['is_suspended']); }
  get statusLabel(): string { return this.isSuspended ? 'Suspended' : 'Active'; }
  get attachedTags(): DetailTag[] { return (this.d['attached_tags'] as DetailTag[]) ?? []; }
  get suggestedTags(): DetailTag[] { return (this.d['suggested_tags'] as DetailTag[]) ?? []; }
  /** Full catalog of unattached tags (resolver `available_tags`) for the picker. */
  get availableTags(): DetailTag[] { return (this.d['available_tags'] as DetailTag[]) ?? []; }
  get filteredAvailableTags(): DetailTag[] {
    const q = this.tagFilter.trim().toLowerCase();
    return q ? this.availableTags.filter((t) => t.label.toLowerCase().includes(q)) : this.availableTags;
  }
  get lifetimeStats(): LifetimeStat[] { return (this.d['lifetime_stats'] as LifetimeStat[]) ?? []; }
  get bookings(): BookingRow[] { return (this.d['bookings'] as BookingRow[]) ?? []; }
  get totalBookings(): number { return (this.d['total_bookings'] as number) ?? this.bookings.length; }
  get timeline(): TimelineEvent[] { return (this.d['timeline'] as TimelineEvent[]) ?? []; }
  get internalNotes(): InternalNote[] { return (this.d['internal_notes'] as InternalNote[]) ?? []; }
  get riskScore(): number { return (this.d['risk_score'] as number) ?? 0; }
  get riskLabel(): string { return (this.d['risk_label'] as string) ?? 'Low'; }
  get riskColor(): string { return this.riskScore < 30 ? '#2F7A47' : this.riskScore < 70 ? '#8A6A1F' : '#C0392B'; }
  get hasActiveBooking(): boolean { return Boolean(this.d['has_active_booking']); }

  private get supportTickets(): { open_count: number; total: number; rows: SupportTicket[] } {
    return (this.d['support_tickets'] as { open_count: number; total: number; rows: SupportTicket[] }) ?? { open_count: 0, total: 0, rows: [] };
  }
  get ticketRows(): SupportTicket[] { return this.supportTickets.rows ?? []; }
  get ticketsOpenCount(): number { return this.supportTickets.open_count ?? 0; }

  /** Detail view tabs (per design WebAdminDetail). Counts shown only where the
   * resolver supplies a real number — fabricated badges are dropped. */
  get detailTabs(): AdminWebTab[] {
    return [
      { id: 'overview', label: 'Overview' },
      { id: 'bookings', label: 'Bookings', count: this.totalBookings || null },
      { id: 'payments', label: 'Payments' },
      { id: 'reviews', label: 'Reviews' },
      { id: 'risk', label: 'Risk' },
      { id: 'notes', label: 'Notes', count: this.internalNotes.length || null },
      { id: 'audit', label: 'Audit' },
    ];
  }

  // ---- actions ----
  onMessage(): void { this.messageOpen = !this.messageOpen; this.messageError = null; this.messageSent = false; }
  toggleNoteComposer(): void { this.noteOpen = !this.noteOpen; this.noteError = null; this.noteSaved = false; }

  onSendMessage(): void {
    const body = this.messageBody.trim();
    if (!body || !this.hasActiveBooking) return;
    this.sendMessage.emit(body);
  }
  onSaveNote(): void {
    const body = this.noteBody.trim();
    if (!body) return;
    this.saveNote.emit(body);
  }
  onExport(): void { this.exportAccount.emit(); }

  /** Shell callbacks. */
  messageResult(ok: boolean, err?: string): void {
    if (ok) {
      this.messageSent = true; this.messageBody = '';
      setTimeout(() => { this.messageOpen = false; this.messageSent = false; this.cdr.markForCheck(); }, 1200);
    } else { this.messageError = err ?? 'Failed to send.'; }
    this.cdr.markForCheck();
  }
  noteResult(ok: boolean, err?: string): void {
    if (ok) {
      this.noteSaved = true; this.noteBody = '';
      setTimeout(() => { this.noteOpen = false; this.noteSaved = false; this.cdr.markForCheck(); }, 1000);
    } else { this.noteError = err ?? 'Failed to save.'; }
    this.cdr.markForCheck();
  }

  onBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) { this.location.back(); return; }
    const link = this.links['back'];
    if (link) this.followLink.emit(link);
  }
  onSuspend(): void { const link = this.links['suspend']; if (link) this.followLink.emit(link); }
  onManageTags(ev?: Event): void { if (ev) ev.preventDefault(); const link = this.links['manage_tags']; if (link) this.followLink.emit(link); }
  onTickets(ev?: Event): void { if (ev) ev.preventDefault(); const link = this.links['tickets']; if (link) this.followLink.emit(link); }

  openBooking(b: BookingRow): void {
    const link = this.links['booking_detail'];
    if (!link) return;
    this.followLink.emit({ ...link, route: (link.route ?? '').replace(':id', String(b.id)), params: { id: b.id } });
  }

  // ---- inline tag assign/unassign (RN parity) ----
  toggleTagPicker(): void { this.tagPickerOpen = !this.tagPickerOpen; if (!this.tagPickerOpen) this.tagFilter = ''; }

  onAssignTag(slug: string): void {
    const link = this.links['tag_assign_template'];
    if (!link?.href) return;
    const id = (this.d['id'] as number) ?? 0;
    const call: BffLink = { ...link, href: link.href.replace(':slug', slug) };
    // Close the picker on attach; refetch refreshes attached/available lists.
    this.tagPickerOpen = false; this.tagFilter = '';
    this.auth.follow(call, { type: 'customer', id }, true).subscribe({
      next: () => this.refetch(),
      error: () => this.refetch(),
    });
  }
  onUnassignTag(slug: string): void {
    const link = this.links['tag_unassign_template'];
    if (!link?.href) return;
    const call: BffLink = { ...link, href: link.href.replace(':slug', slug) };
    this.auth.follow(call, undefined, true).subscribe({
      next: () => this.refetch(),
      error: () => this.refetch(),
    });
  }

  /** Reload this screen's data in place (no navigation). */
  private refetch(): void {
    const id = (this.d['id'] as number) ?? 0;
    this.loading = true;
    this.cdr.markForCheck();
    this.bff.resolve('beauty_admin_portal_customer_detail', { id: String(id) }).subscribe({
      next: (resp) => {
        if (resp && resp.action === 'render' && resp.data) { this.local = resp.data as Record<string, unknown>; }
        this.loading = false; this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.cdr.markForCheck(); },
    });
  }
}
