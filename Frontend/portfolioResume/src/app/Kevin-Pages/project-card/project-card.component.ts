/**
 * ProjectCardComponent — reusable project card.
 *
 * Renders a project's three.js thumb (via ProjectThumbComponent), name, tag,
 * description, and link buttons. The "view" link routes the user to the
 * full-screen viewer at /kevin/blender-projects with the project's
 * camera + HDR config from kevin-data.ts. The "code" link opens the source
 * repo. Used by both the home page projects grid and the standalone
 * /kevin/projects page so they stay in sync from a single PROJECTS list.
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project, ProjectLink } from '../global/kevin-data';
import { ProjectThumbComponent } from '../project-thumb/project-thumb.component';
import { KevinGlobalService } from '../global/global.service';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [CommonModule, ProjectThumbComponent],
  template: `
    <article class="project-card">
      <div class="project-thumb">
        <app-project-thumb [project]="project" class="project-thumb-inner"></app-project-thumb>
        <span class="project-thumb-tag">
          <span class="dot" [style.background]="project.accent"></span>
          {{ project.tag }}
        </span>
      </div>
      <div class="project-body">
        <h3 class="project-name">{{ project.name }}</h3>
        <p class="project-desc">{{ project.desc }}</p>
        <div class="project-links">
          <button
            *ngFor="let l of project.links"
            type="button"
            class="project-link"
            [class.primary]="l.primary"
            (click)="onLink(l)"
          >
            {{ l.label }}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M7 17 17 7"/><path d="M7 7h10v10"/>
            </svg>
          </button>
        </div>
      </div>
    </article>
  `,
  styleUrl: './project-card.component.scss',
})
export class ProjectCardComponent {
  @Input({ required: true }) project!: Project;

  constructor(private global: KevinGlobalService) {}

  onLink(link: ProjectLink): void {
    if (link.kind === 'view' || link.kind === 'live') {
      this.openView3D();
    } else if (link.kind === 'code') {
      this.global.openPage('https://github.com/PogodaSoftware/main_frame');
    } else if (link.href) {
      this.global.openPage(link.href);
    }
  }

  private openView3D(): void {
    const v = this.project.viewer;
    const params = new URLSearchParams({
      model: this.project.model,
      helpers: 'false',
      color: 'black',
      cameraX: String(v?.cameraX ?? 0),
      cameraY: String(v?.cameraY ?? 0),
      cameraZ: String(v?.cameraZ ?? 4),
      hdrPath: v?.hdrPath ?? '',
    });
    this.global.openPage(`/kevin/blender-projects?${params.toString()}`);
  }
}
