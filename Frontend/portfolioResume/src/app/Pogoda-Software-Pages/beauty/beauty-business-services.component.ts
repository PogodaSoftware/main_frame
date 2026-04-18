/**
 * BeautyBusinessServicesComponent (Presentational)
 * ------------------------------------------------
 * Lists the storefront's services with HATEOAS links to add a new
 * service, edit any existing one, or delete one. Delete is a DELETE
 * link the shell handles via BeautyAuthService; on success the shell
 * re-resolves this same screen via the self link.
 */

import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { BeautyAuthService } from './beauty-auth.service';
import { BffLink } from './beauty-bff.types';

interface ServiceRow {
  id: number;
  name: string;
  description: string;
  category: string;
  category_label: string;
  price_cents: number;
  duration_minutes: number;
  _links?: Record<string, BffLink>;
}

@Component({
  selector: 'app-beauty-business-services',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="biz-app">
      <header class="biz-header">
        <button class="back-btn" (click)="emit(links['business_home'])" *ngIf="links['business_home']">
          ← Dashboard
        </button>
        <h1 class="biz-h1">Manage services</h1>
        <button class="btn-primary" (click)="emit(links['add'])" *ngIf="links['add']">
          + Add service
        </button>
      </header>

      <section class="biz-section">
        <p *ngIf="!services.length" class="empty">
          No services yet. Click <strong>Add service</strong> to create your first one.
        </p>

        <ul class="svc-list">
          <li *ngFor="let s of services" class="svc-row">
            <div class="svc-info">
              <strong>{{ s.name }}</strong>
              <span class="svc-cat">{{ s.category_label }} · {{ s.duration_minutes }} min · \${{ (s.price_cents / 100).toFixed(2) }}</span>
              <span class="svc-desc" *ngIf="s.description">{{ s.description }}</span>
            </div>
            <div class="svc-actions">
              <button class="btn-secondary" (click)="emit(s._links?.['edit'])">Edit</button>
              <button
                class="btn-delete"
                (click)="del(s)"
                [disabled]="busyId === s.id"
              >{{ busyId === s.id ? 'Removing…' : 'Delete' }}</button>
            </div>
          </li>
        </ul>

        <p *ngIf="errorMsg" class="server-error">{{ errorMsg }}</p>
      </section>
    </div>
  `,
  styles: [`
    .biz-app { min-height: 100dvh; background: #fafafa; font-family: -apple-system, sans-serif; color: #212121; }
    .biz-header { display: flex; align-items: center; gap: 16px; padding: 16px 24px; background: #fff; border-bottom: 1px solid #eee; }
    .back-btn { background: none; border: none; color: #555; cursor: pointer; }
    .biz-h1 { font-size: 1.2rem; margin: 0; flex: 1; }
    .btn-primary { background: #1d4ed8; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; }
    .btn-secondary { background: #fff; border: 1px solid #ccc; padding: 8px 14px; border-radius: 8px; cursor: pointer; }
    .btn-delete { background: #fff; color: #c62828; border: 1px solid #c62828; padding: 8px 14px; border-radius: 8px; cursor: pointer; }
    .btn-delete:disabled { opacity: 0.6; cursor: not-allowed; }
    .biz-section { padding: 24px; max-width: 960px; margin: 0 auto; }
    .empty { color: #888; padding: 24px 0; text-align: center; }
    .svc-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
    .svc-row { background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .svc-info { display: flex; flex-direction: column; gap: 2px; }
    .svc-cat { color: #666; font-size: 0.85rem; }
    .svc-desc { color: #888; font-size: 0.85rem; margin-top: 4px; }
    .svc-actions { display: flex; gap: 8px; }
    .server-error { color: #c62828; padding: 12px 0; }
  `],
})
export class BeautyBusinessServicesComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  busyId: number | null = null;
  errorMsg = '';

  constructor(private authService: BeautyAuthService) {}

  get services(): ServiceRow[] {
    return (this.data['services'] as ServiceRow[]) || [];
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }

  del(s: ServiceRow): void {
    const link = s._links?.['delete'];
    if (!link || this.busyId != null) return;
    this.busyId = s.id;
    this.errorMsg = '';
    this.authService.follow(link).subscribe({
      next: () => {
        this.busyId = null;
        const self = this.links['self'];
        if (self) this.followLink.emit(self);
      },
      error: (err) => {
        this.busyId = null;
        this.errorMsg = err?.error?.detail || 'Could not delete that service.';
      },
    });
  }
}
