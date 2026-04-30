/**
 * Kevin Ortiz Projects Page Component
 *
 * Standalone /kevin/projects page. Renders the same PROJECTS list and
 * ProjectCardComponent the home page uses, so adding a project in
 * kevin-data.ts updates both surfaces with no further edits.
 *
 * Route: /kevin/projects
 */

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KevinNavigationComponent } from '../navigation/navigation.component';
import { KevinFooterComponent } from '../footer/footer.component';
import { ProjectCardComponent } from '../project-card/project-card.component';
import { PROJECTS } from '../global/kevin-data';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, KevinNavigationComponent, KevinFooterComponent, ProjectCardComponent],
  template: `
    <app-navigation></app-navigation>
    <section class="section" id="projects">
      <div class="shell">
        <div class="section-head">
          <span class="section-num">04 · Projects</span>
          <h2 class="section-title">Browse my projects.</h2>
          <p class="section-sub">Every Blender piece in one place. Click "View 3D" to open it in the interactive viewer.</p>
        </div>
        <div class="projects-grid">
          <app-project-card *ngFor="let p of projects" [project]="p"></app-project-card>
        </div>
      </div>
    </section>
    <app-footer></app-footer>
  `,
  styleUrls: ['./projects.component.scss'],
})
export class KevinProjectsComponent {
  readonly projects = PROJECTS;
}
