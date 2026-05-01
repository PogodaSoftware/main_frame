import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-marquee',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="marquee" aria-hidden="true">
      <div class="marquee-track">
        <span><span *ngFor="let w of marqueeWords">{{ w }}</span></span>
        <span><span *ngFor="let w of marqueeWords">{{ w }}</span></span>
      </div>
    </div>
  `,
  styleUrls: ['./marquee.component.scss']
})
export class MarqueeComponent {
  readonly marqueeWords = [
    'DevOps',
    'Quality Assurance',
    'Three.js',
    'Kubernetes',
    'Selenium',
    'Terraform',
    'Blender',
    'React',
    'Playwright',
  ];
}
