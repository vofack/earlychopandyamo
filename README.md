# 🍽️ EarlyChop & Yamo

Application de commande en ligne pour le restaurant **EarlyChop & Yamo** (cuisine africaine authentique, Montréal).
Site vitrine + menu + panier + commande, et un espace restaurant temps réel pour gérer commandes, menu et statistiques.

**Bilingue français / anglais**, responsive, installable (PWA), accessible WCAG AA.

---

## ✅ État du projet

**🌐 En ligne : https://earlychopandyamo-a6214.web.app**

| Élément | État |
|---|---|
| Build | 0 erreur, 0 avertissement · 758 kB brut ≈ 206 kB gzip |
| Firebase Firestore | base créée, région `northamerica-northeast1` (Montréal) |
| Règles de sécurité | déployées et **vérifiées par 6 tests** (voir plus bas) |
| Authentification | e-mail/mot de passe activée |
| Hébergement | déployé, réécriture SPA vérifiée sur les routes profondes |
| Clés Firebase | renseignées dans les deux environnements |

### Ce qui reste à faire

1. **Créer le compte administrateur** — Firebase Console → Authentication → Users → Add user
2. **Amorcer le menu** — `npm run seed` (12 plats prêts, voir §6)
3. **Configurer EmailJS** — sans quoi aucun courriel de confirmation ne part. Les commandes sont bien enregistrées et visibles dans `/admin/orders`, mais ni le client ni le restaurant ne reçoivent d'avis. **À faire avant toute mise en service réelle.**
4. **Supprimer la commande de test** — une commande « Test Diagnostic » a été créée pour valider les règles de sécurité. Supprimez-la depuis `/admin/orders`.
5. **Générer les icônes PWA** (voir §Déploiement)

### Limite de vérification assumée

La couche données est prouvée : SDK Node (`getDocs` + `onSnapshot` OK) et 6 tests REST sur les règles. En revanche, **le rendu des données réelles dans l'interface n'a pas pu être vérifié automatiquement** — Chrome headless n'attend pas les requêtes WebChannel de Firestore. Ouvrez le site après l'amorçage pour valider visuellement.

---

## 📋 Prérequis

| Outil | Version | Vérifier |
|---|---|---|
| Node.js | 20.19+ ou 22.12+ | `node -v` |
| npm | 10+ | livré avec Node |
| Firebase CLI | 13+ | `npm i -g firebase-tools` |

---

## 🚀 Démarrage rapide

```bash
npm install          # 1. dépendances
npm start            # 2. → http://localhost:4200
```

L'application démarre même sans configuration Firebase, mais le menu restera vide et la commande échouera tant que les clés ne sont pas renseignées.

---

## 🔥 Configuration Firebase

### 1. Créer le projet

