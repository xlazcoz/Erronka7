import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  imports: [FormsModule],
  selector: 'app-erregistratu',
  styleUrl: './erregistratu.css',
  templateUrl: './erregistratu.html',
})
export class Erregistratu {
  private auth = inject(AuthService);
  private router = inject(Router);

  register = {
    izena: '',
    login_email: '',
    login_pasahitza: '',
  };

  errorea = '';
  kargatzen = false;

  erregistratuErab(): void {
    this.errorea = '';
    this.kargatzen = true;

    this.auth.erregistratu(this.register).subscribe({
      next: () => {
        this.kargatzen = false;
        this.router.navigate(['/kargaguneak']);
      },
      error: (err) => {
        this.kargatzen = false;
        if (err.status === 409) {
          this.errorea = 'Emaila erregistratuta dago. Saioa hasi behar duzu.';
        } else if (err.status === 422) {
          this.errorea = 'Datuak ez dira zuzenak. Berrikusi formularioa.';
        } else {
          this.errorea = 'Errorea gertatu da erregistratzean.';
        }
      },
    });
  }
}
