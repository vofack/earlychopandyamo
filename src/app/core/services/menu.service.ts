import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  Firestore,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from '@angular/fire/firestore';
import { catchError, Observable, of, tap } from 'rxjs';
import { Dish, DishInput } from '../../shared/models/dish.model';

/**
 * Délai au-delà duquel on cesse d'afficher des squelettes.
 *
 * Nécessaire car un Firestore injoignable (base absente, réseau coupé) ne
 * produit aucune erreur : le SDK réessaie indéfiniment. Sans cette borne,
 * `catchError` ne se déclencherait jamais et le client resterait devant des
 * squelettes perpétuels.
 *
 * ⚠️ Ce délai NE termine PAS le flux — c'est tout l'intérêt. Un `timeout()`
 * RxJS le ferait, et un démarrage à froid un peu lent (connexion WebChannel)
 * condamnerait alors la page à « Menu indisponible » de façon définitive,
 * même si les plats arrivaient une seconde plus tard. Ici on se contente de
 * lever un drapeau : l'abonnement reste vivant et l'écran se corrige de
 * lui-même dès que les données arrivent.
 */
const SLOW_LOAD_MS = 10000;

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly firestore = inject(Firestore);
  private readonly col = collection(this.firestore, 'dishes');

  /**
   * `true` tant que le premier lot n'est pas arrivé — pilote les squelettes
   * de chargement. On ne peut pas se contenter de « liste vide » : un menu
   * réellement vide et un menu en cours de chargement doivent afficher deux
   * écrans différents.
   */
  private readonly _loading = signal(true);
  readonly loading = this._loading.asReadonly();

  private readonly _error = signal(false);
  readonly error = this._error.asReadonly();

  /**
   * Flux temps réel. `collectionData` s'appuie sur onSnapshot : toute écriture
   * depuis l'admin se propage au site public sans rechargement.
   *
   * `toSignal` est obligatoire ici plutôt qu'une souscription manuelle :
   * en zoneless, un callback Firestore qui écrirait dans un champ de classe
   * ne déclencherait aucune détection de changement.
   */
  private readonly dishes$ = collectionData(query(this.col, orderBy('createdAt', 'desc')), {
    idField: 'id',
  }) as Observable<Dish[]>;

  private readonly dishesSignal = toSignal(
    this.dishes$.pipe(
      tap(() => {
        // Toute émission — y compris un tableau vide — prouve que Firestore
        // répond. On lève l'état d'erreur même s'il avait été posé par le
        // minuteur : c'est ce qui permet à l'écran de se rétablir seul.
        this._loading.set(false);
        this._error.set(false);
      }),
      catchError(() => {
        // Cas typiques : règles Firestore non déployées, projet hors ligne.
        // On dégrade proprement au lieu de casser la page.
        this._loading.set(false);
        this._error.set(true);
        return of([] as Dish[]);
      }),
    ),
    { initialValue: [] as Dish[] },
  );

  constructor() {
    // Filet de sécurité : si rien n'est arrivé au bout du délai, on sort du
    // mode « chargement » pour afficher un message. L'abonnement Firestore
    // continue de tourner en arrière-plan et effacera cette erreur dès qu'il
    // émettra enfin.
    setTimeout(() => {
      if (this._loading()) {
        this._loading.set(false);
        this._error.set(true);
      }
    }, SLOW_LOAD_MS);
  }

  /** Tous les plats, y compris ceux marqués indisponibles (vue admin). */
  readonly dishes = computed(() => this.dishesSignal());

  /** Plats visibles côté client. */
  readonly availableDishes = computed(() => this.dishes().filter((d) => d.isAvailable));

  async addDish(input: DishInput): Promise<void> {
    await addDoc(this.col, { ...input, createdAt: serverTimestamp() });
  }

  async updateDish(id: string, changes: Partial<DishInput>): Promise<void> {
    await updateDoc(doc(this.firestore, 'dishes', id), { ...changes });
  }

  async toggleAvailability(dish: Dish): Promise<void> {
    await this.updateDish(dish.id, { isAvailable: !dish.isAvailable });
  }

  async deleteDish(id: string): Promise<void> {
    await deleteDoc(doc(this.firestore, 'dishes', id));
  }
}
