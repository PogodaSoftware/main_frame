import { Component, OnInit } from '@angular/core';
import { KevinNavigationComponent } from '../navigation/navigation.component';
import { KevinGlobalService } from '../global/global.service';
import { KevinFooterComponent } from '../footer/footer.component';
import { NgFor } from '@angular/common';

interface Project {
  id: string;
  title: string;
  model: string;
  camera: { x: number; y: number; z: number };
  hdrPath?: string;
  altText?: string;
}

@Component({
  selector: 'app-projects',
  template: `
    <body>
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
    </body>
  `,
  styleUrls: ['./projects.component.scss', '../global/global.component.scss'],
  imports: [KevinNavigationComponent, KevinFooterComponent, NgFor],
  standalone: true
})
export class KevinProjectsComponent implements OnInit {
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

  constructor(public kevinGlobalService: KevinGlobalService) {}

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

  openGitHub(): void {
    this.kevinGlobalService.openPage('https://github.com/PogodaSoftware/main_frame');
  }

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