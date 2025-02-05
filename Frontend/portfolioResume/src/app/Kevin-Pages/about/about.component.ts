import { Component } from '@angular/core';
import { KevinNavigationComponent } from '../navigation/navigation.component';
import { KevinFooterComponent } from '../footer/footer.component';
@Component({
  selector: 'app-home',
  imports: [KevinNavigationComponent, KevinFooterComponent],
  template: `
    <head>
      <title>Kevin's portfolio project</title>
    </head>
    <body>
      <app-navigation></app-navigation>
      <section id="about">
        <div class="about-section-container">
          <div class="about-section-picture-container">
            <img
              src="./assets/professional-picture.jpg"
              alt="profile picture"
              class="about-picture"
            />
          </div>
          <div class="about-details-container">
            <div class="about-containers">
              <div class="details-container">
                <img
                  src="./assets/experience.png"
                  alt="Experience icon"
                  class="icon"
                />
                <h3>Experience</h3>
                <p>
                  3 + years<br />
                  Software Developer
                </p>
                <p>
                  2 + years<br />
                  Quality Assurance Engineer
                </p>

                <p>
                  3 + months<br />
                  DevOps Engineer
                </p>
              </div>

              <div class="details-container">
                <img
                  src="./assets/education.png"
                  alt="Education icon"
                  class="icon"
                />
                <h3>Education</h3>
                <p>B.Sc. in Marine Environmental Science<br /></p>
                <p>Software Engineering training at Perscholas & FDM Group</p>
              </div>
            </div>
            <div class="text-container">
              <p>
                I am a software developer with a background in Marine
                Environmental Science. I have experience in software development,
                quality assurance, and DevOps. I am passionate about learning new
                technologies and how to apply them to solve real-world problems.
              </p>
            </div>
          </div>
        </div>
      </section>
      <app-footer></app-footer>
    </body>
  `,
  styleUrls: ['./about.component.scss', '../global/global.component.scss'],
})
export class KevinAboutComponent {}
