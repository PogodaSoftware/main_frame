import { Component } from '@angular/core';
import { KevinNavigationComponent } from '../navigation/navigation.component';
import { KevinGlobalService } from '../global/global.service';
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
      <section id="profile">
        <div class="section-picture-container">
          <img
            src="./assets/professional-picture.jpg"
            alt="kevin ortiz profile picture"
          />
        </div>

        <h1 class="title">Kevin Ortiz</h1>
        <div class="section-text">
          <p class="section-text-p2">Quality Assurance & DevOps Engineer</p>
          <div class="btn-container">
            <button
              class="btn btn-color-2"
              (click)="
                kevinGlobalService.openPage('./assets/Ortiz_Kevin_Resume.pdf')
              "
            >
              Download CV
            </button>

            <button
              class="btn btn-color-2"
              onclick="location.href='./kevin/contacts'"
            >
              Contact Me
            </button>
          </div>

          <div id="socials-container">
            <img
              src="./assets/linkedin.png"
              alt="My LinkedIn profile"
              class="icon"
              (click)="
                kevinGlobalService.openPage(
                  'https://www.linkedin.com/in/kevino73/'
                )
              "
            />

            <img
              src="./assets/github.png"
              alt="My GitHub profile"
              class="icon"
              (click)="
                kevinGlobalService.openPage('https://github.com/kevinortiz43')
              "
            />
          </div>
        </div>
      </section>
      <app-footer></app-footer>
    </body>
  `,
  styleUrls: ['./home.component.scss', '../global/global.component.scss'],
})
export class KevinHomeComponent {
  constructor(public kevinGlobalService: KevinGlobalService) {}
}
