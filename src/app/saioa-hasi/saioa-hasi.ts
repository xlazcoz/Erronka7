import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Component({
  imports: [FormsModule],
  selector: 'app-saioa-hasi',
  styleUrl: './saioa-hasi.css',
  templateUrl: './saioa-hasi.html',
})
export class SaioaHasi implements OnInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  login = {
    login_email: '',
    login_pasahitza: '',
  };

  errorea = '';
  kargatzen = false;
  private returnUrl = '/kargaguneak';

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.returnUrl = params.get('returnUrl') || '/kargaguneak';

    this.auth.ensureSession().subscribe({
      next: (erabiltzailea) => {
        const motivos = params.get('motivo');

        if (!erabiltzailea) {
          if (['admin', 'superadmin'].includes(motivos ?? '')) {
            this.errorea = 'Ez duzu administratzaile baimenik panel honetara sartzeko.';
          }
          return;
        }

        const administratzailea = ['admin', 'superadmin'].includes(erabiltzailea.rola);

        if (motivos === 'superadmin' && erabiltzailea.rola !== 'superadmin') {
          this.errorea = 'Atal hau administratzaile orokorrentzat da.';
          if (administratzailea) {
            this.router.navigateByUrl('/kargaguneak');
          } else {
            this.auth.logout().subscribe();
          }
          return;
        }

        if (administratzailea) {
          this.router.navigateByUrl(this.returnUrl);
          return;
        }

        this.errorea = 'Ez duzu administratzaile baimenik panel honetara sartzeko.';
        this.auth.logout().subscribe();
      },
      error: () => {
        this.errorea = 'Errorea gertatu da saioa egiaztatzean.';
      },
    });
  }

  saioaHasi(): void {
    this.errorea = '';
    this.kargatzen = true;

    this.auth.login(this.login).subscribe({
      next: (erabiltzailea) => {
        this.kargatzen = false;

        if (!['admin', 'superadmin'].includes(erabiltzailea.rola)) {
          this.errorea = 'Ez duzu administratzaile baimenik panel honetara sartzeko.';
          this.auth.logout().subscribe();
          return;
        }

        this.router.navigateByUrl(this.returnUrl);
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
