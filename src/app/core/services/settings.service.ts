import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { doc, docData, Firestore, setDoc } from '@angular/fire/firestore';
import { catchError, map, Observable, of } from 'rxjs';
import { DEFAULT_SETTINGS, Settings } from '../../shared/models/settings.model';

/** Document unique contenant tous les réglages du restaurant. */
const SETTINGS_DOC = 'settings/main';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly firestore = inject(Firestore);
  private readonly ref = doc(this.firestore, SETTINGS_DOC);

  /**
   * Réglages en temps réel.
   *
   * Repli sur DEFAULT_SETTINGS tant que le document n'existe pas, ou si sa
   * lecture échoue. Ces valeurs par défaut sont volontairement permissives :
   * sur une base fraîchement créée, mieux vaut accepter une commande que
   * bloquer un client à cause d'un document de configuration manquant.
   */
  private readonly settingsSignal = toSignal(
    (docData(this.ref) as Observable<Settings | undefined>).pipe(
      map((s) => ({ ...DEFAULT_SETTINGS, ...(s ?? {}) })),
      catchError(() => of(DEFAULT_SETTINGS)),
    ),
    { initialValue: DEFAULT_SETTINGS },
  );

  readonly settings = computed(() => this.settingsSignal());

  readonly deliveryFee = computed(() => this.settings().deliveryFee);
  readonly minOrder = computed(() => this.settings().minOrder);

  /**
   * Horloge interne, rafraîchie chaque minute.
   *
   * Sans elle, `isOpenNow` serait calculé une seule fois : une page laissée
   * ouverte afficherait « ouvert » indéfiniment après l'heure de fermeture.
   */
  private readonly now = signal(new Date());

  constructor() {
    setInterval(() => this.now.set(new Date()), 60_000);
  }

  /**
   * Le restaurant accepte-t-il des commandes maintenant ?
   * Croise l'interrupteur manuel du restaurateur avec les horaires du jour.
   */
  readonly isOpenNow = computed(() => {
    const s = this.settings();
    if (!s.isOpen) return false;

    const now = this.now();
    const today = s.openingHours[now.getDay()];
    if (!today || today.closed) return false;

    const minutes = now.getHours() * 60 + now.getMinutes();
    const open = this.toMinutes(today.open);
    const close = this.toMinutes(today.close);
    if (open === null || close === null) return false;

    // Service qui court après minuit (ex. 18:00 → 02:00) : la fenêtre
    // enjambe deux jours, la comparaison simple ne suffit pas.
    return close <= open ? minutes >= open || minutes < close : minutes >= open && minutes < close;
  });

  /**
   * Prochaine réouverture, pour la bannière « nous sommes fermés ».
   *
   * `isToday` permet au composant de choisir entre « Ouvre à 11:00 » et
   * « Ouvre lundi à 11:00 » — les deux formulations sont traduites.
   * Renvoie `null` quand le restaurateur a coupé les commandes manuellement :
   * dans ce cas aucune heure de réouverture n'est prévisible.
   */
  readonly nextOpening = computed<{ dayIndex: number; time: string; isToday: boolean } | null>(
    () => {
      const s = this.settings();
      if (!s.isOpen) return null;

      const now = this.now();
      const minutesNow = now.getHours() * 60 + now.getMinutes();

      for (let offset = 0; offset < 8; offset++) {
        const dayIndex = (now.getDay() + offset) % 7;
        const hours = s.openingHours[dayIndex];
        if (!hours || hours.closed) continue;

        const open = this.toMinutes(hours.open);
        if (open === null) continue;

        // Aujourd'hui ne compte que si l'ouverture est encore à venir.
        if (offset === 0 && minutesNow >= open) continue;

        return { dayIndex, time: hours.open, isToday: offset === 0 };
      }
      return null;
    },
  );

  /**
   * Le code postal est-il dans la zone desservie ?
   * Une liste vide signifie « on livre partout » et laisse donc tout passer.
   */
  isPostalCodeInZone(postalCode: string): boolean {
    const zones = this.settings().deliveryPostalCodes;
    if (!zones.length) return true;

    const prefix = postalCode.replace(/\s+/g, '').toUpperCase().slice(0, 3);
    return zones.some((z) => z.replace(/\s+/g, '').toUpperCase() === prefix);
  }

  async save(settings: Settings): Promise<void> {
    await setDoc(this.ref, settings, { merge: true });
  }

  /** « HH:MM » → minutes depuis minuit. `null` si le format est invalide. */
  private toMinutes(time: string): number | null {
    const match = /^(\d{1,2}):(\d{2})$/.exec(time?.trim() ?? '');
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h > 23 || m > 59) return null;
    return h * 60 + m;
  }
}
