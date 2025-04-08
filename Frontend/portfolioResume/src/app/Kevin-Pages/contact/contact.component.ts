import { Component } from '@angular/core';
import { KevinNavigationComponent } from '../navigation/navigation.component';
import { KevinGlobalService } from '../global/global.service';
import { KevinFooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-contact',
  imports: [KevinNavigationComponent, KevinFooterComponent],
  template: `
    <body>
      <app-navigation></app-navigation>

      <section id="contact">
        <h1 class="title">Contact Me</h1>
        <div class="contact-info-upper-container">
          <div class="contact-info-container">
            <img
              src="./assets/email.png"
              alt="email icon"
              class="icon"
            />
            <p>
              <a href="mailto:kevin.ortiz.software@gmail.com"
                >kevin.ortiz.software&#64;gmail.com</a
              >
            </p>
          </div>

          <div class="contact-info-container">
            <img
              src="./assets/linkedin.png"
              alt="LinkedIn icon"
              class="icon"
              (click)="
                kevinGlobalService.openPage(
                  'https://www.linkedin.com/in/kevino73/'
                )
              "
            />

            <p>
              <a
                (click)="
                  kevinGlobalService.openPage(
                    'https://www.linkedin.com/in/kevino73/'
                  )
                "
                >LinkedIn</a
              >
            </p>
          </div>
        </div>
      </section>
      <app-footer></app-footer>
    </body>
  `,

  styleUrls: ['./contact.component.scss', '../global/global.component.scss'],
})
export class KevinContactComponent {
  constructor(public kevinGlobalService: KevinGlobalService) {}
}
