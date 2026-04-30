/**
 * KevinFooterComponent
 * --------------------
 * Footer matching design — copyright + links row.
 */

import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  template: `
    <footer class="footer">
      <div class="shell footer-inner">
        <div>© {{ currentYear }} Kevin Ortiz · All rights reserved.</div>
        <div class="footer-links">
          <a href="https://github.com/kevinortiz43" target="_blank" rel="noopener">Source</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </div>
      </div>
    </footer>
  `,
  styles: [`
    :host { display: block; }
    .footer {
      border-top: 1px solid var(--border);
      padding: 40px 0;
      background: var(--bg);
    }
    .footer-inner {
      display: flex; justify-content: space-between; align-items: center;
      gap: 16px;
      font-family: var(--font-mono);
      font-size: 12px;
      color: var(--fg-3);
    }
    .footer-inner a { color: var(--fg-2); text-decoration: none; }
    .footer-inner a:hover { color: var(--accent); }
    .footer-links { display: flex; gap: 18px; }
  `],
})
export class KevinFooterComponent {
  currentYear: number = new Date().getFullYear();
}
