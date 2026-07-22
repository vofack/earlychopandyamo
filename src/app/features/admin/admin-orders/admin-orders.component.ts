import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { LanguageService } from '../../../core/services/language.service';
import { LoyaltyService } from '../../../core/services/loyalty.service';
import { NotificationService } from '../../../core/services/notification.service';
import { OrderService } from '../../../core/services/order.service';
import { SettingsService } from '../../../core/services/settings.service';
import { ToastService } from '../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { Order, ORDER_FLOW, OrderStatus, shortOrderId } from '../../../shared/models/order.model';
import { LocalizedPipe } from '../../../shared/pipes/localized.pipe';

type StatusFilter = OrderStatus | 'all';

@Component({
  selector: 'app-admin-orders',
  imports: [
    CurrencyPipe,
    DatePipe,
    TranslatePipe,
    LocalizedPipe,
    SkeletonComponent,
    EmptyStateComponent,
  ],
  templateUrl: './admin-orders.component.html',
  styleUrl: './admin-orders.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOrdersComponent {
  readonly orders = inject(OrderService);
  readonly language = inject(LanguageService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly loyalty = inject(LoyaltyService);
  private readonly notifications = inject(NotificationService);
  private readonly settings = inject(SettingsService);

  readonly filters: StatusFilter[] = ['all', ...ORDER_FLOW];
  readonly activeFilter = signal<StatusFilter>('all');

  /** Identifiants des commandes dont le détail est déplié. */
  private readonly expanded = signal<Set<string>>(new Set());

  readonly shortId = shortOrderId;

  readonly filtered = computed<Order[]>(() => {
    const filter = this.activeFilter();
    const list = this.orders.orders();
    return filter === 'all' ? list : list.filter((o) => o.status === filter);
  });

  isExpanded(id: string): boolean {
    return this.expanded().has(id);
  }

  toggleExpanded(id: string): void {
    this.expanded.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  /**
   * Statut suivant dans le déroulé, ou `null` si la commande est livrée.
   * Permet de n'afficher qu'un seul bouton d'avancement, sans risque de
   * sauter une étape.
   */
  nextStatus(order: Order): OrderStatus | null {
    const index = ORDER_FLOW.indexOf(order.status);
    return index >= 0 && index < ORDER_FLOW.length - 1 ? ORDER_FLOW[index + 1] : null;
  }

  /** Clé du libellé d'action associée au statut suivant. */
  actionKey(status: OrderStatus): string {
    const map: Record<OrderStatus, string> = {
      new: 'admin.orders.actions.confirm',
      confirmed: 'admin.orders.actions.confirm',
      preparing: 'admin.orders.actions.prepare',
      delivered: 'admin.orders.actions.deliver',
    };
    return map[status];
  }

  async advance(order: Order): Promise<void> {
    const next = this.nextStatus(order);
    if (!next) return;

    try {
      await this.orders.updateStatus(order.id, next);
      this.toast.success('toast.statusUpdated');

      // Vue à jour de la commande, pour les traitements en aval.
      const updated: Order = { ...order, status: next };

      // À la LIVRAISON : applique la fidélité (crédit parrain, déduction repas
      // gratuit) en transaction idempotente. Volontairement après la mise à
      // jour du statut et sans bloquer l'UI : un échec ici ne doit pas empêcher
      // de marquer la commande livrée.
      if (next === 'delivered') {
        this.loyalty
          .creditForDeliveredOrder(updated)
          .catch((e) => console.error('[admin-orders] crédit fidélité échoué', e));
      }

      // Courriel au client à chaque changement de statut, si activé.
      if (this.settings.settings().referral.emailOnStatusChange) {
        void this.notifications.notifyStatusChange(updated);
      }
    } catch (error) {
      console.error('[admin-orders] changement de statut échoué', error);
      this.toast.error('common.errorNetwork');
    }
  }

  async remove(order: Order): Promise<void> {
    // Suppression définitive : on exige une confirmation explicite, avec le
    // numéro de commande dans le message pour éviter l'erreur de cible.
    const message = this.translate.instant('admin.orders.deleteConfirm', {
      id: shortOrderId(order.id),
    });
    if (!confirm(message)) return;

    try {
      await this.orders.deleteOrder(order.id);
      this.toast.success('toast.orderDeleted');
    } catch (error) {
      console.error('[admin-orders] suppression échouée', error);
      this.toast.error('common.errorNetwork');
    }
  }
}
