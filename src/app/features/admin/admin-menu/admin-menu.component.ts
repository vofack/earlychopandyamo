import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ImageUploadService } from '../../../core/services/image-upload.service';
import { LanguageService } from '../../../core/services/language.service';
import { MenuService } from '../../../core/services/menu.service';
import { ToastService } from '../../../core/services/toast.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import {
  ALLERGENS,
  Allergen,
  Dish,
  DISH_CATEGORIES,
  DishCategory,
  DishInput,
} from '../../../shared/models/dish.model';
import { LocalizedPipe } from '../../../shared/pipes/localized.pipe';

@Component({
  selector: 'app-admin-menu',
  imports: [ReactiveFormsModule, CurrencyPipe, TranslatePipe, LocalizedPipe, SkeletonComponent],
  templateUrl: './admin-menu.component.html',
  styleUrl: './admin-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMenuComponent {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  readonly menu = inject(MenuService);
  readonly images = inject(ImageUploadService);
  readonly language = inject(LanguageService);

  readonly categories = DISH_CATEGORIES;
  readonly allergens = ALLERGENS;

  /** Onglet de langue actif dans le formulaire. */
  readonly formLang = signal<'fr' | 'en'>('fr');

  /** Plat en cours de modification, `null` en mode création. */
  readonly editing = signal<Dish | null>(null);

  readonly saving = signal(false);
  readonly selectedAllergens = signal<Set<Allergen>>(new Set());

  readonly form = this.fb.nonNullable.group({
    nameFr: ['', [Validators.required]],
    nameEn: [''],
    descriptionFr: ['', [Validators.required]],
    descriptionEn: [''],
    price: [0, [Validators.required, Validators.min(0.01)]],
    // Typé sur l'union complète, pas sur le littéral : `'main' as const`
    // figerait le contrôle au seul type "main" et interdirait de charger un
    // plat d'une autre catégorie en édition.
    category: ['main' as DishCategory, [Validators.required]],
    emoji: ['🍲', [Validators.required]],
    imageUrl: [''],
    isPopular: [false],
    isAvailable: [true],
    isVegetarian: [false],
    isSpicy: [false],
  });

  /** Aperçu live de l'image : seule vérification fiable d'une URL collée. */
  readonly previewUrl = computed(() => this.form.controls.imageUrl.value?.trim() || '');

  readonly isEditing = computed(() => this.editing() !== null);

  toggleAllergen(allergen: Allergen): void {
    this.selectedAllergens.update((set) => {
      const next = new Set(set);
      next.has(allergen) ? next.delete(allergen) : next.add(allergen);
      return next;
    });
  }

  hasAllergen(allergen: Allergen): boolean {
    return this.selectedAllergens().has(allergen);
  }

  /** Charge un plat existant dans le formulaire. */
  startEdit(dish: Dish): void {
    this.editing.set(dish);
    this.form.setValue({
      nameFr: dish.name.fr,
      nameEn: dish.name.en ?? '',
      descriptionFr: dish.description.fr,
      descriptionEn: dish.description.en ?? '',
      price: dish.price,
      category: dish.category,
      emoji: dish.emoji,
      imageUrl: dish.imageUrl ?? '',
      isPopular: dish.isPopular,
      isAvailable: dish.isAvailable,
      isVegetarian: dish.isVegetarian,
      isSpicy: dish.isSpicy,
    });
    this.selectedAllergens.set(new Set(dish.allergens ?? []));
    this.formLang.set('fr');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.form.reset({ emoji: '🍲', category: 'main', isAvailable: true, price: 0 });
    this.selectedAllergens.set(new Set());
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!this.images.isAcceptableFile(file)) {
      this.toast.error('admin.menu.imageInvalid');
      input.value = '';
      return;
    }

    try {
      const url = await this.images.upload(file);
      this.form.controls.imageUrl.setValue(url);
      this.toast.success('toast.dishUpdated');
    } catch (error) {
      // Le détail (preset absent, quota…) part en console pour le diagnostic ;
      // le restaurateur reçoit un message actionnable qui rappelle qu'il peut
      // toujours coller une URL en dépannage.
      console.error('[admin-menu] téléversement échoué', error);
      this.toast.error('admin.menu.imageUploadFailed');
    } finally {
      input.value = '';
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Le champ fautif est peut-être sur l'onglet français alors que
      // l'utilisateur est sur l'anglais : on l'y ramène.
      if (this.form.controls.nameFr.invalid || this.form.controls.descriptionFr.invalid) {
        this.formLang.set('fr');
      }
      return;
    }

    this.saving.set(true);
    const v = this.form.getRawValue();

    const input: DishInput = {
      // `en` reste indéfini si vide : le pipe `localized` retombera sur le
      // français plutôt que d'afficher une chaîne vide au client.
      name: { fr: v.nameFr.trim(), en: v.nameEn.trim() || undefined },
      description: { fr: v.descriptionFr.trim(), en: v.descriptionEn.trim() || undefined },
      price: Number(v.price),
      category: v.category,
      emoji: v.emoji.trim() || '🍲',
      imageUrl: v.imageUrl.trim() || undefined,
      isPopular: v.isPopular,
      isAvailable: v.isAvailable,
      isVegetarian: v.isVegetarian,
      isSpicy: v.isSpicy,
      allergens: [...this.selectedAllergens()],
    };

    try {
      const current = this.editing();
      if (current) {
        await this.menu.updateDish(current.id, input);
        this.toast.success('toast.dishUpdated');
      } else {
        await this.menu.addDish(input);
        this.toast.success('toast.dishAdded');
      }
      this.cancelEdit();
    } catch (error) {
      console.error('[admin-menu] enregistrement échoué', error);
      this.toast.error('common.errorNetwork');
    } finally {
      this.saving.set(false);
    }
  }

  async toggleAvailability(dish: Dish): Promise<void> {
    try {
      await this.menu.toggleAvailability(dish);
    } catch (error) {
      console.error('[admin-menu] bascule de disponibilité échouée', error);
      this.toast.error('common.errorNetwork');
    }
  }

  async remove(dish: Dish): Promise<void> {
    const name =
      this.language.current() === 'en' ? dish.name.en?.trim() || dish.name.fr : dish.name.fr;
    const message = this.translate.instant('admin.menu.deleteConfirm', { name });
    if (!confirm(message)) return;

    try {
      await this.menu.deleteDish(dish.id);
      this.toast.success('toast.dishDeleted');
      // Si le plat supprimé était en cours d'édition, on vide le formulaire
      // pour éviter d'enregistrer sur un document qui n'existe plus.
      if (this.editing()?.id === dish.id) this.cancelEdit();
    } catch (error) {
      console.error('[admin-menu] suppression échouée', error);
      this.toast.error('common.errorNetwork');
    }
  }
}
