import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth';

@Component({
  imports: [RouterOutlet, RouterLink],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('administrazio-atala');
  protected readonly auth = inject(AuthService);

  private router = inject(Router);

  saioaItxi(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/saioa-hasi']),
      error: () => this.router.navigate(['/saioa-hasi']),
    });
  }
}
