import { inject, Pipe, PipeTransform } from '@angular/core';
import { LanguageService } from '../../core/services/language.service';
import { LocalizedText } from '../models/dish.model';

/**
 * Affiche le champ correspondant à la langue active d'un texte saisi en admin.
 *
 * Repli délibéré sur le français quand la traduction anglaise est absente ou
 * vide : un plat ajouté en vitesse pendant le service doit rester lisible et
 * commandable, jamais apparaître comme une case vide.
 *
 * Le pipe est `pure: false` car il dépend d'un signal externe (la langue) et
 * non uniquement de son argument. Le coût est négligeable ici : la transformée
 * est une simple lecture de propriété.
 */
@Pipe({ name: 'localized', pure: false })
export class LocalizedPipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(value: LocalizedText | null | undefined): string {
    if (!value) return '';
    if (this.language.current() === 'en') {
      return value.en?.trim() || value.fr;
    }
    return value.fr;
  }
}
