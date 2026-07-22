import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { SeoService } from '../../core/services/seo.service';
import { SettingsService } from '../../core/services/settings.service';

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
  readonly settings = inject(SettingsService);

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
}
