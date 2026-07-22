import { computed, effect, Injectable, signal } from '@angular/core';
import { CartItem } from '../../shared/models/cart-item.model';
import { Dish } from '../../shared/models/dish.model';

const STORAGE_KEY = 'ecy.cart';

/**
 * Panier en mémoire, entièrement construit sur des signals.
 *
 * Aucune dépendance à Firestore : le panier est un état purement local tant
 * que le client n'a pas confirmé. C'est ce qui permet à la navbar, au tiroir
 * panier, à la barre mobile et au checkout de rester synchronisés sans
 * aucune souscription — indispensable en mode zoneless, où un callback
 * asynchrone hors signal ne déclencherait aucun rafraîchissement.
 */
@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _items = signal<CartItem[]>(this.restore());

  readonly items = this._items.asReadonly();

  /** Nombre total d'unités (3 beignets = 3), pour le badge de la navbar. */
  readonly count = computed(() => this._items().reduce((n, i) => n + i.quantity, 0));

  readonly subtotal = computed(() =>
    this._items().reduce((sum, i) => sum + i.price * i.quantity, 0),
  );

  /** Frais de livraison, injectés depuis les paramètres au moment du calcul. */
  readonly deliveryFee = signal(0);

  readonly total = computed(() => this.subtotal() + this.deliveryFee());

  readonly isEmpty = computed(() => this._items().length === 0);

  constructor() {
    // Persiste à chaque mutation. Le panier survit à un rechargement, ce qui
    // évite de perdre une commande en cours si le client ferme l'onglet.
    effect(() => this.persist(this._items()));
  }

  /** Quantité d'un plat donné — alimente les contrôles +/− du menu. */
  quantityOf(dishId: string): number {
    return this._items().find((i) => i.dishId === dishId)?.quantity ?? 0;
  }

  add(dish: Dish): void {
    this._items.update((items) => {
      const existing = items.find((i) => i.dishId === dish.id);
      if (existing) {
        return items.map((i) =>
          i.dishId === dish.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      // On copie nom, prix et emoji plutôt que de référencer le plat : la
      // commande doit refléter ce que le client a vu, même si le restaurateur
      // change le prix ou retire le plat entre-temps.
      const item: CartItem = {
        dishId: dish.id,
        name: dish.name,
        price: dish.price,
        emoji: dish.emoji,
        imageUrl: dish.imageUrl,
        allergens: dish.allergens ?? [],
        quantity: 1,
      };
      return [...items, item];
    });
  }

  /**
   * Ajoute une unité à une ligne existante.
   *
   * Distinct de `add(dish)` : depuis le panier on ne dispose que d'un
   * `CartItem`, pas du `Dish` d'origine — et le reconstruire pour le repasser
   * à `add()` réintroduirait le prix courant du menu au lieu de conserver
   * celui figé à l'ajout.
   */
  increment(dishId: string): void {
    this._items.update((items) =>
      items.map((i) => (i.dishId === dishId ? { ...i, quantity: i.quantity + 1 } : i)),
    );
  }

  /** Retire une unité ; supprime la ligne quand elle atteint zéro. */
  decrement(dishId: string): void {
    this._items.update((items) =>
      items
        .map((i) => (i.dishId === dishId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  remove(dishId: string): void {
    this._items.update((items) => items.filter((i) => i.dishId !== dishId));
  }

  clear(): void {
    this._items.set([]);
  }

  private persist(items: CartItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Quota dépassé ou navigation privée : le panier reste valide en mémoire.
    }
  }

  private restore(): CartItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Filtrage défensif : un ancien format en localStorage ne doit pas
      // faire planter l'application au démarrage.
      return parsed.filter(
        (i): i is CartItem =>
          i &&
          typeof i.dishId === 'string' &&
          typeof i.price === 'number' &&
          typeof i.quantity === 'number' &&
          i.quantity > 0 &&
          i.name &&
          typeof i.name.fr === 'string',
      );
    } catch {
      return [];
    }
  }
}
