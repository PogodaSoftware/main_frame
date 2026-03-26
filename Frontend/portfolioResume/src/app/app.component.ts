/**
 * Root Application Component
 *
 * The top-level component that serves as the shell for the entire Angular app.
 * Contains only the <router-outlet> directive, which dynamically renders
 * page components based on the current URL route. All page navigation
 * is handled by Angular's router (configured in app.routes.ts).
 */

import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  /** Application title identifier used internally by Angular. */
  title = 'portfolioResumeFrontend';
}
