import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, HostListener, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { CartService } from '../../core/services/cart.service';
import { LanguageService } from '../../core/services/language.service';
import { SettingsService } from '../../core/services/settings.service';
import { UiService } from '../../core/services/ui.service';
import { LocalizedPipe } from '../../shared/pipes/localized.pipe';

@Component({
  selector: 'app-cart',
  imports: [CurrencyPipe, TranslatePipe, LocalizedPipe],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartComponent {
  readonly cart = inject(CartService);
  readonly ui = inject(UiService);
  readonly settings = inject(SettingsService);
  readonly language = inject(LanguageService);
  private readonly router = inject(Router);

  /** Montant manquant pour atteindre le minimum de commande, 0 s'il est atteint. */
  readonly missingForMin = computed(() => {
    const missing = this.settings.minOrder() - this.cart.subtotal();
    return missing > 0 ? missing : 0;
  });

  readonly canCheckout = computed(
    () => !this.cart.isEmpty() && this.missingForMin() === 0 && this.settings.isOpenNow(),
  );

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.ui.cartOpen()) this.ui.closeCart();
  }

  goToCheckout(): void {
    this.ui.closeCart();
    this.router.navigate(['/checkout']);
  }
}
