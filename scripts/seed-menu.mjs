/**
 * Amorçage du menu — insère un menu de départ dans Firestore.
 *
 * Usage :
 *   node scripts/seed-menu.mjs
 *
 * À lancer UNE SEULE FOIS, après avoir créé la base Firestore et le compte
 * administrateur. Le script demande vos identifiants admin : l'écriture dans
 * `dishes` est réservée aux utilisateurs authentifiés par firestore.rules,
 * exactement comme depuis l'interface d'administration.
 *
 * Les plats insérés sont des exemples représentatifs de la cuisine
 * ouest-africaine — ajustez noms, descriptions et surtout LES PRIX depuis
 * /admin/menu une fois le site en ligne.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, getDocs, getFirestore, serverTimestamp } from 'firebase/firestore';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const firebaseConfig = {
  apiKey: 'AIzaSyBo13dhXgMNHz6x8Yqc6pu1vboojJMc7q4',
  authDomain: 'earlychopandyamo-a6214.firebaseapp.com',
  projectId: 'earlychopandyamo-a6214',
  storageBucket: 'earlychopandyamo-a6214.firebasestorage.app',
  messagingSenderId: '270314031021',
  appId: '1:270314031021:web:3072f896b6128764ce4324',
};

const DISHES = [
  {
    name: { fr: 'Poulet DG', en: 'Poulet DG' },
    description: {
      fr: "Poulet mijoté aux plantains mûrs, carottes et poivrons, dans une sauce tomate parfumée. Le grand classique camerounais.",
      en: 'Chicken simmered with ripe plantains, carrots and peppers in a fragrant tomato sauce. The great Cameroonian classic.',
    },
    price: 18.5,
    category: 'main',
    emoji: '🍗',
    isPopular: true,
    isVegetarian: false,
    isSpicy: false,
    allergens: [],
  },
  {
    name: { fr: 'Ndolé aux crevettes', en: 'Ndolé with shrimp' },
    description: {
      fr: 'Feuilles de ndolé mijotées avec arachides et crevettes, servi avec plantains frits. Plat national du Cameroun.',
      en: 'Ndolé leaves simmered with peanuts and shrimp, served with fried plantains. Cameroon’s national dish.',
    },
    price: 20,
    category: 'main',
    emoji: '🍤',
    isPopular: true,
    isVegetarian: false,
    isSpicy: false,
    allergens: ['peanut', 'shellfish'],
  },
  {
    name: { fr: 'Riz jollof', en: 'Jollof rice' },
    description: {
      fr: 'Riz parfumé cuit dans une sauce tomate épicée, avec poivrons et oignons. Accompagné de plantains.',
      en: 'Fragrant rice cooked in a spiced tomato sauce with peppers and onions. Served with plantains.',
    },
    price: 15,
    category: 'main',
    emoji: '🍚',
    isPopular: true,
    isVegetarian: true,
    isSpicy: true,
    allergens: [],
  },
  {
    name: { fr: 'Poisson braisé', en: 'Grilled fish' },
    description: {
      fr: 'Tilapia entier mariné aux épices et braisé au charbon, servi avec attiéké et sauce piment.',
      en: 'Whole tilapia marinated in spices and charcoal-grilled, served with attiéké and chili sauce.',
    },
    price: 22,
    category: 'main',
    emoji: '🐟',
    isPopular: false,
    isVegetarian: false,
    isSpicy: true,
    allergens: ['fish'],
  },
  {
    name: { fr: 'Sauce arachide', en: 'Peanut stew' },
    description: {
      fr: 'Bœuf mijoté longuement dans une sauce onctueuse à l’arachide, servi avec riz blanc.',
      en: 'Beef slowly simmered in a creamy peanut sauce, served with white rice.',
    },
    price: 17.5,
    category: 'main',
    emoji: '🥘',
    isPopular: false,
    isVegetarian: false,
    isSpicy: false,
    allergens: ['peanut'],
  },
  {
    name: { fr: 'Beignets haricots', en: 'Bean fritters' },
    description: {
      fr: 'Beignets de haricots frits, croustillants dehors et moelleux dedans. Six pièces.',
      en: 'Fried bean fritters, crisp outside and soft inside. Six pieces.',
    },
    price: 7,
    category: 'starter',
    emoji: '🥟',
    isPopular: false,
    isVegetarian: true,
    isSpicy: false,
    allergens: [],
  },
  {
    name: { fr: 'Alloco', en: 'Alloco' },
    description: {
      fr: 'Plantains mûrs frits, dorés et fondants, servis avec sauce tomate pimentée.',
      en: 'Fried ripe plantains, golden and tender, served with spicy tomato sauce.',
    },
    price: 6.5,
    category: 'starter',
    emoji: '🍌',
    isPopular: true,
    isVegetarian: true,
    isSpicy: true,
    allergens: [],
  },
  {
    name: { fr: 'Salade d’avocat', en: 'Avocado salad' },
    description: {
      fr: 'Avocat frais, tomates, oignons rouges et vinaigrette citronnée.',
      en: 'Fresh avocado, tomatoes, red onion and a lemon vinaigrette.',
    },
    price: 8,
    category: 'starter',
    emoji: '🥑',
    isPopular: false,
    isVegetarian: true,
    isSpicy: false,
    allergens: [],
  },
  {
    name: { fr: 'Beignets sucrés', en: 'Sweet puff-puff' },
    description: {
      fr: 'Beignets moelleux légèrement sucrés, saupoudrés de sucre glace. Cinq pièces.',
      en: 'Soft, lightly sweetened doughnuts dusted with icing sugar. Five pieces.',
    },
    price: 5.5,
    category: 'dessert',
    emoji: '🍩',
    isPopular: false,
    isVegetarian: true,
    isSpicy: false,
    allergens: ['gluten', 'egg', 'dairy'],
  },
  {
    name: { fr: 'Salade de fruits', en: 'Fruit salad' },
    description: {
      fr: 'Mangue, ananas, papaye et fruit de la passion, préparés le jour même.',
      en: 'Mango, pineapple, papaya and passion fruit, prepared the same day.',
    },
    price: 6,
    category: 'dessert',
    emoji: '🥭',
    isPopular: false,
    isVegetarian: true,
    isSpicy: false,
    allergens: [],
  },
  {
    name: { fr: 'Jus de bissap', en: 'Hibiscus juice' },
    description: {
      fr: 'Infusion glacée de fleurs d’hibiscus, menthe et gingembre. Peu sucrée.',
      en: 'Chilled hibiscus flower infusion with mint and ginger. Lightly sweetened.',
    },
    price: 4.5,
    category: 'drink',
    emoji: '🍹',
    isPopular: true,
    isVegetarian: true,
    isSpicy: false,
    allergens: [],
  },
  {
    name: { fr: 'Jus de gingembre', en: 'Ginger juice' },
    description: {
      fr: 'Gingembre frais pressé, citron et une pointe d’ananas. Vivifiant.',
      en: 'Freshly pressed ginger, lemon and a touch of pineapple. Invigorating.',
    },
    price: 4.5,
    category: 'drink',
    emoji: '🫚',
    isPopular: false,
    isVegetarian: true,
    isSpicy: true,
    allergens: [],
  },
];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const rl = createInterface({ input: stdin, output: stdout });

try {
  console.log('\n🍽️  Amorçage du menu EarlyChop & Yamo\n');

  const email = await rl.question('Courriel administrateur : ');
  const password = await rl.question('Mot de passe : ');
  rl.close();

  await signInWithEmailAndPassword(auth, email.trim(), password);
  console.log('✓ Authentifié\n');

  // Garde-fou : relancer le script par erreur créerait des doublons, et il
  // n'existe aucun moyen simple de les distinguer une fois insérés.
  const existing = await getDocs(collection(db, 'dishes'));
  if (!existing.empty) {
    console.log(
      `⚠️  La collection « dishes » contient déjà ${existing.size} plat(s).\n` +
        '   Le script s’arrête pour ne pas créer de doublons.\n' +
        '   Videz la collection depuis /admin/menu si vous voulez repartir de zéro.\n',
    );
    process.exit(0);
  }

  for (const dish of DISHES) {
    // On n'inclut PAS `imageUrl` : le SDK Firestore lève « Unsupported field
    // value: undefined » sur tout champ valant undefined. Un plat sans photo
    // se contente d'omettre la clé — le site affiche alors son emoji.
    await addDoc(collection(db, 'dishes'), {
      ...dish,
      isAvailable: true,
      createdAt: serverTimestamp(),
    });
    console.log(`  ✓ ${dish.emoji}  ${dish.name.fr}`);
  }

  console.log(`\n✅ ${DISHES.length} plats insérés.`);
  console.log('   Ajustez les prix depuis /admin/menu avant la mise en ligne.\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Échec :', error?.message ?? error);
  console.error(
    '\n   Causes fréquentes :\n' +
      '   • base Firestore pas encore créée\n' +
      '   • règles de sécurité non déployées (firebase deploy --only firestore:rules)\n' +
      '   • compte administrateur inexistant dans Firebase Authentication\n',
  );
  process.exit(1);
}
