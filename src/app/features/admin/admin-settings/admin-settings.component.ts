import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

import { SettingsService } from '../../../core/services/settings.service';
import { ToastService } from '../../../core/services/toast.service';
import { DayHours, Settings, WeekHours } from '../../../shared/models/settings.model';

@Component({
  selector: 'app-admin-settings',
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: './admin-settings.component.html',
  styleUrl: './admin-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminSettingsComponent {
  private readonly fb = inject(FormBuilder);
  private readonly settings = inject(SettingsService);
  private readonly toast = inject(ToastService);

  readonly saving = signal(false);
  readonly weekDays = [0, 1, 2, 3, 4, 5, 6];

  /** Évite d'écraser une saisie en cours à chaque émission de Firestore. */
  private hydrated = false;

  readonly form = this.fb.nonNullable.group({
    isOpen: [true],
    deliveryFee: [0, [Validators.required, Validators.min(0)]],
    minOrder: [0, [Validators.required, Validators.min(0)]],
    deliveryPostalCodes: [''],
    openingHours: this.fb.array(
      Array.from({ length: 7 }, () =>
        this.fb.nonNullable.group({
          open: ['11:00', Validators.required],
          close: ['22:00', Validators.required],
          closed: [false],
        }),
      ),
    ),
    referral: this.fb.nonNullable.group({
      enabled: [true],
      pointsPerReferral: [1, [Validators.required, Validators.min(0)]],
      pointsForFreeMeal: [3, [Validators.required, Validators.min(1)]],
      freeMealCredit: [20, [Validators.required, Validators.min(0)]],
      welcomePerkAmount: [5, [Validators.required, Validators.min(0)]],
      emailOnStatusChange: [true],
    }),
  });

  get hoursArray(): FormArray {
    return this.form.get('openingHours') as FormArray;
  }

  constructor() {
    // Le flux Firestore est temps réel : sans ce garde, une émission arrivée
    // pendant que le restaurateur tape effacerait sa saisie en cours.
    effect(() => {
      const current = this.settings.settings();
      if (this.hydrated) return;

      this.form.patchValue({
        isOpen: current.isOpen,
        deliveryFee: current.deliveryFee,
        minOrder: current.minOrder,
        deliveryPostalCodes: current.deliveryPostalCodes.join(', '),
        referral: current.referral,
      });

      current.openingHours.forEach((day, i) => this.hoursArray.at(i).patchValue(day));
      this.hydrated = true;
    });
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const v = this.form.getRawValue();

    const payload: Settings = {
      isOpen: v.isOpen,
      deliveryFee: Number(v.deliveryFee),
      minOrder: Number(v.minOrder),
      // « H2X, h2j , H3B » → ['H2X', 'H2J', 'H3B']
      deliveryPostalCodes: v.deliveryPostalCodes
        .split(',')
        .map((code) => code.trim().toUpperCase())
        .filter(Boolean),
      openingHours: v.openingHours as WeekHours,
      referral: {
        enabled: v.referral.enabled,
        pointsPerReferral: Number(v.referral.pointsPerReferral),
        pointsForFreeMeal: Number(v.referral.pointsForFreeMeal),
        freeMealCredit: Number(v.referral.freeMealCredit),
        welcomePerkAmount: Number(v.referral.welcomePerkAmount),
        emailOnStatusChange: v.referral.emailOnStatusChange,
      },
    };

    try {
      await this.settings.save(payload);
      this.toast.success('toast.settingsSaved');
    } catch (error) {
      console.error('[admin-settings] enregistrement échoué', error);
      this.toast.error('common.errorNetwork');
    } finally {
      this.saving.set(false);
    }
  }

  /** Typage du contrôle d'un jour, pour le gabarit. */
  dayControl(index: number): DayHours {
    return this.hoursArray.at(index).value as DayHours;
  }
}
