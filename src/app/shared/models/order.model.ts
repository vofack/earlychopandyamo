import { Timestamp } from '@angular/fire/firestore';
import { CartItem } from './cart-item.model';
import { Lang } from './dish.model';

export type OrderStatus = 'new' | 'confirmed' | 'preparing' | 'delivered';

/** Ordre d'avancement — sert à la timeline de suivi et à l'écran admin. */
export const ORDER_FLOW: readonly OrderStatus[] = [
  'new',
  'confirmed',
  'preparing',
  'delivered',
] as const;

export type PaymentMethod = 'cash' | 'interac' | 'card';

export const PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'interac', 'card'] as const;

/** Une étape franchie, horodatée. Alimente la timeline vue par le client. */
export interface StatusEntry {
  status: OrderStatus;
  at: Timestamp;
}

export interface Order {
  id: string;
  clientName: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  notes: string;
  status: OrderStatus;
  /** Langue choisie par le client — détermine la langue des courriels. */
  lang: Lang;
  statusHistory: StatusEntry[];

  /**
   * UID du client connecté ayant passé la commande, ou `null` pour une
   * commande invité. C'est le lien entre une commande et un compte : il
   * alimente « Mes commandes » et déclenche le crédit de parrainage à la
   * livraison. Les règles Firestore vérifient qu'un client ne peut attribuer
   * une commande qu'à son propre UID.
   */
  userId?: string | null;

  /** Réduction totale appliquée (repas gratuit + avantage filleul). */
  discount?: number;
  /** Le client a utilisé un repas gratuit sur cette commande. */
  freeMealApplied?: boolean;
  /** L'avantage filleul (1re commande) a été appliqué sur cette commande. */
  welcomePerkApplied?: boolean;
  /**
   * Verrou d'idempotence : passe à true une fois la logique de fidélité
   * (crédit parrain + déduction repas gratuit) exécutée à la livraison, pour
   * qu'un aller-retour de statut par l'admin ne recrédite pas deux fois.
   */
  loyaltySettled?: boolean;

  createdAt?: Timestamp;
}

export type OrderInput = Omit<Order, 'id' | 'createdAt'>;

/**
 * Numéro de commande lisible présenté au client et au restaurant.
 * Les identifiants Firestore font 20 caractères aléatoires, illisibles au
 * téléphone ; on n'en montre que les 6 derniers, en majuscules.
 */
export function shortOrderId(id: string): string {
  return id.slice(-6).toUpperCase();
}
