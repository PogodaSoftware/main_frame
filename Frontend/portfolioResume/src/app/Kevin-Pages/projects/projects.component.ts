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
                  alt="Model of a snowman"
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
                      'kevin/blender-projects?model=snowman&helpers=false&color=black&cameraX=0&cameraY=1&cameraZ=4'
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
                <canvas
                  id="sharkCanvas"
                  alt="Model of a shark"
                  class="project-image"
                ></canvas>
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
                      'kevin/blender-projects?model=shark&helpers=false&color=black&cameraX=6&cameraY=2&cameraZ=0'
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
                <canvas
                  id="scifiCrateCanvas"
                  alt="Model of a scifi crate"
                  class="project-image"
                ></canvas>
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
                      'kevin/blender-projects?model=scifiCrate&helpers=false&color=white&cameraX=0&cameraY=1&cameraZ=4'
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
    this.kevinGlobalService.threeDimensionModelBuilder(
      'sharkCanvas',
      'shark',
      false,
      'black',
      // cameraPositionX, cameraPositionY - UP, cameraPositionZ - BACK
      6, // X: Centered horizontally
      2, // Y: Elevated position for top-down angle
      0, // Z: Closer to the model

      // renderPositionWidth, renderPositionHeight
      3.5,
      2
    );

    this.kevinGlobalService.threeDimensionModelBuilder(
      'scifiCrateCanvas',
      'scifiCrate',
      false,
      'white',
      0,
      2,
      3.1,
      3.5,
      2
    );
  }
}
