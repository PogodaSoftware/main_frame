import { Routes } from '@angular/router';
import { KevinHomeComponent } from './Kevin-Pages/home/home.component';
import { KevinAboutComponent } from './Kevin-Pages/about/about.component';
import { KevinExperienceComponent } from './Kevin-Pages/experience/experience.component';
import { PogodaHomeComponent } from './Pogoda-Software-Pages/home/home.component';

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
    path: 'pogoda',
    component: PogodaHomeComponent,
  },
];
