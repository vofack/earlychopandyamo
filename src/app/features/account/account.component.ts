import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { of, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AccountService } from '../../core/services/account.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { OrderService } from '../../core/services/order.service';
import { SeoService } from '../../core/services/seo.service';
import { SettingsService } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';
import { Order, ORDER_FLOW, shortOrderId } from '../../shared/models/order.model';

@Component({
  selector: 'app-account',
  imports: [CurrencyPipe, DatePipe, RouterLink, TranslatePipe],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly account = inject(AccountService);
  readonly settings = inject(SettingsService);
  readonly language = inject(LanguageService);
  private readonly orders = inject(OrderService);
  private readonly toast = inject(ToastService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);

  readonly steps = ORDER_FLOW;
  readonly shortId = shortOrderId;

  /** Mes commandes, en temps réel (filtrées sur mon UID par les règles). */
  readonly myOrders = toSignal(
    toObservable(computed(() => this.auth.user()?.uid ?? null)).pipe(
      switchMap((uid) => (uid ? this.orders.watchUserOrders(uid) : of([] as Order[]))),
    ),
    { initialValue: [] as Order[] },
  );

  /** Pourcentage de progression vers le prochain repas gratuit. */
  readonly progressPercent = computed(() => {
    const threshold = this.settings.settings().referral.pointsForFreeMeal;
    if (threshold <= 0) return 0;
    const within = this.account.points() % threshold;
    return Math.round((within / threshold) * 100);
  });

  readonly referralEnabled = computed(() => this.settings.settings().referral.enabled);

  readonly justCopied = signal(false);

  ngOnInit(): void {
    this.seo.set('account.title');
    this.seo.noIndex();
  }

  currentStep(order: Order): number {
    return this.steps.indexOf(order.status);
  }

  async copyLink(): Promise<void> {
    const link = this.account.referralLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      this.justCopied.set(true);
      this.toast.success('referral.copied');
      setTimeout(() => this.justCopied.set(false), 2000);
    } catch {
      this.toast.error('common.error');
    }
  }

  /** Partage natif si disponible, sinon repli sur WhatsApp. */
  async share(): Promise<void> {
    const link = this.account.referralLink();
    if (!link) return;

    const message =
      this.language.current() === 'en'
        ? `Order from ${environment.restaurant.name} with my referral link and we both get a treat! ${link}`
        : `Commande chez ${environment.restaurant.name} avec mon lien de parrainage, on y gagne tous les deux ! ${link}`;

    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ text: message, url: link });
        return;
      } catch {
        /* partage annulé : on ne fait rien */
        return;
      }
    }
    // Repli : ouvre WhatsApp avec le message pré-rempli.
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.toast.info('toast.loggedOut');
    await this.router.navigate(['/']);
  }
}
