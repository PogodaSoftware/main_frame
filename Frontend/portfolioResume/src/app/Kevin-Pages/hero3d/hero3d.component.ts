/**
 * Hero3dComponent — large hero stage. Delegates rendering to
 * KevinModelCanvasComponent with OrbitControls + ground enabled.
 */

import { Component, Input } from '@angular/core';
import { Project } from '../global/kevin-data';
import { KevinModelCanvasComponent } from '../global/model-canvas.component';

@Component({
  selector: 'app-hero3d',
  standalone: true,
  imports: [KevinModelCanvasComponent],
  template: `
    <app-model-canvas
      [project]="currentProject()"
      [orbitControls]="true"
      [autoRotate]="autoRotate"
      [ground]="true"
      [cameraPos]="[3.6, 1.6, 3.6]"
      [fov]="45"
      [fitScale]="3.0"
    ></app-model-canvas>
  `,
  styleUrl: './hero3d.component.scss',
})
export class Hero3dComponent {
  @Input() projectIndex = 0;
  @Input() projects: Project[] = [];
  @Input() autoRotate = true;

  currentProject(): Project | null {
    return this.projects[this.projectIndex] ?? this.projects[0] ?? null;
  }
}
