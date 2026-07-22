import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of, switchMap, tap, timeout } from 'rxjs';

/**
 * Passé ce délai sans réponse de Firestore, on affiche « commande
 * introuvable » plutôt que de laisser le squelette tourner sans fin. Un
 * client qui attend devant une animation perpétuelle n'a aucun moyen de
 * comprendre que quelque chose ne va pas.
 */
const ORDER_TIMEOUT_MS = 8000;

import { environment } from '../../../environments/environment';
import { LanguageService } from '../../core/services/language.service';
import { NotificationService } from '../../core/services/notification.service';
import { OrderService } from '../../core/services/order.service';
import { SeoService } from '../../core/services/seo.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { ORDER_FLOW, Order, OrderStatus, shortOrderId } from '../../shared/models/order.model';
import { LocalizedPipe } from '../../shared/pipes/localized.pipe';

@Component({
  selector: 'app-order-tracking',
  imports: [
    CurrencyPipe,
    DatePipe,
    TranslatePipe,
    LocalizedPipe,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  templateUrl: './order-tracking.component.html',
  styleUrl: './order-tracking.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderTrackingComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly orders = inject(OrderService);
  private readonly notifications = inject(NotificationService);
  private readonly seo = inject(SeoService);

  readonly language = inject(LanguageService);

  readonly steps = ORDER_FLOW;
  readonly deliveryEstimate = environment.deliveryEstimate;

  readonly loading = signal(true);

  /**
   * Commande suivie en temps réel.
   *
   * `switchMap` sur les paramètres de route plutôt qu'une lecture unique :
   * si le client ouvre un autre lien de suivi, l'abonnement précédent est
   * automatiquement résilié.
   */
  private readonly orderSignal = toSignal(
    this.route.paramMap.pipe(
      switchMap((params) =>
        this.orders.watchOrder(params.get('id') ?? '').pipe(
          // `first` uniquement : les émissions suivantes du flux temps réel
          // ne doivent pas être soumises au délai, sinon une commande qui
          // reste au même statut plus de 8 secondes serait interrompue.
          timeout({ first: ORDER_TIMEOUT_MS, with: () => of(null) }),
        ),
      ),
      tap(() => this.loading.set(false)),
    ),
    { initialValue: undefined },
  );

  readonly order = computed<Order | null | undefined>(() => this.orderSignal());

  readonly shortId = computed(() => {
    const o = this.order();
    return o ? shortOrderId(o.id) : '';
  });

  /** Index de l'étape courante dans le déroulé Reçue → Livrée. */
  readonly currentStep = computed(() => {
    const o = this.order();
    return o ? this.steps.indexOf(o.status) : -1;
  });

  readonly whatsappLink = computed(() => {
    const o = this.order();
    return o ? this.notifications.buildWhatsAppLink(o) : '';
  });

  ngOnInit(): void {
    this.seo.set('tracking.title');
    // Un lien de suivi contient des données personnelles : il ne doit jamais
    // se retrouver dans un index de recherche.
    this.seo.noIndex();
  }

  /** Horodatage réel de l'étape, s'il a été franchi. */
  timestampFor(status: OrderStatus): Date | null {
    const entry = this.order()?.statusHistory?.find((s) => s.status === status);
    return entry?.at?.toDate?.() ?? null;
  }
}
