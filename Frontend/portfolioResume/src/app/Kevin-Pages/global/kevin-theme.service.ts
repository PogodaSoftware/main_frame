/**
 * KevinThemeService — theme + variant + motion signals.
 * Sets data-theme / data-variant / data-motion on <html>.
 * Persists choices in localStorage.
 */

import { Injectable, signal, effect, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';

export type ThemeName = 'dark' | 'light';
export type VariantName = 'engineer' | 'studio';

const KEY_THEME = 'kevin.theme';
const KEY_VARIANT = 'kevin.variant';
const KEY_MOTION = 'kevin.motion';

@Injectable({ providedIn: 'root' })
export class KevinThemeService {
  readonly theme = signal<ThemeName>('dark');
  readonly variant = signal<VariantName>('engineer');
  readonly motion = signal<number>(0.6);

  private isBrowser = false;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    @Inject(DOCUMENT) private document: Document,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    if (this.isBrowser) {
      const t = (localStorage.getItem(KEY_THEME) as ThemeName) || 'dark';
      const v = (localStorage.getItem(KEY_VARIANT) as VariantName) || 'engineer';
      const m = parseFloat(localStorage.getItem(KEY_MOTION) || '0.6');
      this.theme.set(t);
      this.variant.set(v);
      this.motion.set(Number.isFinite(m) ? m : 0.6);
    }

    effect(() => {
      const root = this.document.documentElement;
      root.setAttribute('data-theme', this.theme());
      root.setAttribute('data-variant', this.variant());
      root.setAttribute('data-motion', this.motion() < 0.05 ? '0' : '1');
      if (this.isBrowser) {
        localStorage.setItem(KEY_THEME, this.theme());
        localStorage.setItem(KEY_VARIANT, this.variant());
        localStorage.setItem(KEY_MOTION, String(this.motion()));
      }
    });
  }

  toggleTheme(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  setVariant(v: VariantName): void {
    this.variant.set(v);
  }
}
