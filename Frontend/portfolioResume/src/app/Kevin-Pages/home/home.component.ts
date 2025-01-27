import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  imports: [],
  template: `
    <head>
      <title>Kevin's portfolio project</title>
    </head>
    <body>
      <nav id="desktop-navigation">
        <div class="logo">Kevin Ortiz!</div>
        <div>
          <ul class="nav-links">
            <li><a href="#about">About</a></li>
            <li><a href="#experience">Experience</a></li>
            <li><a href="#projects">Projects</a></li>
            <li><a href="#contacts">Contacts</a></li>
          </ul>
        </div>
      </nav>
 
      <nav id="hamburger-navigation">
        <div class="logo">kevin</div>
        <div class="hamburger-menu">
          <div class="hamburger-icon" onclick="toggleMenu()">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="menu-links">
            <li><a href="#about" onclick="toggleMenu()">About</a></li>
            <li><a href="#experience" onclick="toggleMenu()">Experience</a></li>
            <li><a href="#projects" onclick="toggleMenu()">Projects</a></li>
            <li><a href="#contacts" onclick="toggleMenu()">Contacts</a></li>
          </div>
        </div>
      </nav>

      <script src="script.js"></script>
    </body>
  `,
  styleUrls: [
    './home.component.scss',
    '../media-queries/media-queries.component.scss',
  ],
})
export class KevinHomeComponent {}
