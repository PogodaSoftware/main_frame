import { Component } from '@angular/core';
import { KevinNavigationComponent } from '../navigation/navigation.component';

@Component({
  selector: 'app-projects',
  imports: [KevinNavigationComponent],
  template: `
    <body>
      <app-navigation></app-navigation>
      <section id="projects">
        <h1 class="title">Browse my projects</h1>
        <div class="project-details-container">
          <div class="details-container color-container">
            <div class="article-container">
              <img
                src="./assets/project-1.png"
                alt="First project, place holder"
                class="project-image"
              />
            </div>
            <h2 class="project-sub-title project-title">Project one</h2>
            <div class="btn-container">
              <button
                class="btn btn-color-2 project-btn"
                onclick="location.href='https://github.com/PogodaSoftware/main_frame'"
              >
                GitHub
              </button>
              <button
                class="btn btn-color-2 project-btn"
                onclick="location.href=''"
              >
                Live Demo
              </button>
            </div>
          </div>

          <!-- Project 2 -->
          <div class="details-container color-container">
            <div class="article-container">
              <img
                src="./assets/project-2.png"
                alt="Second project, place holder"
                class="project-image"
              />
            </div>
            <h2 class="project-sub-title project-title">Project two</h2>
            <div class="btn-container">
              <button
                class="btn btn-color-2 project-btn"
                (click)="openPage()"
              >
                GitHub
              </button>
              <button
                class="btn btn-color-2 project-btn"
                onclick="location.href=''"
              >
                Live Demo
              </button>
            </div>
          </div>

          <!-- Project 3 -->

          <div class="details-container color-container">
            <div class="article-container">
              <img
                src="./assets/project-3.png"
                alt="First project, place holder"
                class="project-image"
              />
            </div>
            <h2 class="project-sub-title project-title">Project three</h2>
            <div class="btn-container">
              <button
                class="btn btn-color-2 project-btn"
                onclick="location.href='https://github.com/PogodaSoftware/main_frame'"
              >
                GitHub
              </button>
              <button
                class="btn btn-color-2 project-btn"
                onclick="location.href=''"
              >
                Live Demo
              </button>
            </div>
          </div>
        </div>
      </section>
    </body>
  `,
  styleUrls: [
    './projects.component.scss',
    '../global/global.component.scss',
  ],
})
export class KevinProjectsComponent {
  openPage(): void {
    window.open('https://github.com/PogodaSoftware/main_frame');
  }
}
