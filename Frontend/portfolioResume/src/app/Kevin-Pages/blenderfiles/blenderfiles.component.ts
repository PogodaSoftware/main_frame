/**
 * Kevin Ortiz Blender Files Viewer Component
 *
 * Full-screen 3D model viewer for Kevin's Blender projects. Reads model
 * configuration from URL query parameters and renders the specified .glb
 * model using Three.js via the KevinGlobalService. This component is
 * used as the "Live Demo" destination from the Projects page.
 *
 * Query Parameters:
 *   - model: Name of the .glb model file (default: 'snowman')
 *   - helpers: Show Three.js debug helpers (default: false)
 *   - color: Background color of the canvas (default: 'black')
 *   - cameraX/Y/Z: Initial camera position coordinates (default: 0)
 *   - hdrPath: HDR environment map filename (optional)
 *
 * Route: /kevin/blender-projects
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { KevinGlobalService } from '../global/global.service';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-blenderfiles',
  template: `
    <canvas id="canvas"></canvas>
  `,
  styleUrls: ['./blenderfiles.component.scss'],
})
export class KevinBlenderFilesComponent implements OnInit {
  /** Subscription to route query parameters, cleaned up on destroy. */
  private routeSub?: Subscription;

  /**
   * @param kevinGlobalService - Service that builds Three.js 3D model viewers.
   * @param route - Angular's ActivatedRoute for reading URL query parameters.
   */
  constructor(
    private kevinGlobalService: KevinGlobalService,
    private route: ActivatedRoute
  ) {}

  /**
   * Subscribes to route query parameters and initializes the 3D model
   * viewer with the specified configuration. Extracts model name, camera
   * position, background color, and HDR path from URL parameters.
   */
  ngOnInit(): void {
    this.routeSub = this.route.queryParams.subscribe((params) => {
      const model = params['model'] || 'snowman';
      const helpers = params['helpers'] === 'true';
      const color = params['color'] || 'black';
      const cameraX = Number(params['cameraX']) || 0;
      const cameraY = Number(params['cameraY']) || 0;
      const cameraZ = Number(params['cameraZ']) || 0;
      const hdrPath = params['hdrPath'] || '';

      this.kevinGlobalService.threeDimensionModelBuilder(
        'canvas',
        model,
        helpers,
        color,
        cameraX,
        cameraY,
        cameraZ,
        1,
        1,
        hdrPath 
      );
    });
  }
}
