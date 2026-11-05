import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Sesioa iraungitzen denean erabiltzailea saio-hasierara bidaltzen du,
 * APIaren errorea galtzen utzi gabe.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthRequest = req.url.includes('/login');
      const isAlreadyOnLogin = router.url.startsWith('/saioa-hasi');

      if (error.status === 401 && !isAuthRequest && !isAlreadyOnLogin) {
        void router.navigate(['/saioa-hasi'], {
          queryParams: { returnUrl: router.url },
        });
      }

      return throwError(() => error);
    }),
  );
};
