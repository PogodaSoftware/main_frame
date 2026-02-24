/**
 * Pogoda Software Footer Component
 *
 * Simple footer displaying a copyright notice with the current year.
 * Dynamically calculates the year so it always stays up to date.
 * Used across all Pogoda Software pages.
 */

import { Component } from '@angular/core';

@Component({
  selector: 'app-pogoda-footer',
  standalone: true,
  template: `
    <footer>
      <nav></nav>
      <p>
        Copyright &#169; {{ currentYear }} Pogoda Software. All Rights Reserved.
      </p>
    </footer>
  `,
  styleUrls: ['./footer.component.scss', '../../Kevin-Pages/global/global.component.scss'],
})
export class PogodaFooterComponent {
  /** The current calendar year, used in the copyright notice. */
  currentYear: number;

  /** Sets the current year on component creation. */
  constructor() {
    this.currentYear = new Date().getFullYear();
  }
}
