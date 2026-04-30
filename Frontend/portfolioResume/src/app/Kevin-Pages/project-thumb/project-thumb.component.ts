/**
 * ProjectThumbComponent — small project card thumbnail.
 * Delegates to KevinModelCanvasComponent (no orbit controls, self-rotates).
 */

import { Component, Input } from '@angular/core';
import { Project } from '../global/kevin-data';
import { KevinModelCanvasComponent } from '../global/model-canvas.component';

@Component({
  selector: 'app-project-thumb',
  standalone: true,
  imports: [KevinModelCanvasComponent],
  template: `
    <app-model-canvas
      [project]="project"
      [orbitControls]="false"
      [cameraPos]="[4.5, 2.4, 4.5]"
      [fov]="35"
      [fitScale]="2.6"
      [selfRotateSpeed]="0.005"
    ></app-model-canvas>
  `,
  styleUrl: './project-thumb.component.scss',
})
export class ProjectThumbComponent {
  @Input({ required: true }) project!: Project;
}
