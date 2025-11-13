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
  currentYear: number;

  constructor() {
    this.currentYear = new Date().getFullYear();
  }
}
