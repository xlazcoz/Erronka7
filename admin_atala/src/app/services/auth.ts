import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, catchError, of, shareReplay, switchMap, tap } from 'rxjs';
import { Api, Erabiltzailea, Login, Register } from './api';

export const ROL_ETIKETAK: Record<string, string> = {
  user: 'Erabiltzaile arrunta',
  udalerri_admin: 'Udalerriko administratzailea',
  admin: 'Administratzaile orokorra',
};

export function rolaEtiketa(rola?: string | null): string {
  return rola ? (ROL_ETIKETAK[rola] ?? rola) : '-';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiService = inject(Api);
  private sessionRequest$?: Observable<Erabiltzailea | null>;

  currentUser = signal<Erabiltzailea | null>(null);
  sessionReady = signal(false);
  isLoggedIn = computed(() => this.currentUser() !== null);
  isAdmin = computed(() =>
    ['admin', 'udalerri_admin'].includes(this.currentUser()?.rola ?? ''),
  );
  isSuperadmin = computed(() => this.currentUser()?.rola === 'admin');
  udalerriaId = computed(() => this.currentUser()?.udalerria_id ?? null);

  rolaEtiketa(rola?: string | null): string {
    return rolaEtiketa(rola);
  }

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
