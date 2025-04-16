import { Component } from '@angular/core';

@Component({
  selector: 'app-navigation',
  standalone: true,
  template: `
    <body>

      <nav id="desktop-navigation">
        <div class="logo"><a href="kevin">Home</a></div>
        <div>
          <ul class="nav-links">
            <li><a href="kevin/about">About</a></li>
            <li><a href="kevin/experience">Experience</a></li>
            <li><a href="kevin/projects">Projects</a></li>
            <li><a href="kevin/contacts">Contacts</a></li>
          </ul>
        </div>
      </nav>
      

      <nav id="hamburger-navigation">
        <div class="logo"><a href="kevin">Home</a></div>
        <div class="hamburger-menu">
          <div class="hamburger-icon" (click)="toggleMenu()">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="menu-links">
            <ul>
              <li><a href="kevin/about" (click)="toggleMenu()">About</a></li>
              <li><a href="kevin/experience" (click)="toggleMenu()">Experience</a></li>
              <li><a href="kevin/projects" (click)="toggleMenu()">Projects</a></li>
              <li><a href="kevin/contacts" (click)="toggleMenu()">Contacts</a></li>
            </ul>
          </div>
        </div>
      </nav>
    </body>
  `,
  styleUrls: [
    './navigation.component.scss',
    '../global/global.component.scss',
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