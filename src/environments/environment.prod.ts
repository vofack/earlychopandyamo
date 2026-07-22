/**
 * Configuration de production (utilisée par `ng build --configuration=production`).
 * Voir environment.ts pour le détail de chaque champ.
 */
export const environment = {
  production: true,

  firebase: {
    apiKey: 'AIzaSyBo13dhXgMNHz6x8Yqc6pu1vboojJMc7q4',
    authDomain: 'earlychopandyamo-a6214.firebaseapp.com',
    projectId: 'earlychopandyamo-a6214',
    storageBucket: 'earlychopandyamo-a6214.firebasestorage.app',
    messagingSenderId: '270314031021',
    appId: '1:270314031021:web:3072f896b6128764ce4324',
  },

  email: {
    provider: 'appsscript' as 'appsscript' | 'none',
    appsScriptUrl:
      'https://script.google.com/macros/s/AKfycbxICOQqMiolbtNMXkfGNtUI0CipVUAZBJ-ktmcOe7s55vxLF_NNWyqwusOBrhCaOqVRCQ/exec',
    token: 'ecy-7Kq2rP',
  },

  adminUid: 'D1gWZTghFecBDHn3MezsAyN1Uhw1',

  restaurant: {
    name: 'EarlyChop & Yamo',
    email: 'earlychopandyamo@gmail.com',
    whatsapp: '14384042421',
    phoneDisplay: '+1 (438) 404-2421',
    city: 'Montréal, QC',
  },

  imageUpload: {
    mode: 'cloudinary' as 'cloudinary' | 'firebase' | 'url',
    cloudinary: {
      cloudName: 'gkjbpswr',
      uploadPreset: 'earlychop_yamo',
    },
  },

  deliveryEstimate: '30-45',
};
