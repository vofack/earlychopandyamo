import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageService } from '../../../core/services/language.service';
import { OrderService } from '../../../core/services/order.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { Order } from '../../../shared/models/order.model';
import { LocalizedText } from '../../../shared/models/dish.model';
import { LocalizedPipe } from '../../../shared/pipes/localized.pipe';

interface TopDish {
  name: LocalizedText;
  emoji: string;
  count: number;
  /** Largeur de barre en pourcentage du plat le plus vendu. */
  percent: number;
}

interface DayBar {
  date: Date;
  count: number;
  percent: number;
}

@Component({
  selector: 'app-admin-stats',
  imports: [CurrencyPipe, DatePipe, TranslatePipe, LocalizedPipe, SkeletonComponent],
  templateUrl: './admin-stats.component.html',
  styleUrl: './admin-stats.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStatsComponent {
  readonly orders = inject(OrderService);
  readonly language = inject(LanguageService);

  /** Commandes du mois calendaire en cours. */
  private readonly thisMonth = computed<Order[]>(() => {
    const now = new Date();
    return this.orders.orders().filter((o) => {
      const date = o.createdAt?.toDate();
      return !!date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
  });

  readonly revenueTotal = computed(() => this.orders.revenue());

  readonly revenueMonth = computed(() =>
    this.thisMonth().reduce((sum, o) => sum + (o.total ?? 0), 0),
  );

  readonly ordersTotal = computed(() => this.orders.orders().length);
  readonly ordersMonth = computed(() => this.thisMonth().length);
  readonly averageBasket = computed(() => this.orders.averageBasket());

  /**
   * Classement des plats par nombre d'unités vendues.
   *
   * Agrégé depuis les lignes de commande plutôt que depuis la collection
   * `dishes` : un plat retiré du menu doit continuer d'apparaître dans
   * l'historique des ventes.
   */
  readonly topDishes = computed<TopDish[]>(() => {
    const tally = new Map<string, { name: LocalizedText; emoji: string; count: number }>();

    for (const order of this.orders.orders()) {
      for (const item of order.items ?? []) {
        const existing = tally.get(item.dishId);
        if (existing) {
          existing.count += item.quantity;
        } else {
          tally.set(item.dishId, {
            name: item.name,
            emoji: item.emoji,
            count: item.quantity,
          });
        }
      }
    }

    const sorted = [...tally.values()].sort((a, b) => b.count - a.count).slice(0, 5);
    const max = sorted[0]?.count ?? 0;

    return sorted.map((d) => ({
      ...d,
      percent: max > 0 ? Math.round((d.count / max) * 100) : 0,
    }));
  });

  /**
   * Volume des 7 derniers jours, du plus ancien au plus récent.
   * Les jours sans commande apparaissent à zéro : un trou dans la série
   * serait plus trompeur qu'une barre vide.
   */
  readonly last7Days = computed<DayBar[]>(() => {
    const days: DayBar[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let offset = 6; offset >= 0; offset--) {
      const start = new Date(today);
      start.setDate(today.getDate() - offset);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);

      const count = this.orders.orders().filter((o) => {
        const date = o.createdAt?.toDate();
        return !!date && date >= start && date < end;
      }).length;

      days.push({ date: start, count, percent: 0 });
    }

    const max = Math.max(...days.map((d) => d.count), 0);
    return days.map((d) => ({
      ...d,
      percent: max > 0 ? Math.round((d.count / max) * 100) : 0,
    }));
  });

  readonly hasChartData = computed(() => this.last7Days().some((d) => d.count > 0));
}
