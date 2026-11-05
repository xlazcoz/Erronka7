import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('administrazio-atala');
  protected readonly auth = inject(AuthService);
  protected readonly menuaZabalik = signal(false);

  private router = inject(Router);

  menuaAldatu(): void {
    this.menuaZabalik.update((zabalik) => !zabalik);
  }

  itxiMenua(): void {
    this.menuaZabalik.set(false);
  }

  saioaItxi(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/saioa-hasi']),
      error: () => this.router.navigate(['/saioa-hasi']),
    });
  }
}
