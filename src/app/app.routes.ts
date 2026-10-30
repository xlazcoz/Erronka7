import { Routes } from '@angular/router';
import { Erabiltzaileak } from './erabiltzaileak/erabiltzaileak';
import { Kargaguneak } from './kargaguneak/kargaguneak';
import { Powerbanks } from './powerbanks/powerbanks';
import { Erreserbak } from './erreserbak/erreserbak';

export const routes: Routes = [
    {
        path: 'erabiltzaileak',
        component: Erabiltzaileak
    },
    {
        path: 'kargaguneak',
        component: Kargaguneak
    },
    {
        path: 'powerbanks',
        component: Powerbanks
    },
    {
        path: 'erreserbak',
        component: Erreserbak
    }
];
