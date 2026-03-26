/**
 * Kevin Ortiz Footer Component
 *
 * Simple footer displaying a copyright notice with the current year.
 * Dynamically calculates the year so it always stays up to date.
 * Used across all Kevin portfolio pages.
 */

import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  imports: [],
  template: `
    <footer>
      <nav></nav>
      <p>
        Copyright &#169; {{ currentYear }} Kevin Ortiz. All Rights Reserved.
      </p>
    </footer>
  `,
  styleUrls: ['./footer.component.scss', '../global/global.component.scss'],
})
export class KevinFooterComponent {
  /** The current calendar year, used in the copyright notice. */
  currentYear: number;

  /** Sets the current year on component creation. */
  constructor() {
    this.currentYear = new Date().getFullYear();
  }
}
