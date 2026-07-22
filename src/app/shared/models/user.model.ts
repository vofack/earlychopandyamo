import { Timestamp } from '@angular/fire/firestore';

/**
 * Profil client (collection Firestore `users/{uid}`).
 *
 * ── Sécurité (voir firestore.rules) ────────────────────────────────────
 * Les champs « valeur » — `points`, `referralCode`, `referredBy`,
 * `firstOrderDelivered`, `welcomePerkUsed` — ne sont JAMAIS modifiables par
 * le client lui-même : seul l'admin (ou la logique de fidélité exécutée dans
 * le navigateur admin) y touche. Le client ne peut écrire que ses champs de
 * profil (displayName, photoURL, fcmToken). C'est ce qui empêche un client de
 * gonfler ses propres points.
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;

  /** Code de parrainage unique, généré à l'inscription. */
  referralCode: string;

  /**
   * Code de parrainage du parrain, figé à l'inscription (jamais modifiable
   * ensuite). `null` si le client n'est venu par aucun lien de parrainage.
   */
  referredBy: string | null;

  /** Le parrain a-t-il déjà été crédité pour la 1re commande de ce filleul ? */
  referrerCredited: boolean;

  /** Source de vérité des récompenses. 1 parrainage livré = `pointsPerReferral`. */
  points: number;

  /** Passe à true à la 1re commande LIVRÉE — verrou d'idempotence du crédit. */
  firstOrderDelivered: boolean;

  /** L'avantage « filleul » (réduction 1re commande) a-t-il été consommé ? */
  welcomePerkUsed: boolean;

  ordersCount: number;
  totalSpent: number;

  /** Réservé à la Phase 2 (push navigateur). */
  fcmToken?: string;

  createdAt?: Timestamp;
}

/**
 * Repas gratuits disponibles, dérivés des points.
 * Un repas coûte `pointsForFreeMeal` points.
 */
export function freeMealsAvailable(points: number, pointsForFreeMeal: number): number {
  if (pointsForFreeMeal <= 0) return 0;
  return Math.floor(points / pointsForFreeMeal);
}

/** Points restants avant le prochain repas gratuit (pour la barre de progression). */
export function pointsToNextMeal(points: number, pointsForFreeMeal: number): number {
  if (pointsForFreeMeal <= 0) return 0;
  const remainder = points % pointsForFreeMeal;
  return remainder === 0 ? pointsForFreeMeal : pointsForFreeMeal - remainder;
}

/**
 * Génère un code de parrainage lisible et sans ambiguïté.
 *
 * Alphabet volontairement restreint : ni 0/O, ni 1/I/L, pour éviter les
 * erreurs de recopie quand le code est dicté à l'oral ou lu sur un écran.
 */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateReferralCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return code;
}
