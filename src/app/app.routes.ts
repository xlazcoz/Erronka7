import { Routes } from '@angular/router';
import { Kargaguneak } from './kargaguneak/kargaguneak';
import { Powerbanks } from './powerbanks/powerbanks';
import { Erreserbak } from './erreserbak/erreserbak';
import { Udalerriak } from './udalerriak/udalerriak';
import { SaioaHasi } from './saioa-hasi/saioa-hasi';
import { adminGuard } from './admin.guard';
import { superadminGuard } from './superadmin.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'saioa-hasi',
        pathMatch: 'full'
    },
    {
        path: 'erabiltzaileak',
        loadComponent: () =>
            import('./erabiltzaileak/erabiltzaileak').then((m) => m.Erabiltzaileak),
        canActivate: [superadminGuard]
    },
    {
        path: 'udalerriak',
        component: Udalerriak,
        canActivate: [superadminGuard]
    },
    {
        path: 'kargaguneak',
        component: Kargaguneak,
        canActivate: [adminGuard]
    },
    {
        path: 'powerbanks',
        component: Powerbanks,
        canActivate: [adminGuard]
    },
    {
        path: 'erreserbak',
        component: Erreserbak,
        canActivate: [adminGuard]
    },
    {
        path: 'saioa-hasi',
        component: SaioaHasi
    },
    {
        path: '**',
        redirectTo: 'saioa-hasi'
    }
];
