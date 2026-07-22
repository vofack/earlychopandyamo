import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter, map, startWith } from 'rxjs';

import { AccountService } from './core/services/account.service';
import { CartService } from './core/services/cart.service';
import { SettingsService } from './core/services/settings.service';
import { CartComponent } from './features/cart/cart.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { MobileCartBarComponent } from './shared/components/mobile-cart-bar/mobile-cart-bar.component';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { ToastComponent } from './shared/components/toast/toast.component';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    NavbarComponent,
    FooterComponent,
    CartComponent,
    ToastComponent,
    MobileCartBarComponent,
    TranslatePipe,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);
  private readonly settings = inject(SettingsService);
  private readonly account = inject(AccountService);

  constructor() {
    // Les frais de livraison vivent dans Firestore, mais CartService reste
    // volontairement ignorant de la base : il ne connaît qu'un montant. Ce
    // pont, posé une seule fois à la racine, transmet le réglage courant sans
    // coupler le panier à Firestore.
    effect(() => this.cart.deliveryFee.set(this.settings.deliveryFee()));

    // Capture un éventuel `?ref=CODE` de parrainage dès l'arrivée sur le site,
    // avant même toute connexion. Le code est mémorisé et sera rattaché au
    // profil à la création du compte. On lit `window.location` plutôt que
    // l'ActivatedRoute racine, qui n'expose pas les query params au démarrage.
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) this.account.stashReferral(ref);
  }

  /**
   * URL courante, suivie en signal.
   *
   * `startWith` couvre le tout premier rendu : à ce moment aucun
   * NavigationEnd n'a encore été émis, et sans valeur initiale le shell
   * public clignoterait sur un chargement direct de /admin.
   */
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  /** L'espace admin a sa propre navigation : pas de chrome public dessus. */
  readonly isAdminArea = computed(() => this.url().startsWith('/admin'));

  /** La barre panier mobile n'a pas lieu d'être sur le checkout lui-même. */
  readonly showMobileCartBar = computed(
    () => !this.isAdminArea() && !this.url().startsWith('/checkout'),
  );
}
