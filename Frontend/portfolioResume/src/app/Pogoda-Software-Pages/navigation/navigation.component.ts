/**
 * Pogoda Software Navigation Component
 *
 * Responsive navigation bar for the Pogoda Software section.
 * Includes two layouts:
 *   1. Desktop navigation - Horizontal nav links visible on wider screens
 *   2. Hamburger navigation - Collapsible menu for mobile/tablet screens
 *
 * Navigation links: Home (/pogoda), Experience (/pogoda/experience)
 * This navigation is independent from Kevin's portfolio navigation.
 */

import { Component } from '@angular/core';

@Component({
  selector: 'app-pogoda-navigation',
  standalone: true,
  template: `
    <nav id="desktop-navigation">
      <div class="logo"><a href="pogoda">Pogoda Software</a></div>
      <div>
        <ul class="nav-links">
          <li><a href="pogoda">Home</a></li>
          <li><a href="pogoda/experience">Experience</a></li>
        </ul>
      </div>
    </nav>
    
    <nav id="hamburger-navigation">
      <div class="logo"><a href="pogoda">Pogoda Software</a></div>
      <div class="hamburger-menu">
        <div class="hamburger-icon" (click)="toggleMenu()">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="menu-links">
          <ul>
            <li><a href="pogoda" (click)="toggleMenu()">Home</a></li>
            <li><a href="pogoda/experience" (click)="toggleMenu()">Experience</a></li>
          </ul>
        </div>
      </div>
    </nav>
  `,
  styleUrls: [
    './navigation.component.scss',
    '../../Kevin-Pages/global/global.component.scss',
  ],
})
export class PogodaNavigationComponent {
  /**
   * Toggles the mobile hamburger menu open/closed state.
   * Adds or removes the 'open' CSS class on the menu-links container
   * and the hamburger-icon to trigger CSS transition animations.
   */
  toggleMenu(): void {
    const menu = document.querySelector('.menu-links');
    const icon = document.querySelector('.hamburger-icon');
    if (menu && icon) {
      menu.classList.toggle('open');
      icon.classList.toggle('open');
    }
  }
}
