import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageService } from '../../core/services/language.service';
import { MenuService } from '../../core/services/menu.service';
import { SeoService } from '../../core/services/seo.service';
import { DishCardComponent } from '../../shared/components/dish-card/dish-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../shared/components/skeleton/skeleton.component';
import { Dish, DISH_CATEGORIES, DishCategory } from '../../shared/models/dish.model';

type CategoryFilter = DishCategory | 'all';

@Component({
  selector: 'app-menu',
  imports: [TranslatePipe, DishCardComponent, SkeletonComponent, EmptyStateComponent],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly language = inject(LanguageService);
  readonly menu = inject(MenuService);

  readonly categories: CategoryFilter[] = ['all', ...DISH_CATEGORIES];

  readonly activeCategory = signal<CategoryFilter>('all');
  readonly search = signal('');
  readonly onlyVegetarian = signal(false);
  readonly onlySpicy = signal(false);
  readonly noPeanut = signal(false);

  /**
   * Filtrage entièrement dérivé : aucune liste intermédiaire à maintenir,
   * tout se recalcule automatiquement quand un critère ou le menu change.
   */
  readonly filtered = computed<Dish[]>(() => {
    const term = this.search().trim().toLowerCase();
    const category = this.activeCategory();
    const lang = this.language.current();

    return this.menu.availableDishes().filter((dish) => {
      if (category !== 'all' && dish.category !== category) return false;
      if (this.onlyVegetarian() && !dish.isVegetarian) return false;
      if (this.onlySpicy() && !dish.isSpicy) return false;
      if (this.noPeanut() && dish.allergens?.includes('peanut')) return false;

      if (!term) return true;

      // On cherche dans les deux langues : un client anglophone qui tape
      // « ndolé » doit trouver le plat même si seul le français le nomme ainsi.
      const haystack = [
        dish.name.fr,
        dish.name.en ?? '',
        dish.description.fr,
        dish.description.en ?? '',
      ]
        .join(' ')
        .toLowerCase();

      void lang; // la langue force le recalcul à la bascule FR/EN
      return haystack.includes(term);
    });
  });

  readonly hasActiveFilters = computed(
    () =>
      this.activeCategory() !== 'all' ||
      !!this.search().trim() ||
      this.onlyVegetarian() ||
      this.onlySpicy() ||
      this.noPeanut(),
  );

  /** Distingue « le menu est vide » de « le filtre ne renvoie rien ». */
  readonly menuIsEmpty = computed(
    () => !this.menu.loading() && this.menu.availableDishes().length === 0,
  );

  ngOnInit(): void {
    this.seo.set('menu.title', 'menu.subtitle');
    this.seo.allowIndex();
  }

  setCategory(category: CategoryFilter): void {
    this.activeCategory.set(category);
  }

  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  resetFilters(): void {
    this.activeCategory.set('all');
    this.search.set('');
    this.onlyVegetarian.set(false);
    this.onlySpicy.set(false);
    this.noPeanut.set(false);
  }
}
