import { Routes } from '@angular/router';
import { KevinHomeComponent } from './Kevin-Pages/home/home.component';
import { JPLayoutComponent } from './Pogoda-Software-Pages/layout/layout.component';

export const routes: Routes = [
    {
        path: 'kevin',
        component: KevinHomeComponent,
        title: 'Kevin Home Page'
    },
    {
        path: 'pogoda',
        component: JPLayoutComponent,
        title: 'Pogoda Software Page'
    }

];
