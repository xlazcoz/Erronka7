import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from './services/auth';

export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const ukatu = () =>
    router.createUrlTree(['/saioa-hasi'], {
      queryParams: {
        returnUrl: state.url,
        ...(auth.isLoggedIn() ? { motivo: 'admin' } : {}),
      },
    });

  if (auth.sessionReady()) {
    return auth.isAdmin() ? true : ukatu();
  }

  return auth.ensureSession().pipe(
    map(() => (auth.isAdmin() ? true : ukatu())),
  );
};
