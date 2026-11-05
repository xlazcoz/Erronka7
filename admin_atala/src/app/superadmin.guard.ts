import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from './services/auth';

export const superadminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const ukatu = () =>
    router.createUrlTree(['/saioa-hasi'], {
      queryParams: {
        returnUrl: state.url,
        ...(auth.isLoggedIn() ? { motivo: 'superadmin' } : {}),
      },
    });

  if (auth.sessionReady()) {
    return auth.isSuperadmin() ? true : ukatu();
  }

  return auth.ensureSession().pipe(
    map(() => (auth.isSuperadmin() ? true : ukatu())),
  );
};
