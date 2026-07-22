/**
 * Configuration de développement.
 *
 * ⚠️ REMPLACEZ les valeurs 'À_REMPLIR' par celles de votre projet Firebase :
 *    Console Firebase > ⚙️ Paramètres du projet > Vos applications > Application Web > Config
 *
 * Ces clés Firebase « web » sont PUBLIQUES par conception (elles partent dans le bundle
 * du navigateur). La sécurité ne repose pas sur leur secret mais entièrement sur les
 * règles Firestore, définies dans firestore.rules à la racine du projet.
 */
export const environment = {
  production: false,

  firebase: {
    apiKey: 'AIzaSyBo13dhXgMNHz6x8Yqc6pu1vboojJMc7q4',
    authDomain: 'earlychopandyamo-a6214.firebaseapp.com',
    projectId: 'earlychopandyamo-a6214',
    storageBucket: 'earlychopandyamo-a6214.firebasestorage.app',
    messagingSenderId: '270314031021',
    appId: '1:270314031021:web:3072f896b6128764ce4324',
    // measurementId n'est pas repris : il ne sert qu'à Google Analytics,
    // que l'application n'utilise pas. L'inclure chargerait le SDK Analytics
    // sans bénéfice, et déclencherait une bannière de consentement à gérer.
  },

  /**
   * Envoi des courriels via Google Apps Script — 100% gratuit, sans service
   * tiers, expédié depuis le Gmail du restaurant. Voir README > Courriels.
   *
   *  provider 'appsscript' → envoi actif  ·  'none' → aucun courriel
   *  appsScriptUrl → l'URL « /exec » du script déployé en Web App
   *  token → doit être IDENTIQUE à celui inscrit dans le script (barrière
   *          légère contre les appels parasites vers l'URL publique)
   */
  email: {
    provider: 'appsscript' as 'appsscript' | 'none',
    appsScriptUrl:
      'https://script.google.com/macros/s/AKfycbxICOQqMiolbtNMXkfGNtUI0CipVUAZBJ-ktmcOe7s55vxLF_NNWyqwusOBrhCaOqVRCQ/exec',
    token: 'ecy-7Kq2rP',
  },

  /**
   * UID de l'administrateur principal (Console > Authentication > Users).
   * Doit être IDENTIQUE à `primaryAdminUid()` dans firestore.rules. Sert à
   * l'application à reconnaître l'admin côté navigateur. Non secret.
   */
  adminUid: 'D1gWZTghFecBDHn3MezsAyN1Uhw1',

  restaurant: {
    name: 'EarlyChop & Yamo',
    email: 'earlychopandyamo@gmail.com',
    /** Format international sans espaces ni signes — requis par les liens wa.me. */
    whatsapp: '14384042421',
    phoneDisplay: '+1 (438) 404-2421',
    city: 'Montréal, QC',
  },

  /**
   * Photos des plats — trois modes possibles.
   *
   *  'cloudinary' → téléversement direct depuis l'admin vers Cloudinary.
   *                 Gratuit, aucune carte bancaire. Renseignez cloudName et
   *                 uploadPreset ci-dessous (voir README > Photos).
   *  'firebase'   → téléversement vers Firebase Storage. Exige le plan Blaze.
   *  'url'        → pas de téléversement, on colle une URL à la main.
   */
  imageUpload: {
    mode: 'cloudinary' as 'cloudinary' | 'firebase' | 'url',
    cloudinary: {
      /** Console Cloudinary > Dashboard > « Cloud name ». */
      cloudName: 'gkjbpswr',
      /** Settings > Upload > un preset « Unsigned » que vous créez. */
      uploadPreset: 'earlychop_yamo',
    },
  },

  /** Délai annoncé au client, en minutes. */
  deliveryEstimate: '30-45',
};
