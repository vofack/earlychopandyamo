import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { AccountService } from '../../../core/services/account.service';
import { AuthService } from '../../../core/services/auth.service';
import { CartService } from '../../../core/services/cart.service';
import { LanguageService } from '../../../core/services/language.service';
import { ToastService } from '../../../core/services/toast.service';
import { UiService } from '../../../core/services/ui.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  readonly cart = inject(CartService);
  readonly ui = inject(UiService);
  readonly language = inject(LanguageService);
  readonly auth = inject(AuthService);
  readonly account = inject(AccountService);
  private readonly toast = inject(ToastService);

  /** Empêche un double-clic de lancer deux popups Google. */
  readonly signingIn = signal(false);

  /** Passe la navbar en mode compact/ombré dès que la page défile. */
  readonly scrolled = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 12);
  }

  /** Échap ferme le menu mobile — attendu par tout utilisateur au clavier. */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.ui.mobileNavOpen()) this.ui.closeMobileNav();
  }

  toggleLanguage(): void {
    this.language.toggle();
  }

  async signInWithGoogle(): Promise<void> {
    if (this.signingIn()) return;
    this.signingIn.set(true);
    this.ui.closeMobileNav();
    try {
      await this.auth.signInWithGoogle();
    } catch (error) {
      // Le code Firebase brut est journalisé pour le diagnostic ; l'utilisateur
      // reçoit un message précis et actionnable selon la cause.
      console.error('[signin] échec Google', error);
      const kind = this.auth.mapError(error);
      // Fermer la popup soi-même n'est pas une vraie erreur : on reste muet.
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
