import { Component } from '@angular/core';
import { KevinNavigationComponent } from '../navigation/navigation.component';

@Component({
  selector: 'app-projects',
  imports: [KevinNavigationComponent],
  template: `
    <body>
      <app-navigation></app-navigation>
    </body>
  `,
  styleUrl: './projects.component.scss',
})
export class KevinProjectsComponent {}
