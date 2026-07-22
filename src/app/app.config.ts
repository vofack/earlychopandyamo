import { registerLocaleData } from '@angular/common';
import localeEnCa from '@angular/common/locales/en-CA';
import localeFrCa from '@angular/common/locales/fr-CA';
import { provideHttpClient, withFetch } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { initializeFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';

import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { LanguageService } from './core/services/language.service';

// Nécessaire pour que CurrencyPipe et DatePipe formatent correctement
// selon la langue active (« 24,50 $ » en français, « $24.50 » en anglais).
registerLocaleData(localeFrCa);
registerLocaleData(localeEnCa);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    // Zoneless : zone.js est retiré des polyfills dans angular.json.
    // Conséquence à respecter partout dans le code : tout état asynchrone
    // doit transiter par un signal ou par AsyncPipe. Un callback Firestore
    // brut écrivant dans un champ de classe ne rafraîchirait pas la vue.
    provideZonelessChangeDetection(),

    // Pas de `provideAnimations()` : toutes les animations de l'application
    // sont des @keyframes CSS. Charger le moteur d'animations d'Angular
    // n'apporterait rien et alourdirait le bundle initial — d'autant que
    // @angular/animations est déprécié depuis Angular 20.

    provideRouter(
      routes,
      // Remonte en haut à chaque navigation, sauf retour arrière où l'on
      // restaure la position précédente.
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),

    // `withFetch` évite XHR : requis par ngx-translate pour charger les JSON.
    provideHttpClient(withFetch()),

    provideTranslateService({
      loader: provideTranslateHttpLoader({
        prefix: '/i18n/',
        suffix: '.json',
      }),
      fallbackLang: 'fr',
      lang: 'fr',
    }),

    // Applique la langue mémorisée (ou celle du navigateur) avant le premier
    // rendu, pour éviter un flash de contenu en français chez un anglophone.
    provideAppInitializer(() => inject(LanguageService).init()),

    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() =>
      // `ignoreUndefinedProperties` : sans cette option, le SDK Firestore
      // REJETTE toute écriture contenant un champ `undefined`, y compris
      // imbriqué. Or un plat sans photo a `imageUrl: undefined`, valeur qui
      // se propage jusqu'aux lignes de commande. Sans ce réglage, ajouter un
      // plat sans image OU commander un tel plat échouerait. On laisse donc
      // Firestore ignorer ces champs plutôt que planter.
      initializeFirestore(getApp(), { ignoreUndefinedProperties: true }),
    ),
    provideAuth(() => getAuth()),
    provideStorage(() => getStorage(getApp())),

    // Le service worker ne s'enregistre qu'en build de production servi en
    // HTTP(S) — `ng serve` ne l'active jamais, c'est voulu.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
