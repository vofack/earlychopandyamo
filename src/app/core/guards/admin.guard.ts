import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, of, take, timeout } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Au-delà de ce délai, on considère que Firebase Auth ne répondra pas.
 * Sans cette borne, une configuration Firebase absente ou une panne réseau
 * bloquerait la navigation indéfiniment : le routeur n'activerait aucune
 * route et l'utilisateur resterait devant une page blanche, sans message.
 */
const AUTH_TIMEOUT_MS = 5000;

/**
 * Protège tout l'espace /admin.
 *
 * Deux pièges classiques d'AngularFire sont traités ici :
 *
 * 1. `authState()` n'émet jamais de complétion. Sans `take(1)`, le garde
 *    resterait en attente indéfiniment et la navigation ne se résoudrait pas.
 *
 * 2. Firebase émet `null` avant d'avoir restauré la session depuis IndexedDB.
 *    Un `take(1)` posé seul attraperait ce `null` initial et redirigerait un
 *    administrateur pourtant connecté vers l'écran de login à chaque F5.
 *    D'où l'attente préalable sur `resolved`, qui ne passe à `true` qu'une
 *    fois le premier verdict réel rendu.
 */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return toObservable(auth.resolved).pipe(
    filter(Boolean),
    take(1),
    // En cas d'expiration, on échoue *fermé* : redirection vers le login
    // plutôt que d'accorder l'accès. C'est le seul choix sûr pour un garde.
    timeout({ first: AUTH_TIMEOUT_MS, with: () => of(false) }),
    map((resolved) =>
      // Depuis l'ouverture des comptes clients, « connecté » ne suffit plus :
      // on exige `isAdmin()`. Un client Google connecté n'accède donc pas à
      // l'admin. Le crédit d'écriture est de toute façon refusé par les
      // règles Firestore — mais bloquer la route évite d'afficher une
      // interface admin vide et déroutante.
      resolved && auth.isAdmin()
        ? true
        : // `returnUrl` renvoie l'admin là où il voulait aller après
          // connexion, plutôt que systématiquement au tableau de bord.
          router.createUrlTree(['/admin/login'], {
            queryParams: { returnUrl: state.url },
          }),
    ),
  );
};
