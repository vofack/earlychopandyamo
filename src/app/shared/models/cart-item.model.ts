import { Allergen, LocalizedText } from './dish.model';

/**
 * Ligne de panier.
 *
 * On copie le nom, le prix et l'emoji au moment de l'ajout plutôt que de
 * garder une référence vers le plat. Deux raisons : la commande enregistrée
 * doit refléter ce que le client a réellement vu et payé (si le restaurateur
 * change le prix pendant que le panier est ouvert, la commande en cours n'est
 * pas modifiée rétroactivement), et le panier reste lisible même si le plat
 * est retiré du menu ensuite.
 */
export interface CartItem {
  dishId: string;
  name: LocalizedText;
  price: number;
  emoji: string;
  imageUrl?: string;
  /** Absent des paniers restaurés d'un ancien format en localStorage. */
  allergens?: Allergen[];
  quantity: number;
}
