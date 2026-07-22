import { DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Lang } from '../../shared/models/dish.model';

const STORAGE_KEY = 'ecy.lang';
const SUPPORTED: readonly Lang[] = ['fr', 'en'] as const;

/**
 * Langue de l'interface.
 *
 * Ordre de priorité : choix mémorisé > langue du navigateur > français.
 * Le français est le défaut assumé — le restaurant est à Montérégieet le
 * contenu source est saisi en français.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);

  /** Langue active, exposée en signal pour être consommée en zoneless. */
  readonly current = signal<Lang>('fr');

  /** Locale complète, pour CurrencyPipe et DatePipe. */
  readonly locale = signal<string>('fr-CA');

  init(): void {
    const stored = this.readStored();
    const detected = stored ?? this.detectFromBrowser();
    this.translate.setFallbackLang('fr');
    this.use(detected);
  }

  use(lang: Lang): void {
    if (!SUPPORTED.includes(lang)) return;

    this.translate.use(lang);
    this.current.set(lang);
    this.locale.set(lang === 'fr' ? 'fr-CA' : 'en-CA');

    // Indispensable pour les lecteurs d'écran (prononciation) et pour le SEO.
    this.document.documentElement.lang = lang === 'fr' ? 'fr-CA' : 'en-CA';

    this.persist(lang);
  }

  toggle(): void {
    this.use(this.current() === 'fr' ? 'en' : 'fr');
  }

  private detectFromBrowser(): Lang {
    // `navigator.language` renvoie par exemple « en-US » ou « fr-CA ».
    const nav = this.document.defaultView?.navigator?.language ?? 'fr';
    return nav.toLowerCase().startsWith('en') ? 'en' : 'fr';
  }

  private readStored(): Lang | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw === 'fr' || raw === 'en' ? raw : null;
    } catch {
      // localStorage lève en navigation privée sur certains Safari.
      return null;
    }
  }

  private persist(lang: Lang): void {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Le choix ne survivra pas au rechargement — sans gravité.
    }
  }
}
