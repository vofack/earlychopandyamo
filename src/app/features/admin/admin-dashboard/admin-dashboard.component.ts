import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageService } from '../../../core/services/language.service';
import { MenuService } from '../../../core/services/menu.service';
import { OrderService } from '../../../core/services/order.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { shortOrderId } from '../../../shared/models/order.model';

@Component({
  selector: 'app-admin-dashboard',
  imports: [CurrencyPipe, DatePipe, RouterLink, TranslatePipe, SkeletonComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  readonly orders = inject(OrderService);
  readonly menu = inject(MenuService);
  readonly language = inject(LanguageService);

  readonly dishCount = computed(() => this.menu.dishes().length);

  /** Les 5 commandes les plus récentes, en aperçu sur le tableau de bord. */
  readonly recent = computed(() => this.orders.orders().slice(0, 5));

  readonly shortId = shortOrderId;
}
