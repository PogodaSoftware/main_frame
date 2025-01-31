import { Component } from '@angular/core';
import { KevinNavigationComponent } from '../navigation/navigation.component';

@Component({
  selector: 'app-contact',
  imports: [KevinNavigationComponent],
  template: ` <app-navigation></app-navigation> `,
  styleUrl: './contact.component.scss',
})
export class KevinContactComponent {}
