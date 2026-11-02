import { Component } from '@angular/core';
import { Taula } from '../taula/taula';
import { HubTranslationService } from 'ng-hub-ui-paginable';

@Component({
  imports: [Taula],
  providers: [HubTranslationService],
  selector: 'app-erreserbak',
  styleUrl: './erreserbak.css',
  templateUrl: './erreserbak.html',
})
export class Erreserbak {}
