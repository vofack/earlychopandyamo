import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { CartService } from '../../../core/services/cart.service';
import { LanguageService } from '../../../core/services/language.service';
import { Dish } from '../../models/dish.model';
import { LocalizedPipe } from '../../pipes/localized.pipe';

@Component({
  selector: 'app-dish-card',
  imports: [CurrencyPipe, TranslatePipe, LocalizedPipe],
  templateUrl: './dish-card.component.html',
  styleUrl: './dish-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DishCardComponent {
  readonly dish = input.required<Dish>();

  readonly cart = inject(CartService);
  readonly language = inject(LanguageService);

  /**
   * Bascule sur l'emoji quand le chargement de la photo échoue (lien
   * Cloudinary supprimé, URL mal collée). Sans ce repli, la carte
   * afficherait une icône d'image cassée.
   */
  readonly imageFailed = signal(false);

  readonly showImage = computed(() => !!this.dish().imageUrl && !this.imageFailed());

  readonly quantity = computed(() => this.cart.quantityOf(this.dish().id));

  /** Nom dans la langue active — utilisé dans les libellés ARIA. */
  readonly displayName = computed(() => {
    const d = this.dish();
    return this.language.current() === 'en' ? d.name.en?.trim() || d.name.fr : d.name.fr;
  });

  add(): void {
    this.cart.add(this.dish());
  }

  decrement(): void {
    this.cart.decrement(this.dish().id);
  }
}
