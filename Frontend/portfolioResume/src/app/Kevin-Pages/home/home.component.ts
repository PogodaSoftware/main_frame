import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  imports: [],
  template: `
    <head>
      8
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

      <script src="script.js"></script>
    </body>
  `,
  styleUrls: [
    './home.component.scss',
    '../media-queries/media-queries.component.scss',
  ],
})
export class KevinHomeComponent {}
