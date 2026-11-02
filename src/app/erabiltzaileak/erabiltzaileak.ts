import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { Taula } from '../taula/taula';
import { HubTranslationService } from 'ng-hub-ui-paginable';
import { Desplegable } from '../desplegable/desplegable';
import { Api } from '../services/api';

@Component({
  imports: [Taula, Desplegable],
  selector: 'app-erabiltzaileak',
  styleUrl: './erabiltzaileak.css',
  templateUrl: './erabiltzaileak.html',
})
export class Erabiltzaileak{}
