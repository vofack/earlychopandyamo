import { inject, Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  Firestore,
  increment,
  orderBy,
  query,
  runTransaction,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

import { Order } from '../../shared/models/order.model';
import { UserProfile } from '../../shared/models/user.model';
import { SettingsService } from './settings.service';

/**
 * Logique de fidélité — exécutée par le navigateur ADMIN.
 *
 * Toutes les écritures ici (points d'un parrain, déduction d'un repas gratuit)
 * touchent des champs « valeur » que les règles Firestore réservent à l'admin.
 * Ce service ne fonctionne donc que depuis un compte administrateur. C'est
 * voulu : un client ne doit jamais pouvoir créditer ses propres points.
 */
@Injectable({ providedIn: 'root' })
export class LoyaltyService {
  private readonly firestore = inject(Firestore);
  private readonly settings = inject(SettingsService);

  /**
   * Applique les effets de fidélité d'une commande LIVRÉE, en une transaction
   * atomique et idempotente.
   *
   * Appelée quand l'admin marque une commande « livrée ». Sûre à rappeler :
   * le drapeau `loyaltySettled` sur la commande garantit qu'un aller-retour
   * de statut ne recrédite jamais deux fois.
   *
   * Effets, tous conditionnels :
   *  - incrémente les stats du client (nb commandes, total dépensé) ;
   *  - marque sa 1re livraison ;
   *  - crédite le PARRAIN (une seule fois, à la 1re commande livrée du filleul) ;
   *  - déduit un repas gratuit si la commande en a utilisé un ;
   *  - marque l'avantage filleul comme consommé le cas échéant.
   */
  async creditForDeliveredOrder(order: Order): Promise<void> {
    const cfg = this.settings.settings().referral;

    await runTransaction(this.firestore, async (tx) => {
      const orderRef = doc(this.firestore, 'orders', order.id);
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists()) return;

      const o = orderSnap.data() as Order;
      // Idempotence + garde : on ne règle qu'une commande livrée, une seule fois.
      if (o.loyaltySettled || o.status !== 'delivered') return;

      const userId = o.userId;

      // Commande invité : rien à créditer, on marque juste comme réglée.
      if (!userId) {
        tx.update(orderRef, { loyaltySettled: true });
        return;
      }

      const userRef = doc(this.firestore, 'users', userId);
      const userSnap = await tx.get(userRef);

      if (!userSnap.exists()) {
        tx.update(orderRef, { loyaltySettled: true });
        return;
      }

      const u = userSnap.data() as UserProfile;

      // ── Lectures d'abord (contrainte Firestore : tous les get avant les
      //    update). On résout le parrain ici, avant toute écriture. ──
      let referrerRef: ReturnType<typeof doc> | null = null;
      let referrerPointsGain = 0;
      const eligibleForReferral =
        cfg.enabled && !!u.referredBy && !u.referrerCredited && !u.firstOrderDelivered;

      if (eligibleForReferral && u.referredBy) {
        const codeSnap = await tx.get(doc(this.firestore, 'referralCodes', u.referredBy));
        if (codeSnap.exists()) {
          const referrerUid = (codeSnap.data() as { uid?: string }).uid;
          if (referrerUid && referrerUid !== userId) {
            const rRef = doc(this.firestore, 'users', referrerUid);
            const rSnap = await tx.get(rRef);
            if (rSnap.exists()) {
              referrerRef = rRef;
              referrerPointsGain = cfg.pointsPerReferral;
            }
          }
        }
      }

      // ── Écritures ──
      const userUpdates: Record<string, unknown> = {
        ordersCount: (u.ordersCount ?? 0) + 1,
        totalSpent: (u.totalSpent ?? 0) + (o.total ?? 0),
        firstOrderDelivered: true,
      };

      if (o.freeMealApplied) {
        // Un repas gratuit consomme `pointsForFreeMeal` points.
        userUpdates['points'] = Math.max(0, (u.points ?? 0) - cfg.pointsForFreeMeal);
      }
      if (o.welcomePerkApplied) {
        userUpdates['welcomePerkUsed'] = true;
      }
      if (referrerRef) {
        userUpdates['referrerCredited'] = true;
        tx.update(referrerRef, { points: increment(referrerPointsGain) });
      }

      tx.update(userRef, userUpdates);
      tx.update(orderRef, { loyaltySettled: true });
    });
  }

  /** Ajustement manuel des points d'un client par l'admin (peut être négatif). */
  async adjustPoints(uid: string, delta: number): Promise<void> {
    await updateDoc(doc(this.firestore, 'users', uid), { points: increment(delta) });
  }

  /**
   * Flux temps réel de tous les comptes clients, pour l'écran admin.
   * La lecture en liste n'est autorisée qu'à l'admin (voir firestore.rules) :
   * ce flux ne s'active donc que sur les écrans d'administration.
   */
  watchAllUsers(): Observable<UserProfile[]> {
    return collectionData(query(collection(this.firestore, 'users'), orderBy('createdAt', 'desc')), {
      idField: 'uid',
    }) as Observable<UserProfile[]>;
  }
}
