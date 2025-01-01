import { Routes } from '@angular/router';
import { KevinHomeComponent } from './Kevin-Pages/home/home.component';
import { PogodaHomeComponent } from './Pogoda-Software-Pages/home/home.component';

export const routes: Routes = [
    {
        path: 'kevin',
        component: KevinHomeComponent,
        title: 'Kevin Home Page'
    },
    {
        path: 'pogoda',
        component: PogodaHomeComponent,
    }

];
