import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
import { Api, Erabiltzailea, Login, Register } from './api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiService = inject(Api);

  currentUser = signal<Erabiltzailea | null>(null);
  isLoggedIn = computed(() => this.currentUser() !== null);
  isAdmin = computed(() => this.currentUser()?.rola === 'admin');

  constructor() {
    this.kargatuSaioa();
  }

  kargatuSaioa(): void {
    this.apiService.getMe().subscribe({
      next: (erabiltzailea) => this.currentUser.set(erabiltzailea),
      error: () => this.currentUser.set(null),
    });
  }

  login(credentials: Login): Observable<Erabiltzailea> {
    return this.apiService.login(credentials).pipe(
      switchMap(() => this.apiService.getMe()),
      tap((erabiltzailea) => this.currentUser.set(erabiltzailea)),
    );
  }

  erregistratu(datuak: Register): Observable<Erabiltzailea> {
    return this.apiService.erregistratu(datuak).pipe(
      switchMap(() =>
        this.login({
          login_email: datuak.login_email,
          login_pasahitza: datuak.login_pasahitza,
        }),
      ),
    );
  }

  logout(): Observable<unknown> {
    return this.apiService.logout().pipe(
      tap(() => this.currentUser.set(null)),
    );
  }
}
