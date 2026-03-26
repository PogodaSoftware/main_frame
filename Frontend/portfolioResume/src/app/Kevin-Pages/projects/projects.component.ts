/**
 * Kevin Ortiz Projects Page Component
 *
 * Showcases Kevin's 3D Blender projects rendered interactively using Three.js.
 * Each project is displayed as a card with an embedded WebGL canvas, title,
 * and buttons to view the GitHub repo or launch a live demo. The 3D models
 * are loaded from .glb files using GLTF/DRACO loaders.
 *
 * Projects: Snowman, Shark, Sci-Fi Crate, Gladius
 *
 * Route: /kevin/projects
 */

import { Component, OnInit } from '@angular/core';
import { KevinNavigationComponent } from '../navigation/navigation.component';
import { KevinGlobalService } from '../global/global.service';
import { KevinFooterComponent } from '../footer/footer.component';
import { NgFor } from '@angular/common';

/**
 * Interface defining the configuration for a 3D project card.
 */
interface Project {
  /** Unique HTML canvas element ID for Three.js rendering. */
  id: string;
  /** Display title of the project. */
  title: string;
  /** Filename of the .glb 3D model (without extension). */
  model: string;
  /** Initial camera position for viewing the 3D model. */
  camera: { x: number; y: number; z: number };
  /** Optional HDR environment map filename (without extension). */
  hdrPath?: string;
  /** Optional alt text for accessibility. */
  altText?: string;
}

@Component({
  selector: 'app-projects',
  template: `
    <app-navigation></app-navigation>
    <section id="projects">
      <h1 class="title">Browse my projects</h1>
      <div class="project-details-container">
        <div class="project-containers">
          <div *ngFor="let project of projects" class="details-container color-container">
            <div class="article-container">
              <canvas
                [id]="project.id"
                [attr.alt]="'Model of a ' + project.title.toLowerCase()"
                class="project-image"
              ></canvas>
            </div>
            <h2 class="project-sub-title project-title">{{ project.title }}</h2>
            <div class="btn-container">
              <button
                class="btn btn-color-2 project-btn"
                (click)="openGitHub()"
              >
                GitHub
              </button>
              <button
                class="btn btn-color-2 project-btn"
                (click)="openDemo(project)"
              >
                Live Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
    <app-footer></app-footer>
  `,
  styleUrls: ['./projects.component.scss', '../global/global.component.scss'],
  imports: [KevinNavigationComponent, KevinFooterComponent, NgFor],
  standalone: true
})
export class KevinProjectsComponent implements OnInit {
  /** Array of 3D project configurations to render on the page. */
  projects: Project[] = [
    {
      id: 'snowmanCanvas',
      title: 'Snowman',
      model: 'snowman',
      camera: { x: 0, y: 1, z: 4 },
      hdrPath: 'snowy_hillside_1k'
    },
    {
      id: 'sharkCanvas',
      title: 'Shark',
      model: 'shark',
      camera: { x: 0, y: 0, z: 3.1 }
    },
    {
      id: 'scifiCrateCanvas',
      title: 'Sci-Fi Crate',
      model: 'scifiCrate',
      camera: { x: 0, y: 1, z: 4 },
      hdrPath: 'industrial_sunset_puresky_1k'
    },
    {
      id: 'GladiusCanvas',
      title: 'Gladius',
      model: 'TOC_Gladius',
      camera: { x: 0, y: -1.5, z: 6.5 },
      hdrPath: 'industrial_sunset_puresky_1k'
    }
  ];

  /**
   * @param kevinGlobalService - Shared service for opening URLs and
   *                             building Three.js 3D model viewers.
   */
  constructor(public kevinGlobalService: KevinGlobalService) {}

  /**
   * Initializes 3D model viewers for each project after the view renders.
   * Uses setTimeout(0) to defer execution until canvas elements are
   * available in the DOM after Angular's rendering cycle.
   */
  ngOnInit(): void {
    setTimeout(() => {
      this.projects.forEach(project => 
        this.kevinGlobalService.threeDimensionModelBuilder(
          project.id,
          project.model,
          false,
          'black',
          project.camera.x,
          project.camera.y,
          project.camera.z,
          3,
          2,
          project.hdrPath || ''
        )
      );
    }, 0);
  }

  /**
   * Opens the project's GitHub repository in a new browser tab.
   */
  openGitHub(): void {
    this.kevinGlobalService.openPage('https://github.com/PogodaSoftware/main_frame');
  }

  /**
   * Opens a full-screen live demo of a 3D model in the blender-projects viewer.
   * Passes model configuration as URL query parameters.
   *
   * @param project - The project whose demo should be launched.
   */
  openDemo(project: Project): void {
    const params = new URLSearchParams({
      model: project.model,
      helpers: 'false',
      color: 'black',
      cameraX: project.camera.x.toString(),
      cameraY: project.camera.y.toString(),
      cameraZ: project.camera.z.toString(),
      hdrPath: project.hdrPath || ''
    });
    this.kevinGlobalService.openPage(`kevin/blender-projects?${params}`);
  }
}
