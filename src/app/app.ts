import { Component, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Erabiltzaileak } from './erabiltzaileak/erabiltzaileak';
import { Kargaguneak } from './kargaguneak/kargaguneak';
import { Powerbanks } from './powerbanks/powerbanks';
import { Erreserbak } from './erreserbak/erreserbak';

@Component({
  imports: [RouterOutlet, RouterLink, Erabiltzaileak, Kargaguneak, Powerbanks, Erreserbak],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('administrazio-atala');
}
