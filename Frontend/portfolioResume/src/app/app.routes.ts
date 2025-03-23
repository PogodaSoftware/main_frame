import { Routes } from '@angular/router';
import { KevinHomeComponent } from './Kevin-Pages/home/home.component';
import { KevinAboutComponent } from './Kevin-Pages/about/about.component';
import { KevinExperienceComponent } from './Kevin-Pages/experience/experience.component';

import { KevinProjectsComponent } from './Kevin-Pages/projects/projects.component';
import { KevinContactComponent } from './Kevin-Pages/contact/contact.component';
import { KevinBlenderFilesComponent } from './Kevin-Pages/blenderfiles/blenderfiles.component';

import { JPLayoutComponent } from './Pogoda-Software-Pages/layout/layout.component';

export const routes: Routes = [
  {
    path: 'kevin',
    component: KevinHomeComponent,
    title: 'Kevin Home Page',
  },

  {
    path: 'kevin/about',
    component: KevinAboutComponent,
    title: 'Kevin About Page',
  },
  {
    path: 'kevin/experience',
    component: KevinExperienceComponent,
    title: 'Kevin Experience Page',
  },

  {
    path: 'kevin/projects',
    component: KevinProjectsComponent,
    title: 'Kevin Projects Page',
  },
  {
    path: 'kevin/contacts',
    component: KevinContactComponent,
    title: 'Kevin Contact Page',
  },
  {
    path: 'kevin/blender-projects',
    component: KevinBlenderFilesComponent,
  },
  {
    path: 'pogoda',
    component: JPLayoutComponent,
    title: 'Pogoda Software Home Page',
  },
];
