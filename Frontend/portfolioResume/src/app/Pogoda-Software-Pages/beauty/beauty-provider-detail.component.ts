/**
 * BeautyProviderDetailComponent (Presentational)
 * ----------------------------------------------
 * Renders a single provider profile + the full list of their services
 * (across all categories), each with a HATEOAS `book` link.
 */

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { BffLink } from './beauty-bff.types';

interface ProviderInfo {
  id: number;
  name: string;
  short_description: string;
  long_description: string;
  location_label: string;
}

interface ProviderService {
  id: number;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  duration_minutes: number;
  _links?: Record<string, BffLink>;
}

@Component({
  selector: 'app-beauty-provider-detail',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.Default,
  template: `
    <div class="beauty-app">
      <header class="beauty-header">
        <div class="header-brand">
          <span class="brand-icon">✨</span>
          <button class="brand-name-btn" (click)="emit(links['home'])">Beauty</button>
        </div>
      </header>

      <section class="provider-section" *ngIf="provider as p">
        <h1 class="provider-title">{{ p.name }}</h1>
        <p class="provider-loc">{{ p.location_label }}</p>
        <p class="provider-long">{{ p.long_description }}</p>

        <h2 class="services-h">Services</h2>
        <ul class="services-ul">
          <li *ngFor="let s of services" class="service-row">
            <div class="service-info">
              <strong>{{ s.name }}</strong>
              <span class="service-cat">{{ s.category | titlecase }}</span>
              <span class="service-meta">
                {{ s.duration_minutes }} min · \${{ (s.price_cents / 100) | number:'1.2-2' }}
              </span>
              <span class="service-desc">{{ s.description }}</span>
            </div>
            <button class="btn-book" (click)="emit(s._links?.['book'])">Book</button>
          </li>
          <li *ngIf="!services.length" class="empty">No services listed yet.</li>
        </ul>
      </section>
    </div>
  `,
  styles: [`
    .beauty-app { min-height: 100dvh; background: #fff; font-family: -apple-system, sans-serif; color: #212121; }
    .beauty-header { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid #eee; }
    .brand-icon { font-size: 1.4rem; margin-right: 6px; }
    .brand-name-btn { background: none; border: none; font-size: 1.1rem; font-weight: 600; cursor: pointer; }
    .provider-section { padding: 24px 20px 64px; max-width: 720px; margin: 0 auto; }
    .provider-title { font-size: 2rem; margin: 0 0 4px; }
    .provider-loc { color: #888; margin: 0 0 16px; }
    .provider-long { color: #444; line-height: 1.5; margin-bottom: 24px; }
    .services-h { font-size: 1.25rem; margin: 24px 0 12px; }
    .services-ul { list-style: none; padding: 0; margin: 0; }
    .service-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-top: 1px solid #f0f0f0; }
    .service-info { display: flex; flex-direction: column; gap: 2px; }
    .service-cat { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #888; }
    .service-meta { font-size: 0.85rem; color: #666; }
    .service-desc { font-size: 0.85rem; color: #888; }
    .btn-book { background: #000; color: #fff; border: none; border-radius: 8px; padding: 8px 18px; cursor: pointer; font-size: 0.9rem; }
    .btn-book:hover { background: #222; }
    .empty { color: #888; padding: 16px 0; }
  `],
})
export class BeautyProviderDetailComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  get provider(): ProviderInfo | null {
    return (this.data['provider'] as ProviderInfo) || null;
  }

  get services(): ProviderService[] {
    return (this.data['services'] as ProviderService[]) || [];
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }
}
