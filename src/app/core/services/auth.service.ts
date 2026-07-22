import { computed, inject, Injectable, signal } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from '@angular/fire/auth';
import { environment } from '../../../environments/environment';

/** Codes d'erreur Firebase Auth remontés à l'écran de connexion. */
export type LoginError =
  | 'invalid'
  | 'tooMany'
  | 'popupClosed'
  | 'notEnabled'
  | 'unauthorizedDomain'
  | 'popupBlocked'
  | 'unknown';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);

  private readonly _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();

  /**
   * Passe à `true` au tout premier verdict de Firebase, qu'il y ait un
   * utilisateur ou non. Pièce maîtresse des gardes de route : Firebase émet
   * toujours `null` avant de restaurer la session ; sans ce drapeau, un garde
   * éjecterait un utilisateur pourtant connecté à chaque rafraîchissement.
   */
  private readonly _resolved = signal(false);
  readonly resolved = this._resolved.asReadonly();

  readonly isLoggedIn = computed(() => this._user() !== null);

  /**
   * Statut administrateur.
   *
   * Déterminé par comparaison de l'UID avec `environment.adminUid`, qui doit
   * être identique à `primaryAdminUid()` dans firestore.rules. Depuis
   * l'ouverture de Google Sign-In au public, « être connecté » ne suffit
   * PLUS à être admin — d'où ce test explicite. (Le support de comptes
   * « personnel » additionnels via la collection `admins` est prévu côté
   * règles ; l'app pourra l'exploiter plus tard sans changer ce contrat.)
   */
  readonly isAdmin = computed(() => {
    const u = this._user();
    return !!u && u.uid === environment.adminUid;
  });

  constructor() {
    // Callback brut du SDK : en zoneless il ne déclenche aucune détection de
    // changement, d'où l'écriture dans des signals qui, eux, la planifient.
    onAuthStateChanged(this.auth, (user) => {
      this._user.set(user);
      this._resolved.set(true);
    });
  }

  /** Connexion administrateur (email/mot de passe). */
  async signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email.trim(), password);
  }

  /**
   * Connexion / inscription client via Google.
   *
   * Un même compte Google donne toujours le même UID Firebase : l'unicité des
   * comptes est donc garantie nativement par Firebase Auth, sans dédoublonnage
   * à notre charge. La création du profil `users/{uid}` est gérée par
   * AccountService, qui réagit au changement d'état d'authentification.
   */
  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    // Force le choix du compte à chaque fois : évite qu'un appareil partagé
    // reconnecte silencieusement le compte précédent.
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(this.auth, provider);
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }

  /** Envoie un courriel de réinitialisation de mot de passe (admin). */
  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(this.auth, email.trim());
  }

  /** Traduit un code Firebase en clé de message affichable. */
  mapError(error: unknown): LoginError {
    const code = (error as { code?: string } | null)?.code ?? '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-email':
        return 'invalid';
      case 'auth/too-many-requests':
        return 'tooMany';
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
      case 'auth/user-cancelled':
        return 'popupClosed';
      case 'auth/popup-blocked':
        return 'popupBlocked';
      // Provider Google pas activé dans la console Firebase.
      case 'auth/operation-not-allowed':
        return 'notEnabled';
      // Le domaine (ex. earlychopandyamo.web.app) n'est pas dans la liste des
      // domaines autorisés d'Authentication → Settings.
      case 'auth/unauthorized-domain':
        return 'unauthorizedDomain';
      default:
        return 'unknown';
    }
  }
}
