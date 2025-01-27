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
        <p class="section-text-p1">Get to know more</p>
        <h1 class="title">About Me</h1>
        <div class="section-container">
          <div class="section-picture-container">
          <img
            src="./assets/professional-picture.jpg"
              alt="profile picture"
              class="about-picture"
            />
          </div>
        </div>
        <div class="about-details-container">
          <div class="about-containers">
            <div class="details-container">
              <img
                src="./assets/experience.png"
                alt="Experience icon"
                class="icon"
              />
            </div>
          </div>
        </div>
      </section>
    </body>
  `,
  styleUrl: './about.component.scss'
})
export class KevinAboutComponent {

}
