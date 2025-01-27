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
        <div class="logo">Kevin Ortiz!</div>
        <div class="hamburger-menu">
          <div class="hamburger-icon" (click)="toggleMenu()">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div class="menu-links">
            <li><a href="#about" (click)="toggleMenu()">About</a></li>
            <li><a href="#experience" (click)="toggleMenu()">Experience</a></li>
            <li><a href="#projects" (click)="toggleMenu()">Projects</a></li>
            <li><a href="#contacts" (click)="toggleMenu()">Contacts</a></li>
          </div>
        </div>
      </nav>

      <section id="profile">
        <div class="section-picture-container">
          <img
            src="./assets/professional-picture.jpg"
            alt="kevin ortiz profile picture"
          />
        </div>

        <div class="section-text">
          <p class="section-text-p1">Hello I'm</p>
          <h1 class="title">Kevin Ortiz</h1>
          <p class="section-text-p2">Quality Assurance and DevOps Engineer</p>
          <div class="btn-container">
            <button class="btn btn-color-2" (click)="openResume()">
              Download CV
            </button>

            <button
              class="btn btn-color-1"
              onclick="location.href='./#contacts'"
            >
              Contact Me
            </button>
          </div>

          <div id="socials-container">
            <img
              src="./assets/linkedin.png"
              alt="My LinkedIn profile"
              class="icon"
              onclick="location.href='https://www.linkedin.com/in/kevino73/'"
            />

            <img
              src="./assets/github.png"
              alt="My GitHub profile"
              class="icon"
              onclick="location.href='https://github.com/kevinortiz43'"
            />
          </div>
        </div>
      </section>
    </body>
  `,
  styleUrls: ['./home.component.scss', './media-queries.component.scss'],
})
export class KevinHomeComponent {
  openResume(): void {
    window.open('./assets/Ortiz_Kevin_Resume.pdf');
  }

  toggleMenu(): void {
    const menu = document.querySelector('.menu-links');
    const icon = document.querySelector('.hamburger-icon');
    if (menu && icon) {
      menu.classList.toggle('open');
      icon.classList.toggle('open');
    }
  }
}
