import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SkeletonVariant = 'card' | 'row' | 'text' | 'stat';

/**
 * Squelette de chargement.
 *
 * Préféré à un spinner : en reproduisant la forme du contenu à venir, il
 * réduit le temps d'attente perçu et évite le saut de mise en page quand les
 * vraies données arrivent.
 */
@Component({
  selector: 'app-skeleton',
  template: `
    @for (i of repeatArray(); track i) {
      <div class="sk" [class]="'sk--' + variant()" aria-hidden="true">
        @switch (variant()) {
          @case ('card') {
            <div class="sk__media"></div>
            <div class="sk__line sk__line--title"></div>
            <div class="sk__line"></div>
            <div class="sk__line sk__line--short"></div>
            <div class="sk__foot">
              <div class="sk__price"></div>
              <div class="sk__btn"></div>
            </div>
          }
          @case ('row') {
            <div class="sk__avatar"></div>
            <div class="sk__rowbody">
              <div class="sk__line sk__line--title"></div>
              <div class="sk__line sk__line--short"></div>
            </div>
          }
          @case ('stat') {
            <div class="sk__line sk__line--short"></div>
            <div class="sk__line sk__line--big"></div>
          }
          @default {
            <div class="sk__line"></div>
          }
        }
      </div>
    }

    <!-- Annonce l'attente une seule fois, plutôt qu'une fois par squelette. -->
    <span class="sr-only" role="status">{{ label() }}</span>
  `,
  styleUrl: './skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonComponent {
  readonly variant = input<SkeletonVariant>('card');
  readonly count = input(1);
  readonly label = input('');

  repeatArray(): number[] {
    return Array.from({ length: this.count() }, (_, i) => i);
  }
}
