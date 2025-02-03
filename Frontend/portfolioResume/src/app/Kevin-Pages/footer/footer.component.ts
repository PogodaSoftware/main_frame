import { Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  imports: [],
  template: `
    <body>
      <footer>
        <nav></nav>
        <p>
          Copyright &#169; {{ currentYear }} Kevin Ortiz. All Rights Reserved.
        </p>
      </footer>
    </body>
  `,
  styleUrls: ['./footer.component.scss', '../global/global.component.scss'],
})
export class KevinFooterComponent {
  currentYear: number;

  constructor() {
    this.currentYear = new Date().getFullYear();
  }
}
