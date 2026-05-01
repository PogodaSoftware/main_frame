/**
 * KevinNavigationComponent
 * ------------------------
 * Sticky top nav for the portfolio. Brand mark + numbered section links
 * + theme toggle + "Let's talk" CTA. Active state from scroll-spy on
 * the parent.
 */

import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KevinThemeService } from '../global/kevin-theme.service';

@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="nav">
      <div class="shell nav-inner">
        <a href="#top" class="brand" (click)="onNav($event, 'top')">
          <span class="brand-mark">KO</span>
          <span class="brand-name">Kevin Ortiz</span>
        </a>
        <ul class="nav-links">
          <li *ngFor="let it of items">
            <button
              type="button"
              class="nav-link"
              [class.is-active]="active === it.id"
              (click)="onNav($event, it.id)"
            >
              <span class="num">{{ it.num }}</span>
              <span>{{ it.label }}</span>
            </button>
          </li>
        </ul>
        <div class="nav-actions">
          <button
            type="button"
            class="icon-btn"
            (click)="theme.toggleTheme()"
            [attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'"
          >
            <svg *ngIf="theme.theme() === 'dark'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
            <svg *ngIf="theme.theme() !== 'dark'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
          <button type="button" class="btn btn-ghost cta" (click)="onNav($event, 'contact')">Let's talk</button>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    :host { display: block; }

    .nav {
      position: sticky; top: 0; z-index: 50;
      backdrop-filter: blur(16px) saturate(160%);
      -webkit-backdrop-filter: blur(16px) saturate(160%);
      background: color-mix(in oklab, var(--bg) 78%, transparent);
      border-bottom: 1px solid var(--border);
    }
    .nav-inner {
      display: flex; align-items: center; justify-content: space-between;
      height: 68px;
    }
    .brand {
      display: flex; align-items: center; gap: 10px;
      font-family: var(--font-display); font-weight: 600; font-size: 18px;
      letter-spacing: -0.02em;
      color: var(--fg);
      text-decoration: none;
      background: none; border: none; padding: 0; cursor: pointer;
    }
    :host-context([data-variant="engineer"]) .brand,
    [data-variant="engineer"] :host .brand {
      font-family: var(--font-mono); font-size: 15px; font-weight: 600;
    }
    .brand-mark {
      width: 32px; height: 32px; border-radius: 9px;
      background: var(--gradient-a);
      display: grid; place-items: center;
      color: var(--accent-fg); font-weight: 800; font-size: 14px;
      font-family: var(--font-body);
      box-shadow: var(--shadow-glow);
    }
    .nav-links {
      display: flex; align-items: center; gap: 4px;
      list-style: none; padding: 0; margin: 0;
    }
    .nav-link {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-radius: 999px;
      color: var(--fg-2); text-decoration: none; font-size: 14px; font-weight: 500;
      transition: color 200ms ease, background-color 200ms ease;
      cursor: pointer;
      background: none; border: none;
      font-family: inherit;
    }
    .nav-link:hover { color: var(--fg); background: var(--bg-2); }
    .nav-link.is-active { color: var(--fg); background: var(--bg-2); }
    .nav-link .num { font-family: var(--font-mono); font-size: 11px; color: var(--fg-4); }

    .nav-actions { display: flex; align-items: center; gap: 8px; }
    .cta { padding: 8px 16px; font-size: 13px; }

    @media (max-width: 768px) {
      .nav-links { display: none; }
    }
  `],
})
export class KevinNavigationComponent {
  @Input() active = 'top';
  @Output() navigate = new EventEmitter<string>();

  readonly theme = inject(KevinThemeService);

  items = [
    { id: 'about', label: 'About', num: '01' },
    { id: 'work', label: 'Work', num: '02' },
    { id: 'skills', label: 'Skills', num: '03' },
    { id: 'projects', label: 'Projects', num: '04' },
    { id: 'contact', label: 'Contact', num: '05' },
  ];

  onNav(event: Event, id: string): void {
    event.preventDefault();
    this.navigate.emit(id);
  }
}
