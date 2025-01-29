import { Component } from '@angular/core';

@Component({
  selector: 'app-navigation',
  imports: [],
  template: `
    <body>
      <nav id="desktop-navigation">
        <div class="logo"><a href="kevin">Kevin Ortiz!</a></div>
        <div>
          <ul class="nav-links">
            <li><a href="kevin/about">About</a></li>
            <li><a href="kevin/experience">Experience</a></li>
            <li><a href="#projects">Projects</a></li>
            <li><a href="#contacts">Contacts</a></li>
          </ul>
        </div>
      </nav>

      <nav id="hamburger-navigation">
        <div class="logo">Kevin Ortiz!</div>
        <div class="hamburger-menu">
          <div class="hamburger-icon" (click)="toggleMenu()">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="menu-links">
            <li><a href="kevin/about" (click)="toggleMenu()">About</a></li>
            <li>
              <a href="kevin/experience" (click)="toggleMenu()">Experience</a>
            </li>
            <li><a href="#projects" (click)="toggleMenu()">Projects</a></li>
            <li><a href="#contacts" (click)="toggleMenu()">Contacts</a></li>
          </div>
        </div>
      </nav>
    </body>
  `,
  styleUrls: [
    './navigation.component.scss',
    '../global/global-styles.component.scss',
  ],
})
export class KevinNavigationComponent {
  toggleMenu(): void {
    const menu = document.querySelector('.menu-links');
    const icon = document.querySelector('.hamburger-icon');
    if (menu && icon) {
      menu.classList.toggle('open');
      icon.classList.toggle('open');
    }
  }
}
