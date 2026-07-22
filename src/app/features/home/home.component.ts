import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AuthService } from '../../core/services/auth.service';
import { SeoService } from '../../core/services/seo.service';
import { SettingsService } from '../../core/services/settings.service';
import { ToastService } from '../../core/services/toast.service';

interface Feature {
  icon: string;
  key: string;
}

interface Review {
  key: string;
  stars: number;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);
  readonly settings = inject(SettingsService);
  readonly auth = inject(AuthService);

  /** Évite qu'un double clic ouvre deux fenêtres Google. */
  readonly signingIn = signal(false);

  /** Les textes vivent dans les fichiers i18n ; ici uniquement la structure. */
  readonly features: Feature[] = [
    { icon: '🚚', key: 'item1' },
    { icon: '🍲', key: 'item2' },
    { icon: '🥬', key: 'item3' },
    { icon: '⏱️', key: 'item4' },
    { icon: '💳', key: 'item5' },
    { icon: '📍', key: 'item6' },
  ];

  readonly reviews: Review[] = [
    { key: 'r1', stars: 5 },
    { key: 'r2', stars: 5 },
    { key: 'r3', stars: 5 },
  ];

  readonly pills = ['delivery', 'time', 'fresh', 'homemade'];

  ngOnInit(): void {
    this.seo.set('home.title', 'home.subtitle');
    this.seo.allowIndex();
  }

  /** Répète une étoile `n` fois dans le gabarit. */
  starsOf(n: number): number[] {
    return Array.from({ length: n }, (_, i) => i);
  }

  /**
   * Connexion/inscription Google depuis la bannière.
   *
   * Même comportement que le bouton de la navbar : fermer la fenêtre soi-même
   * n'est pas une erreur, et les causes de configuration (provider désactivé,
   * domaine non autorisé) donnent un message précis plutôt qu'un générique.
   */
  async signInWithGoogle(): Promise<void> {
    if (this.signingIn()) return;
    this.signingIn.set(true);
    try {
      await this.auth.signInWithGoogle();
    } catch (error) {
      console.error('[home] connexion Google échouée', error);
      const kind = this.auth.mapError(error);
      if (kind === 'popupClosed') return;

      const key: Record<string, string> = {
        notEnabled: 'account.errors.notEnabled',
        unauthorizedDomain: 'account.errors.unauthorizedDomain',
        popupBlocked: 'account.errors.popupBlocked',
      };
      this.toast.error(key[kind] ?? 'common.error');
    } finally {
      this.signingIn.set(false);
    }
  }
}