1. [console.firebase.google.com](https://console.firebase.google.com) → **Ajouter un projet**
2. Nommez-le `earlychopandyamo` (si le nom est pris, choisissez-en un autre et **reportez-le dans `.firebaserc`**)
3. Google Analytics est facultatif

### 2. Activer les services

| Service | Où | Réglage |
|---|---|---|
| **Firestore** | Créer une base de données | Mode **production**, région `northamerica-northeast1` (Montréal) |
| **Authentication** | Sign-in method | Activer **Adresse e-mail/Mot de passe** uniquement |

> 🔒 **N'activez jamais l'inscription publique.** Les règles considèrent *tout compte authentifié* comme administrateur. Un compte créé librement obtiendrait les pleins pouvoirs.

### 3. Récupérer les clés

**⚙️ Paramètres du projet** → **Vos applications** → **`</>` Web** → enregistrez l'app. Firebase affiche :

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "earlychopandyamo.firebaseapp.com",
  projectId: "earlychopandyamo",
  storageBucket: "earlychopandyamo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

Recopiez ces 6 valeurs dans **les deux** fichiers, à la place des `'À_REMPLIR'` :

- `src/environments/environment.ts` (développement)
- `src/environments/environment.prod.ts` (production)

> Ces clés sont **publiques par conception** — elles partent dans le bundle du navigateur. Ce n'est pas une faille : la sécurité repose entièrement sur `firestore.rules`.

### 4. Créer le compte administrateur

**Authentication** → **Users** → **Add user** → courriel + mot de passe solide.
C'est ce compte qui ouvrira `/admin/login`.

### 5. Déployer les règles de sécurité

```bash
firebase login
firebase deploy --only firestore:rules
```

**Ne sautez pas cette étape.** Une base laissée en mode test devient publiquement modifiable au bout de 30 jours.

### 6. Amorcer le menu (facultatif)

Un menu de départ de 12 plats ouest-africains est prêt :

```bash
npm run seed
```

Le script demande vos identifiants administrateur — l'écriture dans `dishes` est réservée aux comptes authentifiés, exactement comme depuis l'interface. Il refuse de s'exécuter si la collection contient déjà des plats, pour éviter les doublons.

**Ajustez les prix depuis `/admin/menu` avant la mise en ligne** : ce sont des valeurs d'exemple.

---

## 📧 Configuration EmailJS

Gratuit jusqu'à 200 courriels/mois.

1. Créez un compte sur [emailjs.com](https://www.emailjs.com)
2. **Email Services** → connectez `earlychopandyamo@gmail.com` → notez le **Service ID**
3. **Email Templates** → créez **trois** modèles :

| Modèle | Rôle | Champ d'environnement |
|---|---|---|
| Confirmation client 🇫🇷 | client francophone | `templateClientFr` |
| Confirmation client 🇬🇧 | client anglophone | `templateClientEn` |
| Alerte restaurant | vers `earlychopandyamo@gmail.com` | `templateRestaurant` |

4. **Account → General** → copiez la **Public Key**
5. Renseignez le bloc `emailjs` dans les deux fichiers d'environnement

### Variables disponibles

**Modèles client** — `{{to_name}}`, `{{to_email}}`, `{{order_id}}`, `{{order_items}}`, `{{order_subtotal}}`, `{{order_delivery}}`, `{{order_total}}`, `{{order_address}}`, `{{order_payment}}`, `{{order_notes}}`, `{{delivery_estimate}}`, `{{tracking_url}}`, `{{restaurant_name}}`, `{{restaurant_phone}}`

**Modèle restaurant** — `{{order_id}}`, `{{client_name}}`, `{{client_email}}`, `{{client_phone}}`, `{{order_address}}`, `{{order_items}}`, `{{order_total}}`, `{{order_payment}}`, `{{order_notes}}`, `{{order_lang}}`

> Dans le champ **To Email** de chaque modèle, mettez `{{to_email}}` — sinon tous les courriels partiront vers votre propre adresse.

Sujets suggérés :
`✅ Commande confirmée #{{order_id}} — EarlyChop & Yamo` · `🔔 Nouvelle commande #{{order_id}}`

**Si EmailJS n'est pas configuré**, l'application fonctionne quand même : la commande est enregistrée, un avertissement apparaît en console, et le client voit un message l'invitant à noter son numéro. Rien n'est perdu.

---

## 💬 WhatsApp & SMS — ce qui est possible, et pourquoi

### Ce qui est en place
Un bouton **« Nous écrire sur WhatsApp »** apparaît après chaque commande et dans le pied de page. Il ouvre WhatsApp avec un message pré-rempli contenant le numéro de commande, vers `+1 438 404 2421`. C'est le mécanisme *click-to-chat* officiel : **gratuit, sans compte développeur, sans carte bancaire**.

### Pourquoi pas de SMS ni de WhatsApp automatique
Twilio, l'API WhatsApp Cloud et toutes les passerelles équivalentes exigent un **jeton secret**. Or tout ce que contient cette application est téléchargé par le navigateur de chaque visiteur et **lisible par n'importe qui**. Un jeton Twilio placé ici permettrait à un inconnu d'envoyer des SMS aux frais du restaurant.

L'envoi automatique impose donc un **serveur** — une Cloud Function Firebase, qui requiert le **plan Blaze** (carte bancaire obligatoire, même si la facture resterait à 0 $ à ce volume).

### Pour l'activer plus tard
1. Passez le projet au plan Blaze
2. Ajoutez un dossier `functions/` déclenché sur création de document dans `orders`
3. Stockez le jeton via `firebase functions:secrets:set`

Aucune refonte nécessaire : `notification.service.ts` est déjà structuré pour accueillir ce canal.

---

## 🖼️ Photos des plats

Trois modes, pilotés par `environment.imageUpload.mode`. Le mode par défaut est **`cloudinary`** : un vrai bouton « Choisir une photo » téléverse directement depuis l'ordinateur, gratuitement et sans carte bancaire.

### Mode `cloudinary` (recommandé — upload direct, gratuit)

**Configuration unique (~3 min) :**

1. Créez un compte gratuit sur [cloudinary.com](https://cloudinary.com)
2. Sur le **Dashboard**, notez votre **Cloud name** (ex. `dxy12ab3c`)
3. **Settings ⚙️ → Upload → Upload presets → Add upload preset**
   - **Signing Mode** : passez-le sur **Unsigned** *(crucial — sinon l'upload est refusé)*
   - Notez le **nom du preset** généré (ex. `ml_default` ou celui que vous nommez)
   - **Save**
4. Reportez ces deux valeurs dans `src/environments/environment.ts` **et** `environment.prod.ts` :
   ```ts
   cloudinary: {
     cloudName: 'dxy12ab3c',        // votre Cloud name
     uploadPreset: 'earlychop_up',  // le nom du preset Unsigned
   },
   ```
5. `npm run build && firebase deploy --only hosting`

Ensuite, dans `/admin/menu` : **Choisir une photo** → sélectionnez le fichier → il se téléverse avec une barre de progression et l'aperçu s'affiche. Un lien « Ou coller une URL » reste disponible en dépannage.

> Tant que les deux valeurs sont à `'À_REMPLIR'`, le bouton d'upload est masqué et seul le champ URL est proposé — l'app ne casse jamais.

### Mode `firebase` (upload via Firebase Storage — exige Blaze)

Passez `mode: 'firebase'`, activez le plan Blaze, puis `firebase deploy --only storage`. Même bouton d'upload, tout reste dans Firebase.

### Mode `url` (coller un lien uniquement)

Passez `mode: 'url'`. Aucun téléversement : on colle une URL d'image déjà hébergée.

---

Un plat sans photo affiche son emoji — jamais une image cassée.

---

## 🌍 Bilingue français / anglais

- Traductions dans `public/i18n/fr.json` et `public/i18n/en.json`
- **Aucun texte codé en dur** dans les gabarits : corrigez n'importe quelle formulation sans toucher au code Angular
- Le sélecteur **FR/EN** de la navbar bascule instantanément, sans rechargement
- Le choix est mémorisé ; à la première visite, la langue du navigateur est détectée (français par défaut)

### Contenu des plats
Chaque plat a un nom et une description **dans les deux langues** (onglets *Français* / *English* du formulaire admin).
L'anglais est **facultatif** : laissé vide, le français s'affiche à sa place. Un plat ajouté en vitesse pendant le service reste parfaitement commandable.

### Ajouter une troisième langue
1. Dupliquez `fr.json` en `es.json` et traduisez
2. Ajoutez `'es'` au type `Lang` dans `src/app/shared/models/dish.model.ts`
3. Ajoutez `'es'` à `SUPPORTED` dans `language.service.ts`
4. Ajoutez le bouton correspondant dans la navbar

---

## 🗄️ Structure des données Firestore

### `dishes`
```ts
{
  name: { fr: string, en?: string },
  description: { fr: string, en?: string },
  price: number,
  category: 'main' | 'starter' | 'dessert' | 'drink',
  emoji: string,
  imageUrl?: string,
  isPopular: boolean,
  isAvailable: boolean,
  isVegetarian: boolean,
  isSpicy: boolean,
  allergens: string[],
  createdAt: Timestamp
}
```

### `orders`
```ts
{
  clientName, email, phone, address, postalCode: string,
  items: CartItem[],
  subtotal, deliveryFee, total: number,
  paymentMethod: 'cash' | 'interac' | 'card',
  notes: string,
  status: 'new' | 'confirmed' | 'preparing' | 'delivered',
  lang: 'fr' | 'en',
  statusHistory: { status, at }[],
  createdAt: Timestamp
}
```

### `settings/main`
```ts
{
  deliveryFee: number,       // 0 = livraison gratuite
  minOrder: number,          // 0 = aucun minimum
  isOpen: boolean,
  openingHours: DayHours[7], // index 0 = dimanche
  deliveryPostalCodes: string[]
}
```

Ce document est créé automatiquement au premier enregistrement depuis `/admin/settings`. Tant qu'il n'existe pas, des valeurs par défaut permissives s'appliquent (ouvert, livraison gratuite, aucun minimum) — un client ne sera jamais bloqué par une configuration manquante.

---

## 👥 Comptes clients & parrainage

Chaque visiteur peut créer un **compte optionnel via Google** (bouton dans la navbar). Le compte débloque :
- **Mes commandes** avec suivi en temps réel + **courriel à chaque changement de statut**.
- Un **code de parrainage unique** partageable (lien `?ref=CODE`).
- Des **points** : chaque filleul dont la 1re commande est **livrée** rapporte des points au parrain. **Parrainage double face** — le filleul reçoit aussi une réduction sur sa 1re commande.
- Un **repas gratuit** au seuil de points, appliqué automatiquement au checkout.

Tous les réglages (points par filleul, seuil du repas gratuit, montants) sont dans **Admin → Paramètres → Parrainage & fidélité**. L'écran **Admin → Clients** liste les comptes, les points par parrain, et permet un ajustement manuel.

### ⚠️ Migration de sécurité (déjà appliquée)
Avant les comptes clients, la règle était *« tout utilisateur connecté = admin »*. Ouvrir Google Sign-In sans changer ça aurait donné les droits admin à chaque client. Le modèle est désormais une **liste blanche par UID** : `primaryAdminUid()` dans `firestore.rules` (et `environment.adminUid`) vaut l'UID du compte `earlychopandyamo@gmail.com`. Seul cet UID est admin ; tous les autres comptes sont de simples clients.

> Pour changer d'admin ou en ajouter : modifiez `primaryAdminUid()` dans `firestore.rules` **et** `environment.adminUid` (ils doivent rester identiques), ou ajoutez un document dans la collection `admins/{uid}`.

### Activer Google Sign-In (étape console, à faire une fois)
Console Firebase → **Authentication → Sign-in method → Ajouter → Google** → choisir l'e-mail d'assistance `earlychopandyamo@gmail.com` → **Enregistrer**. C'est ce qui ouvre l'inscription client. Le domaine `earlychopandyamo.web.app` est déjà autorisé automatiquement.

### Anti-fraude (limites assumées, gratuit)
Sans vérification téléphonique (payante), on ne peut empêcher totalement les faux comptes. Garde-fous en place : crédit **uniquement sur commande livrée** (traitée par l'admin), **auto-parrainage refusé**, et l'admin peut voir/ajuster/révoquer les points.

---

## 🔐 Sécurité — modèle retenu

| Collection | Lecture | Écriture |
|---|---|---|
| `dishes` | publique | admin |
| `settings` | publique | admin |
| `orders` | **`get` public**, `list` : admin ou **son propre** userId | création publique validée (userId = auteur), modif/suppression admin |
| `users` | soi-même ou admin | création par soi (valeurs initiales imposées), profil par soi, **points par admin uniquement** |
| `referralCodes` | authentifié | création vers soi uniquement |
| `admins` | son propre statut | admin uniquement |

**Point clé du parrainage** : un client ne peut **jamais** écrire ses propres `points`. Les récompenses sont créditées par le navigateur **admin** (via `LoyaltyService`, en transaction Firestore idempotente) à la livraison. C'est ce qui rend le programme infalsifiable côté client.

Le `get` public sur `orders` permet le suivi client sans compte. Il est protégé par l'**imprévisibilité de l'identifiant Firestore** (20 caractères aléatoires), transmis uniquement par courriel. La distinction `get` / `list` est essentielle : elle empêche quiconque d'**énumérer** les commandes et de lire les données personnelles des autres clients. Un `allow read` global ouvrirait les deux à la fois.

La création de commande est validée côté serveur (champs obligatoires, statut forcé à `new`, total borné, longueurs de chaînes) pour empêcher l'injection de documents arbitraires.

### Tests effectués sur les règles déployées

| # | Test | Attendu | Résultat |
|---|---|---|---|
| 1 | Lecture publique de `dishes` | autorisée | ✅ 200 |
| 2 | `list` public sur `orders` | **refusé** | ✅ 403 |
| 3 | Écriture publique dans `dishes` | **refusé** | ✅ 403 |
| 4 | Création d'une commande valide | autorisée | ✅ créée |
| 5 | Commande avec `status` truqué en `delivered` | **refusé** | ✅ 403 |
| 6 | Commande avec `total` négatif | **refusé** | ✅ 403 |
| 7 | `get` d'une commande par son ID | autorisé | ✅ 200 |
| 8 | `update` du statut sans authentification | **refusé** | ✅ 403 |

Les tests 2 et 7 pris ensemble sont l'essentiel : un client peut suivre **sa** commande via son lien, mais personne ne peut énumérer les commandes des autres.

### Tests du modèle de rôles (après migration comptes clients)

| # | Test | Attendu | Résultat |
|---|---|---|---|
| 1 | Lecture menu anonyme | autorisée | ✅ 200 |
| 2 | Écriture `dishes` anonyme | refusé | ✅ 403 |
| 3 | Liste `users` anonyme | refusé | ✅ 403 |
| 4 | Liste `orders` anonyme | refusé | ✅ 403 |
| 5 | Commande invité (sans userId) | autorisée | ✅ créée |
| 6 | **Commande avec `userId` usurpé** | **refusé** | ✅ 403 |

Le test 6 est le plus important du nouveau modèle : impossible d'attribuer une commande à un autre compte pour lui faire gagner/perdre des points.

---

## 🎨 Design & accessibilité

- **Bleu ciel** `#1B8FD4` · **Or** `#E5A800` · Playfair Display (titres) + Inter (texte)
- Points de rupture : 375 / 768 / 1024 / 1440 px
- Navigation clavier complète, anneaux de focus visibles, libellés ARIA, lien « passer au contenu »
- `prefers-reduced-motion` respecté : toutes les animations se désactivent

### ⚠️ Règle sur l'or — à respecter en cas de modification
L'or `#E5A800` sur blanc ne donne que **~2,3:1**, très en dessous du minimum WCAG AA de 4,5:1.

**L'or est réservé aux aplats, badges et bordures. Il ne doit JAMAIS servir à du texte.**
Pour tout texte de teinte dorée (prix, totaux), utilisez `$gold-text` (`#8A6500`, ~5,4:1).
Même logique pour le bleu : `$blue` convient aux grands titres, `$blue-dark` est requis pour le texte courant.

Tous les jetons sont dans `src/styles/_tokens.scss`.

---

## 📦 Déploiement

```bash
npm run build                        # compile en production
firebase login                       # une seule fois
firebase deploy                      # hosting + règles Firestore
```

Ou en une commande : `npm run deploy`

Le site est publié sur `https://<votre-projet>.web.app`.

> `firebase.json` pointe vers `dist/earlychopandyamo/browser` — chemin réel du builder esbuild d'Angular 20. La réécriture SPA (`**` → `/index.html`) est **obligatoire** : sans elle, rafraîchir `/admin/orders` renvoie un 404.

### Icônes PWA à générer
`public/icons/` doit contenir `icon-192.png`, `icon-512.png` et `icon-512-maskable.png` — emoji 🍽️ sur fond `#1B8FD4`. Générez-les avec [realfavicongenerator.net](https://realfavicongenerator.net) ou :

```bash
npx pwa-asset-generator public/favicon.svg public/icons --background "#1B8FD4" --padding "18%"
```

Sans ces fichiers l'application fonctionne, mais l'installation sur mobile affichera une icône par défaut.

---

## 🧪 Vérifications recommandées

Après `npm install` et `npm run build` :

- [ ] `npm run build` passe sans erreur et `dist/earlychopandyamo/browser/index.html` existe
- [ ] Parcours : accueil → menu → recherche/filtres → ajout au panier → checkout
- [ ] **Zoneless** : ajouter un plat au panier incrémente **immédiatement** le badge de la navbar. S'il reste figé, un flux contourne les signals
- [ ] **Bilingue** : basculer FR↔EN sur chaque page — aucun texte en dur, prix et dates reformatés, choix conservé après rechargement
- [ ] Responsive à 375 / 768 / 1024 / 1440 px — aucun défilement horizontal ; la barre panier mobile n'apparaît que sous 768 px et jamais sur le checkout
- [ ] **Clavier seul** (Tab / Entrée) : tout le site est parcourable, le focus reste visible
- [ ] Ajouter un plat depuis `/admin/menu` → il apparaît sur `/menu` **sans rechargement**
- [ ] Passer une commande dans un onglet, `/admin/orders` ouvert dans un autre → elle apparaît en direct
- [ ] Faire avancer le statut → la page `/suivi/:id` se met à jour **en temps réel**
- [ ] **Garde admin** : se déconnecter puis ouvrir `/admin/orders` → redirection login. Se reconnecter puis **rafraîchir (F5)** → doit rester sur la page admin
- [ ] Passer `isOpen` à `false` dans les paramètres → la bannière apparaît et le checkout se bloque proprement

---

## 🛠️ Dépannage

**`npm install` réclame `--force` ou `--legacy-peer-deps`**
Ne forcez pas. Une version a dérivé. La combinaison validée est Angular 20.3 + `@angular/fire` 20.0.1 + `firebase` 11.10. `@angular/fire` **ne supporte pas encore Angular 21** : sa version 21 est une RC dont les dépendances sont mutuellement incompatibles.

**Le menu reste vide**
Les clés Firebase sont encore à `'À_REMPLIR'`, ou les règles Firestore ne sont pas déployées. Vérifiez la console du navigateur.

**L'admin est renvoyé au login à chaque F5**
Ne devrait pas arriver : `admin.guard.ts` attend le signal `resolved` avant de trancher. Si le problème survient, c'est que cette attente a été retirée.

**Une valeur change en base mais pas à l'écran**
Symptôme classique du mode zoneless : un flux asynchrone ne passe pas par un signal. Tout flux Firestore doit transiter par `toSignal()` ou `AsyncPipe` — un `onSnapshot()` brut écrivant dans un champ de classe ne déclenche aucun rafraîchissement.

**Le service worker ne s'active pas en `npm start`**
Normal et voulu : il ne s'enregistre qu'en build de production servi en HTTP(S). Testez avec `npm run build && firebase serve`.

**Le partage d'un lien sur Facebook/WhatsApp affiche toujours le même aperçu**
Limite assumée. Ces robots n'exécutent pas le JavaScript et ne lisent que les balises statiques de `index.html`. Corriger cela imposerait le rendu côté serveur, écarté car incompatible avec Firebase Auth au prérendu.

---

## 📁 Architecture

```
src/app/
├── core/
│   ├── guards/admin.guard.ts        protection de /admin
│   └── services/
│       ├── auth.service.ts          Firebase Auth + signal `resolved`
│       ├── cart.service.ts          panier 100% signals, sans Firestore
│       ├── menu.service.ts          CRUD plats, temps réel
│       ├── order.service.ts         commandes, temps réel
│       ├── settings.service.ts      horaires, frais, zone
│       ├── notification.service.ts  EmailJS + liens WhatsApp
│       ├── language.service.ts      bascule FR/EN
│       ├── image-upload.service.ts  Storage ou URL
│       ├── toast.service.ts
│       ├── seo.service.ts
│       └── ui.service.ts            tiroir panier, menu mobile
├── shared/
│   ├── components/                  navbar, footer, toast, dish-card,
│   │                                skeleton, empty-state, mobile-cart-bar
│   ├── models/                      dish, order, cart-item, settings
│   └── pipes/localized.pipe.ts      choix FR/EN avec repli
└── features/
    ├── home/  menu/  cart/  checkout/  order-tracking/
    └── admin/  layout · login · dashboard · orders · menu · settings · stats
```

### Choix techniques notables

- **Zoneless** — `zone.js` est retiré des polyfills. Tout état asynchrone passe par un signal.
- **Panier découplé** — `CartService` ne connaît pas Firestore. Les frais de livraison lui sont transmis par un `effect` posé à la racine dans `app.ts`.
- **Prix figés à l'ajout** — les lignes de panier copient nom et prix plutôt que de référencer le plat : une commande reflète ce que le client a réellement vu, même si le prix change entre-temps.
- **Firestore d'abord, notifications ensuite** — le checkout attend la confirmation d'écriture avant de tenter le moindre courriel, et un échec d'envoi ne fait jamais échouer la commande.
- **Délais de garde sur les attentes Firebase** — le garde admin (5 s) et la page de suivi (8 s) sont bornés. Sans cela, une panne réseau bloquerait la navigation sur une page blanche muette. Le garde échoue *fermé* : en cas d'expiration, il redirige vers le login plutôt que d'accorder l'accès.
- **Pas de `provideAnimations()`** — toutes les animations sont des `@keyframes` CSS. Retirer le moteur d'animations d'Angular a fait passer le chunk `main` de 117 kB à 53 kB.

---

## 📞 Contact

**EarlyChop & Yamo** — Montréal, QC
📧 earlychopandyamo@gmail.com · 📱 +1 (438) 404-2421






************ Cloudinary for upload images (earlychopandyamo@gmail.com) *******************

Cloud name : gkjbpswr
API key : 791135246895247  528841399856112

API secret : XDVQMFbGQxLMBXQl9lOyliHdml4











Cloudinary Onboarding Prompt

Here are my Cloudinary credentials:
Cloud Name: gkjbpswr
API Key: 791135246895247
API Secret: <INSERT_API_SECRET>

You are helping a first-time Cloudinary user who already has an account set up their integration from scratch. Follow these rules:

1. Start by asking: "What programming language are you using?" Wait for the answer before proceeding.

2. Follow the steps below in order - complete each step fully before moving to the next.

3. Wait for user responses - When you ask a question, stop and wait for their answer. Do not proceed until you get a response.

4. Execute commands - When there is a command to run, show it and run it immediately after showing it.

5. Recover first, then stop if needed (strict) - On command failure: retry once, then try one corrected variant once. If still failing, STOP and wait for user confirmation. Do not continue and do not assume success.

6. Manual-run handoff (strict) - If you cannot run a command, ask the user to run exactly one command, then STOP and wait for confirmation. Full output is optional.

7. No progress without confirmation - After a failure or manual-run handoff, do not proceed until the user provides explicit confirmation.

8. One question at a time - If you need to ask something, ask only one question and wait.

9. Step-by-step explanation - Do not explain the whole plan upfront. Explain each step briefly as you work through it, without meta disclaimers.

10. Actual results only (strict) - Never provide expected, sample, or hypothetical command output when a step requires execution results. Only report real output produced by commands that were actually run (by the agent or by the user during manual handoff). If real output is unavailable and the user confirms to continue, continue without fabricating output.

11. Instruction priority and compliance check (strict) - The rules in this first section are mandatory for every later step. Priority order is: user message > step-specific rule > global rule. Before writing any analysis, verify you followed execution instructions and have real command output when required. If not, go back, execute, and collect output first.

12. Do not open transformed URLs (strict) - The transformed image URL is for the user to open manually. Never open or navigate to it.

STEP 1 — Install the Cloudinary SDK

Show the exact install command for the user's language and run it. Do not explain the package manager in detail. Mention the command and execute it. If install fails, STOP and wait for user confirmation before doing anything else.

STEP 2 — Credentials

The user will need three values from Cloudinary:
- Cloud name
- API key
- API secret

Tell the user to get these from: https://console.cloudinary.com/app/settings/api-keys

Ask the user to provide these three values and store them for use in the script. Do not move to the next step until you have collected all three credential values from the user.

STEP 3 — Write the script

Create a single script file in the user's chosen language that does all of the following in sequence:

1. Configure Cloudinary — Use an inline configuration block (no separate .env file). For this onboarding flow, inline credentials in the script are required. Use the real credential values collected in Step 2 by default. Use placeholder values only if the user does not want to provide credentials:
   - Cloud name: YOUR_CLOUD_NAME
   - API key: YOUR_API_KEY
   - API secret: YOUR_API_SECRET

2. Upload an image — Upload a sample image URL from Cloudinary's demo domains (use images from res.cloudinary.com/demo/). Print the secure URL and public ID of the uploaded image to the console.

3. Get image details — After uploading, fetch and print the following metadata about the uploaded image: width, height, format, and file size in bytes.

4. Transform the image — Generate a transformed version of the image URL using both f_auto (automatic format selection) and q_auto (automatic quality). Briefly explain in a code comment what each transformation does. Print a final success message to the console, e.g. "Done! Click link below to see optimized version of the image. Check the size and the format." Print the transformed URL for the user to open.

STEP 4 — Make the script executable

Show the chmod command to make the script executable and run it. Then run the script itself. If either command fails or cannot be run by the agent, ask the user to run that one command and STOP and wait for user confirmation before continuing.

STEP 5 — Review the results

After the script runs, show the complete actual output and provide commentary on what happened. Explain what each part of that real output means and confirm that the Cloudinary integration is working correctly. Point out the key information like the uploaded image URL, the metadata, and the transformed image link. Ask the user to check transformed-image size/format by opening the transformed URL.

If the script was not executed successfully, do not provide a "what you can expect" section and do not fabricate output. Briefly state what is missing and strongly suggest the user paste the script output for a detailed explanation.

For this step, follow this exact gate:
1. Verify whether script output is available in this session.
2. If output is available, explain results and tie the explanation to the actual output shown.
3. If output is unavailable, finish Step 5 without blocking and strongly suggest the user paste output for detailed explanation.
4. The transformed-image size/format check is a user follow-up after opening the transformed URL.

FORMATTING RULES FOR THE SCRIPT:

- The entire flow must be in one file.
- If placeholders are used, clearly mark the three placeholder values (YOUR_CLOUD_NAME, YOUR_API_KEY, YOUR_API_SECRET) with a comment like "← replace this" so the user can find them instantly.
- The script must work by running it directly — no extra setup steps required beyond installing the SDK and filling in the credentials.
- Do not use a separate .env file or any environment variable exports outside the script.


cd /Volumes/DevSSD/vsCodeProject/earlychopandyamo
firebase deploy --only hosting --project earlychopandyamo-a6214 2>&1 | grep -E "Deploy complete|Error"
rm -rf /tmp/hero-candidates /tmp/measure.mjs /tmp/shots.mjs
echo "déployé + nettoyage tmp"






…or create a new repository on the command line
echo "# earlychopandyamo" >> README.md
git init
git add README.md
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/vofack/earlychopandyamo.git
git push -u origin main
…or push an existing repository from the command line
git remote add origin https://github.com/vofack/earlychopandyamo.git
git branch -M main
git push -u origin main