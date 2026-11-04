import { Component } from '@angular/core';
import { HubTranslationService } from 'ng-hub-ui-paginable';
import { ErreserbenTaula } from '../erreserben-taula/erreserben-taula';

@Component({
  imports: [ErreserbenTaula],
  providers: [HubTranslationService],
  selector: 'app-erreserbak',
  styleUrl: './erreserbak.css',
  templateUrl: './erreserbak.html',
})
export class Erreserbak {}
