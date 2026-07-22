import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  addDoc,
  arrayUnion,
  collection,
  collectionData,
  deleteDoc,
  doc,
  docData,
  Firestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { Order, OrderInput, OrderStatus } from '../../shared/models/order.model';

/**
 * Même logique que dans MenuService : un simple drapeau, jamais un
 * `timeout()` RxJS qui terminerait le flux temps réel des commandes.
 */
const SLOW_LOAD_MS = 10000;

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly firestore = inject(Firestore);
  private readonly col = collection(this.firestore, 'orders');

  private readonly _loading = signal(true);
  readonly loading = this._loading.asReadonly();

  private readonly orders$ = collectionData(query(this.col, orderBy('createdAt', 'desc')), {
    idField: 'id',
  }) as Observable<Order[]>;

  /**
   * Liste temps réel, la plus récente en premier.
   *
   * Ce flux n'est lisible qu'authentifié (voir firestore.rules). Il est
   * néanmoins déclaré au niveau du service : Firestore ne l'active qu'au
   * premier abonné, donc aucune requête refusée n'est émise tant qu'aucun
   * écran admin n'est ouvert.
   */
  private readonly ordersSignal = toSignal(
    this.orders$.pipe(
      tap(() => this._loading.set(false)),
      catchError(() => {
        this._loading.set(false);
        return of([] as Order[]);
      }),
    ),
    { initialValue: [] as Order[] },
  );

  constructor() {
    // Sort du mode « chargement » si Firestore ne répond pas, sans couper
    // l'abonnement : la liste se remplira dès la première émission.
    setTimeout(() => this._loading.set(false), SLOW_LOAD_MS);
  }

  readonly orders = computed(() => this.ordersSignal());

  /** Compteur affiché en rouge dans l'admin. */
  readonly newCount = computed(() => this.orders().filter((o) => o.status === 'new').length);

  readonly revenue = computed(() => this.orders().reduce((sum, o) => sum + (o.total ?? 0), 0));

  readonly averageBasket = computed(() => {
    const list = this.orders();
    return list.length ? this.revenue() / list.length : 0;
  });

  /**
   * Enregistre la commande et renvoie son identifiant.
   *
   * L'appelant doit impérativement attendre cette promesse AVANT de tenter
   * la moindre notification : une commande perdue est bien plus grave qu'un
   * courriel non parti.
   */
  async createOrder(input: OrderInput): Promise<string> {
    const ref = await addDoc(this.col, {
      ...input,
      createdAt: serverTimestamp(),
      statusHistory: [{ status: 'new' as OrderStatus, at: Timestamp.now() }],
    });
    return ref.id;
  }

  /**
   * Fait avancer le statut et empile l'étape dans l'historique.
   *
   * `arrayUnion` évite d'écraser l'historique si deux employés manipulent la
   * même commande depuis deux appareils au même moment.
   *
   * L'horodatage utilise `Timestamp.now()` (heure du client) et non
   * `serverTimestamp()` : ce dernier est interdit à l'intérieur d'un tableau
   * par Firestore.
   */
  async updateStatus(id: string, status: OrderStatus): Promise<void> {
    await updateDoc(doc(this.firestore, 'orders', id), {
      status,
      statusHistory: arrayUnion({ status, at: Timestamp.now() }),
    });
  }

  async deleteOrder(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'orders', id));
  }

  /**
   * Commandes d'un client connecté, en temps réel (« Mes commandes »).
   *
   * La requête DOIT filtrer sur `userId` et poser une limite : c'est ce que
   * les règles Firestore exigent pour autoriser la lecture en liste à un
   * client (il ne voit que ses propres commandes, jamais celles des autres).
   */
  watchUserOrders(userId: string): Observable<Order[]> {
    return collectionData(
      query(
        this.col,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50),
      ),
      { idField: 'id' },
    ) as Observable<Order[]>;
  }

  /**
   * Suivi client d'une commande unique, en temps réel.
   * Émet `null` si l'identifiant ne correspond à aucune commande.
   */
  watchOrder(id: string): Observable<Order | null> {
    return (docData(doc(this.firestore, 'orders', id), { idField: 'id' }) as Observable<
      Order | undefined
    >).pipe(
      map((o) => o ?? null),
      catchError(() => of(null)),
    );
  }
}
