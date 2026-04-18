/**
 * BeautyCategoryComponent (Presentational)
 * ----------------------------------------
 * Lists every provider in a single category. Each provider card shows
 * its services with a HATEOAS `book` link the shell turns into a
 * navigation. The header `back` action goes home.
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

interface CategoryService {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  duration_minutes: number;
  _links?: Record<string, BffLink>;
}

interface CategoryProvider {
  id: number;
  name: string;
  short_description: string;
  location_label: string;
  services: CategoryService[];
  _links?: Record<string, BffLink>;
}

@Component({
  selector: 'app-beauty-category',
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

      <section class="category-section">
        <h1 class="category-title">{{ data['category_label'] }}</h1>
        <p class="category-sub">
          {{ data['total_providers'] }} provider(s) available
        </p>

        <div class="providers-list">
          <div *ngFor="let p of providers" class="provider-card">
            <div class="provider-head">
              <button
                class="provider-name-btn"
                (click)="emit(p._links?.['detail'])"
              >{{ p.name }}</button>
              <span class="provider-loc">{{ p.location_label }}</span>
            </div>
            <p class="provider-desc">{{ p.short_description }}</p>

            <ul class="services-ul">
              <li *ngFor="let s of p.services" class="service-row">
                <div class="service-info">
                  <strong>{{ s.name }}</strong>
                  <span class="service-meta">
                    {{ s.duration_minutes }} min · \${{ (s.price_cents / 100) | number:'1.2-2' }}
                  </span>
                  <span class="service-desc">{{ s.description }}</span>
                </div>
                <button
                  class="btn-book"
                  (click)="emit(s._links?.['book'])"
                >Book</button>
              </li>
            </ul>
          </div>

          <p *ngIf="!providers.length" class="empty">
            No providers in this category yet.
          </p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .beauty-app { min-height: 100dvh; background: #fff; font-family: -apple-system, sans-serif; color: #212121; }
    .beauty-header { display: flex; align-items: center; padding: 16px 20px; border-bottom: 1px solid #eee; }
    .brand-icon { font-size: 1.4rem; margin-right: 6px; }
    .brand-name-btn { background: none; border: none; font-size: 1.1rem; font-weight: 600; cursor: pointer; }
    .category-section { padding: 24px 20px 64px; max-width: 720px; margin: 0 auto; }
    .category-title { font-size: 2rem; margin: 0 0 4px; }
    .category-sub { color: #666; margin: 0 0 24px; }
    .provider-card { border: 1px solid #eee; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
    .provider-head { display: flex; justify-content: space-between; align-items: baseline; }
    .provider-name-btn { background: none; border: none; font-size: 1.15rem; font-weight: 600; padding: 0; cursor: pointer; color: #000; }
    .provider-name-btn:hover { text-decoration: underline; }
    .provider-loc { font-size: 0.85rem; color: #888; }
    .provider-desc { color: #555; margin: 6px 0 12px; }
    .services-ul { list-style: none; padding: 0; margin: 0; }
    .service-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-top: 1px solid #f4f4f4; }
    .service-info { display: flex; flex-direction: column; gap: 2px; }
    .service-meta { font-size: 0.85rem; color: #666; }
    .service-desc { font-size: 0.85rem; color: #888; }
    .btn-book { background: #000; color: #fff; border: none; border-radius: 8px; padding: 8px 18px; cursor: pointer; font-size: 0.9rem; }
    .btn-book:hover { background: #222; }
    .empty { text-align: center; color: #888; margin-top: 32px; }
  `],
})
export class BeautyCategoryComponent {
  @Input() data: Record<string, unknown> = {};
  @Input() links: Record<string, BffLink> = {};
  @Output() followLink = new EventEmitter<BffLink>();

  get providers(): CategoryProvider[] {
    return (this.data['providers'] as CategoryProvider[]) || [];
  }

  emit(link: BffLink | null | undefined): void {
    if (link) this.followLink.emit(link);
  }
}
