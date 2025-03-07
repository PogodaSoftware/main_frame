import { Component, OnInit } from '@angular/core';
import { KevinNavigationComponent } from '../navigation/navigation.component';
import { KevinGlobalService } from '../global/global.service';
import { KevinFooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-projects',
  imports: [KevinNavigationComponent, KevinFooterComponent],
  template: `
    <body>
      <app-navigation></app-navigation>
      <section id="projects">
        <h1 class="title">Browse my projects</h1>
        <div class="project-details-container">
          <div class="project-containers">
            <div class="details-container color-container">
              <div class="article-container">
                <canvas
                  id="snowmanCanvas"
                  alt="First project"
                  class="project-image"
                ></canvas>
              </div>
              <h2 class="project-sub-title project-title">Project one</h2>
              <div class="btn-container">
                <button
                  class="btn btn-color-2 project-btn"
                  (click)="
                    kevinGlobalService.openPage(
                      'https://github.com/PogodaSoftware/main_frame'
                    )
                  "
                >
                  GitHub
                </button>
                <button
                  class="btn btn-color-2 project-btn"
                  (click)="
                    kevinGlobalService.openPage(
                      'kevin/blender-projects?model=snowman'
                    )
                  "
                >
                  Live Demo
                </button>
              </div>
            </div>

            <!-- Project 2 -->
            <div class="details-container color-container">
              <div class="article-container">
                <img
                  src="./assets/snowman-blender.png"
                  alt="Second project"
                  class="project-image"
                />
              </div>
              <h2 class="project-sub-title project-title">Project Two</h2>
              <div class="btn-container">
                <button
                  class="btn btn-color-2 project-btn"
                  (click)="
                    kevinGlobalService.openPage(
                      'https://github.com/PogodaSoftware/main_frame'
                    )
                  "
                >
                  GitHub
                </button>
                <button
                  class="btn btn-color-2 project-btn"
                  (click)="
                    kevinGlobalService.openPage(
                      'kevin/blender-projects?model=shark'
                    )
                  "
                >
                  Live Demo
                </button>
              </div>
            </div>

            <!-- Project 3 -->

            <div class="details-container color-container">
              <div class="article-container">
                <img
                  src="./assets/sci-fi-crate.png"
                  alt="Third project"
                  class="project-image"
                />
              </div>
              <h2 class="project-sub-title project-title">Project three</h2>
              <div class="btn-container">
                <button
                  class="btn btn-color-2 project-btn"
                  (click)="
                    kevinGlobalService.openPage(
                      'https://github.com/PogodaSoftware/main_frame'
                    )
                  "
                >
                  GitHub
                </button>
                <button
                  class="btn btn-color-2 project-btn"
                  (click)="
                    kevinGlobalService.openPage(
                      'kevin/blender-projects?model=scifiCrate'
                    )
                  "
                >
                  Live Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      <app-footer></app-footer>
    </body>
  `,
  styleUrls: ['./projects.component.scss', '../global/global.component.scss'],
})
export class KevinProjectsComponent implements OnInit {
  constructor(public kevinGlobalService: KevinGlobalService) {}

  ngOnInit(): void {
    this.kevinGlobalService.threeDimensionModelBuilder(
      'snowmanCanvas',
      'snowman',
      false,
      'black',
      0,
      2,
      3.1,
      3.5,
      2
    );
  }
}
