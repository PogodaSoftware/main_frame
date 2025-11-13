import { Component } from '@angular/core';
import { PogodaNavigationComponent } from '../navigation/navigation.component';
import { PogodaFooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-pogoda-home',
  imports: [PogodaNavigationComponent, PogodaFooterComponent],
  template: `
    <app-pogoda-navigation></app-pogoda-navigation>
    
    <section id="profile">
      <div class="section-container">
        <div class="section-text">
          <p class="section-text-p1">Welcome to</p>
          <h1 class="title">Pogoda Software</h1>
          <p class="section-text-p2">Professional Software Solutions</p>
          <div class="btn-container">
            <button class="btn btn-color-2" (click)="navigateToExperience()">
              View Experience
            </button>
            <button class="btn btn-color-1" (click)="navigateToKevin()">
              Kevin's Portfolio
            </button>
          </div>
          <div class="socials-container">
            <a href="https://www.linkedin.com/in/jaroslaw-pogoda/" target="_blank" rel="noopener noreferrer">
              <img src="./assets/linkedin.png" alt="LinkedIn profile" class="icon" />
            </a>
          </div>
        </div>
        <div class="section-pic-container">
          <div class="profile-placeholder">
            <p>Professional Profile</p>
          </div>
        </div>
      </div>
    </section>
    
    <app-pogoda-footer></app-pogoda-footer>
  `,
  styleUrls: ['./home.component.scss', '../../Kevin-Pages/global/global.component.scss'],
})
export class PogodaHomeComponent {
  navigateToExperience(): void {
    window.location.href = 'pogoda/experience';
  }

  navigateToKevin(): void {
    window.location.href = 'kevin';
  }
}
