import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { LanguageService } from '../../../core/services/language.service';
import { LoyaltyService } from '../../../core/services/loyalty.service';
import { SettingsService } from '../../../core/services/settings.service';
import { ToastService } from '../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { freeMealsAvailable, UserProfile } from '../../../shared/models/user.model';

@Component({
  selector: 'app-admin-customers',
  imports: [CurrencyPipe, DatePipe, TranslatePipe, SkeletonComponent, EmptyStateComponent],
  templateUrl: './admin-customers.component.html',
  styleUrl: './admin-customers.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCustomersComponent {
  private readonly loyalty = inject(LoyaltyService);
  private readonly settings = inject(SettingsService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  readonly language = inject(LanguageService);

  /** `undefined` tant que le premier lot n'est pas arrivé (squelettes). */
  private readonly usersRaw = toSignal(this.loyalty.watchAllUsers(), { initialValue: undefined });

  readonly loading = computed(() => this.usersRaw() === undefined);

  readonly search = signal('');

  /**
   * Index code→client : permet d'afficher « parrainé par [nom] » plutôt que le
   * code brut, en résolvant `referredBy` vers le profil du parrain.
   */
  private readonly byCode = computed(() => {
    const map = new Map<string, UserProfile>();
    for (const u of this.usersRaw() ?? []) {
      if (u.referralCode) map.set(u.referralCode, u);
    }
    return map;
  });

  readonly filtered = computed<UserProfile[]>(() => {
    const term = this.search().trim().toLowerCase();
    const list = this.usersRaw() ?? [];
    if (!term) return list;
    return list.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.referralCode?.toLowerCase().includes(term),
    );
  });

  readonly totalCustomers = computed(() => (this.usersRaw() ?? []).length);

  freeMeals(u: UserProfile): number {
    return freeMealsAvailable(u.points, this.settings.settings().referral.pointsForFreeMeal);
  }

  /** Nom du parrain d'un client, ou null. */
  referrerName(u: UserProfile): string | null {
    if (!u.referredBy) return null;
    const referrer = this.byCode().get(u.referredBy);
    return referrer?.displayName || referrer?.email || u.referredBy;
  }

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  async adjust(u: UserProfile, delta: number): Promise<void> {
    try {
      await this.loyalty.adjustPoints(u.uid, delta);
      this.toast.success('toast.statusUpdated');
    } catch (error) {
      console.error('[admin-customers] ajustement échoué', error);
      this.toast.error('common.errorNetwork');
    }
  }

  /** Ajustement d'un montant libre, saisi via une invite. */
  async adjustCustom(u: UserProfile): Promise<void> {
    const raw = prompt(this.translate.instant('admin.customers.adjustPrompt', { name: u.displayName }));
    if (raw === null) return;
    const delta = Number(raw.trim());
    if (!Number.isFinite(delta) || delta === 0) return;
    await this.adjust(u, Math.trunc(delta));
  }
}
