import { Component } from '@angular/core';

@Component({
  selector: 'app-pogoda-navigation',
  standalone: true,
  template: `
    <body>
      <nav id="desktop-navigation">
        <div class="logo"><a href="pogoda">Pogoda Software</a></div>
        <div>
          <ul class="nav-links">
            <li><a href="pogoda">Home</a></li>
            <li><a href="pogoda/experience">Experience</a></li>
            <li><a href="kevin">Kevin's Portfolio</a></li>
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
              <li><a href="kevin" (click)="toggleMenu()">Kevin's Portfolio</a></li>
            </ul>
          </div>
        </div>
      </nav>
    </body>
  `,
  styleUrls: [
    './navigation.component.scss',
    '../../Kevin-Pages/global/global.component.scss',
  ],
})
export class PogodaNavigationComponent {
  toggleMenu(): void {
    const menu = document.querySelector('.menu-links');
    const icon = document.querySelector('.hamburger-icon');
    if (menu && icon) {
      menu.classList.toggle('open');
      icon.classList.toggle('open');
    }
  }
}
