import { computed, effect, inject, Injectable } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  doc,
  docData,
  Firestore,
  getDoc,
  serverTimestamp,
  setDoc,
} from '@angular/fire/firestore';
import { Observable, of, switchMap } from 'rxjs';

import {
  freeMealsAvailable,
  generateReferralCode,
  pointsToNextMeal,
  UserProfile,
} from '../../shared/models/user.model';
import { AuthService } from './auth.service';
import { SettingsService } from './settings.service';

const REF_STASH_KEY = 'ecy.ref';

/**
 * Compte client : profil, points, code de parrainage.
 *
 * Distinct d'AuthService (qui ne gère que l'état d'authentification Firebase),
 * ce service possède le document `users/{uid}` et toute la logique de
 * parrainage CÔTÉ CLIENT (création du profil, génération du code, résolution
 * du parrain). La logique de CRÉDIT des points est ailleurs (LoyaltyService,
 * exécuté par l'admin) : un client ne peut pas écrire ses propres points.
 */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(AuthService);
  private readonly settings = inject(SettingsService);

  /**
   * Profil en temps réel, ou `undefined` si déconnecté / pas encore chargé.
   *
   * `switchMap` sur l'utilisateur courant : à la déconnexion, l'abonnement au
   * document précédent est automatiquement résilié.
   */
  private readonly profile$ = toSignal(
    toObservable(this.auth.user).pipe(
      switchMap((user) =>
        user
          ? (docData(doc(this.firestore, 'users', user.uid)) as Observable<
              UserProfile | undefined
            >)
          : of(undefined),
      ),
    ),
    { initialValue: undefined },
  );

  readonly profile = computed<UserProfile | null>(() => this.profile$() ?? null);

  readonly points = computed(() => this.profile()?.points ?? 0);

  readonly referralCode = computed(() => this.profile()?.referralCode ?? '');

  readonly referralLink = computed(() => {
    const code = this.referralCode();
    return code ? `${location.origin}/?ref=${code}` : '';
  });

  readonly freeMeals = computed(() =>
    freeMealsAvailable(this.points(), this.settings.settings().referral.pointsForFreeMeal),
  );

  readonly pointsToNext = computed(() =>
    pointsToNextMeal(this.points(), this.settings.settings().referral.pointsForFreeMeal),
  );

  /** Garde-fou : empêche de tenter plusieurs créations de profil en parallèle. */
  private creating = false;

  constructor() {
    // Crée le profil à la première connexion. Un effect qui déclenche une
    // écriture est acceptable ici car protégé par `creating` et par le test
    // « profil absent » : il ne s'exécute qu'une fois, à l'inscription.
    effect(() => {
      const user = this.auth.user();
      const profile = this.profile$(); // undefined = en cours OU inexistant
      if (user && profile === undefined && !this.creating) {
        void this.ensureProfile();
      }
    });
  }

  /** Mémorise un code de parrainage venu de `?ref=` avant même la connexion. */
  stashReferral(code: string): void {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    try {
      localStorage.setItem(REF_STASH_KEY, clean);
    } catch {
      /* navigation privée : sans gravité, le parrainage sera simplement perdu */
    }
  }

  /**
   * Crée `users/{uid}` s'il n'existe pas déjà.
   *
   * Le `getDoc` préalable distingue « document en cours de chargement » (où
   * l'effect ne doit rien faire de destructeur) de « document réellement
   * absent » (première connexion → création).
   */
  private async ensureProfile(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    this.creating = true;
    try {
      const ref = doc(this.firestore, 'users', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) return; // profil déjà là : rien à faire

      const referralCode = await this.reserveUniqueCode(user.uid);
      const referredBy = await this.resolveReferrer(user.uid);

      const newProfile: Omit<UserProfile, 'createdAt'> = {
        uid: user.uid,
        email: user.email ?? '',
        displayName: user.displayName ?? '',
        photoURL: user.photoURL ?? '',
        referralCode,
        referredBy,
        referrerCredited: false,
        points: 0,
        firstOrderDelivered: false,
        welcomePerkUsed: false,
        ordersCount: 0,
        totalSpent: 0,
      };

      await setDoc(ref, { ...newProfile, createdAt: serverTimestamp() });
      this.clearStash();
    } catch (error) {
      console.error('[account] création du profil échouée', error);
    } finally {
      this.creating = false;
    }
  }

  /**
   * Génère un code de parrainage et réserve son mapping `referralCodes/{code}`.
   * Réessaie en cas de collision (rare : ~30^6 combinaisons).
   */
  private async reserveUniqueCode(uid: string): Promise<string> {
    for (let attempt = 0; attempt < 6; attempt++) {
      const code = generateReferralCode();
      const ref = doc(this.firestore, 'referralCodes', code);
      const existing = await getDoc(ref);
      if (existing.exists()) continue; // collision : on régénère

      await setDoc(ref, { uid });
      return code;
    }
    // Repli extrêmement improbable : on suffixe avec un fragment d'UID.
    const fallback = generateReferralCode() + uid.slice(0, 2).toUpperCase();
    await setDoc(doc(this.firestore, 'referralCodes', fallback), { uid });
    return fallback;
  }

  /**
   * Résout le code stashé en `referredBy`, en refusant l'auto-parrainage.
   * Retourne `null` si aucun code valide.
   */
  private async resolveReferrer(uid: string): Promise<string | null> {
    let code: string | null = null;
    try {
      code = localStorage.getItem(REF_STASH_KEY);
    } catch {
      return null;
    }
    if (!code) return null;

    const snap = await getDoc(doc(this.firestore, 'referralCodes', code));
    if (!snap.exists()) return null;

    const referrerUid = (snap.data() as { uid?: string }).uid;
    // Auto-parrainage refusé : un compte ne peut pas être son propre parrain.
    if (!referrerUid || referrerUid === uid) return null;

    return code;
  }

  private clearStash(): void {
    try {
      localStorage.removeItem(REF_STASH_KEY);
    } catch {
      /* sans gravité */
    }
  }
}
