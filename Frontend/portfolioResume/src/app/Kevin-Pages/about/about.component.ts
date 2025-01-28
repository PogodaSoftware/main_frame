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
                  3+ years <br />
                  Software Developer
                </p>

                <div>
                  <img
                    src="./assets/education.png"
                    alt="Education icon"
                    class="icon"
                  />
                  <h3>Education</h3>
                  <p>
                    Bachelors of Science in Marine Environmental Science<br />
                  </p>
                  <p>Formal training in Software engineering at Perscholas</p>
                </div>
              </div>
            </div>
          </div>
        </div>
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
