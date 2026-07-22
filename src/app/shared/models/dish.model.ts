import { Timestamp } from '@angular/fire/firestore';

/** Langues supportées par l'interface et par le contenu saisi en admin. */
export type Lang = 'fr' | 'en';

/**
 * Texte saisi par le restaurateur dans les deux langues.
 *
 * L'anglais est délibérément optionnel : un plat ajouté à la hâte pendant
 * le service doit rester commandable même sans traduction. Le pipe
 * `localized` retombe alors sur le français plutôt que d'afficher du vide.
 */
export interface LocalizedText {
  fr: string;
  en?: string;
}

export type DishCategory = 'main' | 'starter' | 'dessert' | 'drink';

export const DISH_CATEGORIES: readonly DishCategory[] = [
  'main',
  'starter',
  'dessert',
  'drink',
] as const;

/**
 * Allergènes. Information de sécurité, pas un simple confort d'affichage :
 * elle doit rester visible sur la carte du plat et dans le panier.
 */
export type Allergen = 'peanut' | 'gluten' | 'dairy' | 'egg' | 'fish' | 'shellfish' | 'soy' | 'nuts';

export const ALLERGENS: readonly Allergen[] = [
  'peanut',
  'gluten',
  'dairy',
  'egg',
  'fish',
  'shellfish',
  'soy',
  'nuts',
] as const;

export interface Dish {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  /** Prix en dollars canadiens. */
  price: number;
  category: DishCategory;
  /** Repli visuel quand aucune photo n'est fournie. */
  emoji: string;
  /** URL Cloudinary ou Firebase Storage. Absente ⇒ on affiche l'emoji. */
  imageUrl?: string;
  isPopular: boolean;
  isAvailable: boolean;
  isVegetarian: boolean;
  isSpicy: boolean;
  /**
   * Optionnel à la lecture : un document écrit avant l'introduction de ce
   * champ n'en aura pas. Le déclarer requis ferait mentir le type et
   * exposerait à un plantage sur `allergens.length`.
   */
  allergens?: Allergen[];
  createdAt?: Timestamp;
}

/** Charge utile d'écriture : Firestore génère l'id, on ne l'envoie jamais. */
export type DishInput = Omit<Dish, 'id' | 'createdAt'>;
