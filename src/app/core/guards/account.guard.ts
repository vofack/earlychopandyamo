import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, of, take, timeout } from 'rxjs';
import { AuthService } from '../services/auth.service';

const AUTH_TIMEOUT_MS = 5000;

/**
 * Protège l'espace client `/compte`.
 *
 * Même mécanique que le garde admin (attente de `resolved` pour ne pas
 * éjecter au premier `null`, échec fermé sur expiration), mais ici la
 * condition est simplement « un utilisateur est connecté » — client comme
 * admin. Un visiteur non connecté est renvoyé à l'accueil, où le bouton de
 * connexion Google est disponible dans la navbar.
 */
export const accountGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return toObservable(auth.resolved).pipe(
    filter(Boolean),
    take(1),
    timeout({ first: AUTH_TIMEOUT_MS, with: () => of(false) }),
    map((resolved) => (resolved && auth.isLoggedIn() ? true : router.createUrlTree(['/']))),
  );
};
