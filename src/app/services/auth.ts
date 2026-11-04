import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, catchError, of, shareReplay, switchMap, tap } from 'rxjs';
import { Api, Erabiltzailea, Login, Register } from './api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiService = inject(Api);
  private sessionRequest$?: Observable<Erabiltzailea | null>;

  currentUser = signal<Erabiltzailea | null>(null);
  sessionReady = signal(false);
  isLoggedIn = computed(() => this.currentUser() !== null);
  isAdmin = computed(() => this.currentUser()?.rola === 'admin');

  constructor() {
    this.ensureSession().subscribe();
  }

  ensureSession(): Observable<Erabiltzailea | null> {
    if (!this.sessionRequest$) {
      this.sessionRequest$ = this.apiService.getMe().pipe(
        tap((erabiltzailea) => this.setSession(erabiltzailea)),
        catchError(() => {
          this.setSession(null);
          return of(null);
        }),
        shareReplay(1),
      );
    }

    return this.sessionRequest$;
  }

  login(credentials: Login): Observable<Erabiltzailea> {
    return this.apiService.login(credentials).pipe(
      switchMap(() => this.apiService.getMe()),
      tap((erabiltzailea) => this.setSession(erabiltzailea)),
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
      catchError(() => of(null)),
      tap(() => this.setSession(null)),
    );
  }

  private setSession(erabiltzailea: Erabiltzailea | null): void {
    this.currentUser.set(erabiltzailea);
    this.sessionReady.set(true);
    this.sessionRequest$ = of(erabiltzailea);
  }
}
