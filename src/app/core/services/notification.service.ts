import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Order, shortOrderId } from '../../shared/models/order.model';
import { LanguageService } from './language.service';

/**
 * Notifications de commande.
 *
 * ── Envoi des courriels : Google Apps Script ───────────────────────────
 * Aucun service tiers, aucune carte bancaire. Un petit script hébergé dans
 * le compte Google du restaurant (earlychopandyamo@gmail.com) reçoit les
 * détails de la commande et envoie les deux courriels via Gmail. Ils partent
 * donc littéralement depuis l'adresse du restaurant.
 *
 * ── Pourquoi pas de SMS ────────────────────────────────────────────────
 * Twilio et les passerelles SMS exigent un jeton secret. Tout ce qui vit dans
 * cette application finit dans le bundle JavaScript, lisible par n'importe
 * quel visiteur — un jeton exposé permettrait d'envoyer des SMS aux frais du
 * restaurant. L'envoi SMS automatisé demande un serveur (Cloud Function),
 * donc le plan Blaze. On s'en tient aux courriels + au lien WhatsApp.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly language = inject(LanguageService);

  private readonly config = environment.email;

  /**
   * Notifie client et restaurant en une seule requête vers le script Google.
   *
   * Ne rejette JAMAIS. La commande est déjà enregistrée dans Firestore quand
   * cette méthode est appelée ; une coupure réseau ne doit pas faire croire au
   * client que sa commande a échoué. Le booléen renvoyé ne sert qu'à nuancer
   * le message de succès.
   *
   * L'appel se fait en `no-cors` : les applications Apps Script ne renvoient
   * pas d'en-têtes CORS lisibles par le navigateur. En contrepartie on ne peut
   * pas lire la réponse — d'où le retour « optimiste ». C'est acceptable ici :
   * l'envoi est volontairement du « tire et oublie », jamais bloquant.
   */
  async notifyNewOrder(order: Order): Promise<boolean> {
    const url = this.config.appsScriptUrl;

    if (this.config.provider === 'none' || !url || url.startsWith('À_REMPLIR')) {
      console.warn(
        '[notification] Envoi de courriels non configuré — courriel ignoré. ' +
          'Renseignez environment.email.appsScriptUrl (voir README > Courriels).',
      );
      return false;
    }

    try {
      await fetch(url, {
        method: 'POST',
        // `text/plain` = requête « simple » : évite la vérification CORS
        // préalable (preflight) qu'Apps Script ne sait pas gérer.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        mode: 'no-cors',
        body: JSON.stringify(this.buildPayload(order)),
      });
      // En no-cors la réponse est opaque : on ne peut pas confirmer, on
      // considère l'envoi parti (la requête a bien été émise).
      return true;
    } catch (error) {
      // Seule une vraie erreur réseau arrive ici. On la journalise sans
      // jamais la propager : la commande reste valide.
      console.error('[notification] envoi du courriel échoué', error);
      return false;
    }
  }

  /**
   * Charge utile envoyée au script. Contient tout ce qu'il faut pour composer
   * les deux courriels côté Google — le script n'a aucune logique métier à
   * deviner. Le `token` est une barrière légère contre les appels parasites.
   */
  /**
   * Prévient le client que le statut de sa commande a changé (« en
   * préparation », « livrée »…). Déclenché par l'admin. Tire-et-oublie, ne
   * rejette jamais. Réutilise le même script Google avec `type: 'status'`.
   */
  async notifyStatusChange(order: Order): Promise<void> {
    const url = this.config.appsScriptUrl;
    if (this.config.provider === 'none' || !url || url.startsWith('À_REMPLIR')) return;
    if (!order.email) return;

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        mode: 'no-cors',
        body: JSON.stringify({
          token: this.config.token,
          type: 'status',
          lang: order.lang,
          orderId: shortOrderId(order.id),
          clientName: order.clientName,
          clientEmail: order.email,
          status: order.status,
          trackingUrl: this.trackingUrl(order.id),
          restaurantName: environment.restaurant.name,
        }),
      });
    } catch (error) {
      console.error('[notification] courriel de statut échoué', error);
    }
  }

  /** Prévient un parrain qu'il vient de gagner des points. Tire-et-oublie. */
  async notifyReferralReward(params: {
    email: string;
    lang: 'fr' | 'en';
    name: string;
    points: number;
    freeMealsAvailable: number;
  }): Promise<void> {
    const url = this.config.appsScriptUrl;
    if (this.config.provider === 'none' || !url || url.startsWith('À_REMPLIR')) return;
    if (!params.email) return;

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        mode: 'no-cors',
        body: JSON.stringify({
          token: this.config.token,
          type: 'referral',
          lang: params.lang,
          clientEmail: params.email,
          clientName: params.name,
          points: params.points,
          freeMeals: params.freeMealsAvailable,
          accountUrl: `${location.origin}/compte`,
          restaurantName: environment.restaurant.name,
        }),
      });
    } catch (error) {
      console.error('[notification] courriel de récompense parrain échoué', error);
    }
  }

  private buildPayload(order: Order): Record<string, unknown> {
    return {
      token: this.config.token,
      type: 'order',
      lang: order.lang,
      orderId: shortOrderId(order.id),
      clientName: order.clientName,
      clientEmail: order.email,
      clientPhone: order.phone,
      address: order.address,
      postalCode: order.postalCode,
      items: order.items.map((i) => ({
        name: order.lang === 'en' ? i.name.en?.trim() || i.name.fr : i.name.fr,
        quantity: i.quantity,
        lineTotal: this.money(i.price * i.quantity),
      })),
      subtotal: this.money(order.subtotal),
      delivery: order.deliveryFee > 0 ? this.money(order.deliveryFee) : null,
      total: this.money(order.total),
      payment: order.paymentMethod,
      notes: order.notes || '',
      trackingUrl: this.trackingUrl(order.id),
      deliveryEstimate: environment.deliveryEstimate,
      restaurantName: environment.restaurant.name,
      restaurantEmail: environment.restaurant.email,
      restaurantPhone: environment.restaurant.phoneDisplay,
    };
  }

  /**
   * Lien WhatsApp pré-rempli vers le restaurant.
   *
   * Approche « click to chat » officielle de WhatsApp : aucun compte
   * développeur, aucun jeton, aucun coût. Le message est composé d'avance,
   * l'expéditeur n'a plus qu'à appuyer sur Envoyer.
   */
  buildWhatsAppLink(order: Order): string {
    const message =
      order.lang === 'en'
        ? `Hello ${environment.restaurant.name}! I have a question about my order #${shortOrderId(order.id)} ` +
          `(${order.clientName}, ${this.money(order.total)}).`
        : `Bonjour ${environment.restaurant.name} ! J'ai une question sur ma commande n° ${shortOrderId(order.id)} ` +
          `(${order.clientName}, ${this.money(order.total)}).`;

    return `https://wa.me/${environment.restaurant.whatsapp}?text=${encodeURIComponent(message)}`;
  }

  /** Lien WhatsApp générique, pour le pied de page et la page de contact. */
  buildGeneralWhatsAppLink(): string {
    const message =
      this.language.current() === 'en'
        ? `Hello ${environment.restaurant.name}! I'd like some information.`
        : `Bonjour ${environment.restaurant.name} ! J'aimerais un renseignement.`;

    return `https://wa.me/${environment.restaurant.whatsapp}?text=${encodeURIComponent(message)}`;
  }

  private trackingUrl(orderId: string): string {
    return `${location.origin}/suivi/${orderId}`;
  }

  private money(amount: number): string {
    return `${amount.toFixed(2)} $`;
  }
}
