import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { CartService } from '../../../core/services/cart.service';
import { LanguageService } from '../../../core/services/language.service';
import { UiService } from '../../../core/services/ui.service';

/**
 * Barre panier fixe en bas d'écran, sur mobile uniquement.
 *
 * Sur petit écran, l'icône panier de la navbar passe largement inaperçue.
 * Cette barre — le motif retenu par toutes les grandes plateformes de
 * livraison — garde en permanence le montant et l'accès au panier sous le
 * pouce. Elle disparaît quand le panier est vide et sur le checkout, où elle
 * ferait doublon.
 */
@Component({
  selector: 'app-mobile-cart-bar',
  imports: [CurrencyPipe, TranslatePipe],
  template: `
    @if (cart.count() > 0) {
      <button type="button" class="bar" (click)="ui.openCart()">
        <span class="bar__count" aria-hidden="true">{{ cart.count() }}</span>
        <span class="bar__label">{{ 'cart.viewCart' | translate }}</span>
        <span class="bar__total">
          {{ cart.total() | currency: 'CAD' : 'symbol-narrow' : '1.2-2' : language.locale() }}
        </span>
      </button>
    }
  `,
  styleUrl: './mobile-cart-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileCartBarComponent {
  readonly cart = inject(CartService);
  readonly ui = inject(UiService);
  readonly language = inject(LanguageService);
}
