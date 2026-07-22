import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * État vide illustré.
 *
 * Un écran vide sans explication laisse l'utilisateur penser que
 * l'application est cassée. Ce composant impose donc toujours un titre, un
 * texte, et — quand une suite est possible — une action pour s'en sortir.
 */
@Component({
  selector: 'app-empty-state',
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="empty">
      <div class="empty__icon" aria-hidden="true">{{ icon() }}</div>
      <h2 class="empty__title">{{ titleKey() | translate }}</h2>
      <p class="empty__text">{{ textKey() | translate }}</p>

      @if (ctaKey() && ctaLink()) {
        <a class="btn btn--primary" [routerLink]="ctaLink()">{{ ctaKey()! | translate }}</a>
      } @else if (ctaKey()) {
        <button type="button" class="btn btn--ghost" (click)="action.emit()">
          {{ ctaKey()! | translate }}
        </button>
      }
    </div>
  `,
  styleUrl: './empty-state.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly icon = input('🍽️');
  readonly titleKey = input.required<string>();
  readonly textKey = input.required<string>();
  readonly ctaKey = input<string | null>(null);
  /** Renseigné ⇒ l'action est un lien de navigation ; sinon un bouton. */
  readonly ctaLink = input<string | null>(null);

  readonly action = output<void>();
}
