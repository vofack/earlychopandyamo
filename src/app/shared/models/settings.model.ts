/**
 * Horaires d'un jour donné.
 * `closed: true` l'emporte sur open/close (jour de fermeture hebdomadaire).
 */
export interface DayHours {
  /** Format 24h « HH:MM ». */
  open: string;
  close: string;
  closed: boolean;
}

/** Index 0 = dimanche, pour coïncider avec `Date.prototype.getDay()`. */
export type WeekHours = [DayHours, DayHours, DayHours, DayHours, DayHours, DayHours, DayHours];

/**
 * Paramètres du programme de parrainage/fidélité.
 * Toutes les valeurs sont réglables par le restaurateur depuis l'admin.
 */
export interface ReferralSettings {
  /** Interrupteur global du programme. */
  enabled: boolean;
  /** Points gagnés par le parrain quand un filleul reçoit sa 1re commande. */
  pointsPerReferral: number;
  /** Points nécessaires pour un repas gratuit. */
  pointsForFreeMeal: number;
  /** Valeur en dollars d'un repas gratuit (réduction, plafonnée au sous-total). */
  freeMealCredit: number;
  /** Réduction offerte au filleul sur sa 1re commande. */
  welcomePerkAmount: number;
  /** Envoyer un courriel au client à chaque changement de statut de commande. */
  emailOnStatusChange: boolean;
}

export interface Settings {
  /** 0 = livraison gratuite, la promesse commerciale actuelle. */
  deliveryFee: number;
  /** Montant minimum de commande, en dollars. 0 = pas de minimum. */
  minOrder: number;
  openingHours: WeekHours;
  /**
   * Interrupteur manuel du restaurateur. Passé à false, il ferme la commande
   * même pendant les heures d'ouverture (rupture de stock, imprévu).
   */
  isOpen: boolean;
  /**
   * Préfixes de codes postaux desservis (3 premiers caractères, ex. « H2X »).
   * Liste vide = aucune restriction de zone.
   */
  deliveryPostalCodes: string[];
  /** Programme de parrainage/fidélité. */
  referral: ReferralSettings;
}

/**
 * Valeurs par défaut, utilisées tant que le document `settings/main` n'existe
 * pas dans Firestore. Elles doivent rester permissives : mieux vaut accepter
 * une commande que bloquer un client sur une base non encore configurée.
 */
export const DEFAULT_SETTINGS: Settings = {
  deliveryFee: 0,
  minOrder: 0,
  isOpen: true,
  deliveryPostalCodes: [],
  openingHours: [
    { open: '11:00', close: '21:00', closed: false }, // dimanche
    { open: '11:00', close: '22:00', closed: false }, // lundi
    { open: '11:00', close: '22:00', closed: false }, // mardi
    { open: '11:00', close: '22:00', closed: false }, // mercredi
    { open: '11:00', close: '22:00', closed: false }, // jeudi
    { open: '11:00', close: '23:00', closed: false }, // vendredi
    { open: '11:00', close: '23:00', closed: false }, // samedi
  ],
  // Valeurs de départ validées avec le restaurateur (modifiables dans l'admin).
  referral: {
    enabled: true,
    pointsPerReferral: 1,
    pointsForFreeMeal: 3,
    freeMealCredit: 20,
    welcomePerkAmount: 5,
    emailOnStatusChange: true,
  },
};
