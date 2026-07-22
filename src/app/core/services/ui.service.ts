import { Injectable, signal } from '@angular/core';

/**
 * État d'interface partagé entre composants qui ne sont pas parents/enfants
 * (la navbar ouvre le tiroir panier, la barre mobile aussi, le tiroir se
 * ferme lui-même). Un service évite de faire remonter des événements à
 * travers tout l'arbre.
 */
@Injectable({ providedIn: 'root' })
export class UiService {
  readonly cartOpen = signal(false);
  readonly mobileNavOpen = signal(false);

  openCart(): void {
    this.cartOpen.set(true);
    this.mobileNavOpen.set(false);
    this.lockScroll(true);
  }

  closeCart(): void {
    this.cartOpen.set(false);
    this.lockScroll(false);
  }

  toggleMobileNav(): void {
    const next = !this.mobileNavOpen();
    this.mobileNavOpen.set(next);
    this.lockScroll(next);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
    this.lockScroll(false);
  }

  /** Empêche la page de défiler derrière un panneau ouvert. */
  private lockScroll(locked: boolean): void {
    document.body.style.overflow = locked ? 'hidden' : '';
  }
}
