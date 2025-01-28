import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  imports: [],
  template: `
    <head>
      <title>Kevin's portfolio project</title>
    </head>
    <body>
      <section id="about">
        <h1 class="title">About Me</h1>
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
                Experience <br />
                Experience <br />
                Experience <br />
              </p>
            </div>
          </div>
        </div>
        <img
          src="./assets/arrow.png"
          alt="Arrow icon"
          class="icon arrow"
          onclick="location.href='.#experience'"
        />
      </section>
    </body>
  `,
  styleUrls: [
    './about.component.scss',
    '../global/global-styles.component.scss',
    '../global/media-queries.component.scss',
  ],
})
export class KevinAboutComponent {}
