import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';

/**
 * Titre et description par page.
 *
 * ⚠️ Portée réelle : Google exécute le JavaScript et verra donc bien ces
 * balises. Les robots de Facebook, WhatsApp et iMessage, eux, ne l'exécutent
 * pas — ils ne liront que les balises statiques présentes dans index.html.
 * Le partage d'une page profonde affichera donc l'aperçu générique du site.
 * Corriger cela imposerait le rendu côté serveur, écarté ici car
 * incompatible avec Firebase Auth au prérendu.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly translate = inject(TranslateService);

  /**
   * @param titleKey Clé de traduction du titre de page.
   * @param descriptionKey Clé de traduction de la méta description.
   */
  set(titleKey: string, descriptionKey?: string): void {
    const brand = this.translate.instant('nav.brand');
    const pageTitle = this.translate.instant(titleKey);

    this.title.setTitle(pageTitle === titleKey ? brand : `${pageTitle} — ${brand}`);

    if (descriptionKey) {
      const description = this.translate.instant(descriptionKey);
      if (description !== descriptionKey) {
        this.meta.updateTag({ name: 'description', content: description });
      }
    }
  }

  /** Retire une page des index de recherche (espace admin, suivi client). */
  noIndex(): void {
    this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
  }

  allowIndex(): void {
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
  }
}
