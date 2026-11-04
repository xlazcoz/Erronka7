import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  imports: [FormsModule],
  selector: 'app-saioa-hasi',
  styleUrl: './saioa-hasi.css',
  templateUrl: './saioa-hasi.html',
})
export class SaioaHasi {
  private auth = inject(AuthService);
  private router = inject(Router);

  login = {
    login_email: '',
    login_pasahitza: '',
  };

  errorea = '';
  kargatzen = false;

  saioaHasi(): void {
    this.errorea = '';
    this.kargatzen = true;

    this.auth.login(this.login).subscribe({
      next: () => {
        this.kargatzen = false;
        this.router.navigate(['/kargaguneak']);
      },
      error: (err) => {
        this.kargatzen = false;
        this.errorea =
          err.status === 401
            ? 'Emaila edo pasahitza ez da zuzena.'
            : 'Errorea gertatu da saioa hastean.';
      },
    });
  }
}
