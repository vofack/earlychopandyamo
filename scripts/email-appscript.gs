/**
 * ════════════════════════════════════════════════════════════════════════
 *  EarlyChop & Yamo — Envoi des courriels de commande via Gmail
 *  (Google Apps Script — 100% gratuit, aucun service tiers)
 * ════════════════════════════════════════════════════════════════════════
 *
 *  RÔLE
 *  L'application envoie ici les détails de chaque commande ; ce script
 *  compose puis expédie DEUX courriels depuis votre Gmail :
 *    • une confirmation au client (avec son lien de suivi)
 *    • une alerte au restaurant
 *
 *  INSTALLATION (une seule fois — voir README > Courriels pour les captures)
 *  1. Connectez-vous à Google avec earlychopandyamo@gmail.com
 *  2. Ouvrez https://script.google.com → « Nouveau projet »
 *  3. Effacez tout, collez CE fichier en entier
 *  4. Déployer → Nouveau déploiement → type « Application Web »
 *       - Exécuter en tant que : Moi (earlychopandyamo@gmail.com)
 *       - Accès : « Tout le monde »
 *  5. Autorisez les accès demandés (Gmail)
 *  6. Copiez l'URL qui finit par « /exec » → donnez-la pour la config
 *
 *  ⚠️ Le TOKEN ci-dessous doit rester IDENTIQUE à environment.email.token
 *     dans l'application. Il bloque les appels parasites vers l'URL publique.
 *
 *  QUOTA GRATUIT : ~100 destinataires/jour (limite Gmail pour un compte
 *  gratuit). Soit ~50 commandes/jour, largement suffisant au démarrage.
 */

var TOKEN = 'ecy-7Kq2rP';

/** Point d'entrée appelé par l'application (requête POST). */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    if (data.token !== TOKEN) {
      return json_({ ok: false, error: 'token invalide' });
    }

    // Aiguillage par type. `type` absent = ancienne commande → comportement
    // historique (confirmation client + alerte restaurant).
    var type = data.type || 'order';
    if (type === 'order') {
      sendClientEmail_(data);
      sendRestaurantEmail_(data);
    } else if (type === 'status') {
      sendStatusEmail_(data);
    } else if (type === 'referral') {
      sendReferralEmail_(data);
    }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** Permet un test rapide en ouvrant l'URL /exec dans le navigateur. */
function doGet() {
  return json_({ ok: true, message: 'EarlyChop & Yamo email service actif.' });
}

// ── Courriel au CLIENT ────────────────────────────────────────────────
function sendClientEmail_(d) {
  var en = d.lang === 'en';
  var subject = en
    ? '✅ Order confirmed #' + d.orderId + ' — EarlyChop & Yamo'
    : '✅ Commande confirmée #' + d.orderId + ' — EarlyChop & Yamo';

  var free = en ? 'FREE' : 'GRATUITE';
  var deliveryLine = d.delivery ? d.delivery : free;

  var html =
    '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#14181D">' +
      '<h2 style="color:#12689B">' + (en ? 'Thank you ' : 'Merci ') + esc_(d.clientName) + ' !</h2>' +
      '<p>' + (en ? 'Your order' : 'Votre commande') + ' <strong>#' + d.orderId + '</strong> ' +
        (en ? 'is confirmed. We are preparing it.' : 'est confirmée. Nous la préparons.') + '</p>' +
      '<p><strong>' + (en ? 'Estimated delivery: ' : 'Livraison estimée : ') + d.deliveryEstimate +
        (en ? ' minutes' : ' minutes') + '</strong></p>' +
      '<h3 style="color:#8A6500">' + (en ? 'Your order' : 'Votre commande') + '</h3>' +
      itemsTable_(d.items) +
      '<p>' + (en ? 'Subtotal' : 'Sous-total') + ' : ' + d.subtotal + '<br>' +
        (en ? 'Delivery' : 'Livraison') + ' : ' + deliveryLine + '<br>' +
        '<strong>Total : ' + d.total + '</strong></p>' +
      '<p><strong>' + (en ? 'Address' : 'Adresse') + ' :</strong> ' + esc_(d.address) + '<br>' +
        '<strong>' + (en ? 'Payment' : 'Paiement') + ' :</strong> ' + esc_(d.payment) + '</p>' +
      '<p><a href="' + d.trackingUrl + '" style="background:#12689B;color:#fff;padding:12px 22px;' +
        'border-radius:24px;text-decoration:none;display:inline-block">' +
        (en ? 'Track my order' : 'Suivre ma commande') + '</a></p>' +
      '<p style="color:#6B7681;font-size:13px">' + esc_(d.restaurantName) + ' · ' + esc_(d.restaurantPhone) + '</p>' +
    '</div>';

  GmailApp.sendEmail(d.clientEmail, subject, plain_(d), {
    htmlBody: html,
    name: d.restaurantName,
  });
}

// ── Courriel au RESTAURANT ────────────────────────────────────────────
function sendRestaurantEmail_(d) {
  var subject = '🔔 Nouvelle commande #' + d.orderId + ' — ' + d.clientName;

  var html =
    '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#14181D">' +
      '<h2 style="color:#C62828">🔔 Nouvelle commande #' + d.orderId + '</h2>' +
      '<p><strong>Client :</strong> ' + esc_(d.clientName) + ' (' + d.lang + ')<br>' +
        '<strong>Téléphone :</strong> ' + esc_(d.clientPhone) + '<br>' +
        '<strong>Courriel :</strong> ' + esc_(d.clientEmail) + '<br>' +
        '<strong>Adresse :</strong> ' + esc_(d.address) + ', ' + esc_(d.postalCode) + '</p>' +
      '<h3>Plats</h3>' +
      itemsTable_(d.items) +
      '<p><strong>Total : ' + d.total + '</strong> · Paiement : ' + esc_(d.payment) + '</p>' +
      '<p><strong>Instructions :</strong> ' + (d.notes ? esc_(d.notes) : '—') + '</p>' +
    '</div>';

  GmailApp.sendEmail(d.restaurantEmail, subject, plain_(d), {
    htmlBody: html,
    replyTo: d.clientEmail,
  });
}

// ── Courriel de CHANGEMENT DE STATUT (au client) ──────────────────────
function sendStatusEmail_(d) {
  var en = d.lang === 'en';
  var labels = en
    ? { new: 'received', confirmed: 'confirmed', preparing: 'being prepared', delivered: 'delivered' }
    : { new: 'reçue', confirmed: 'confirmée', preparing: 'en préparation', delivered: 'livrée' };
  var label = labels[d.status] || d.status;

  var subject = en
    ? 'Order #' + d.orderId + ' — ' + label
    : 'Commande #' + d.orderId + ' — ' + label;

  var html =
    '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#14181D">' +
      '<h2 style="color:#12689B">' + (en ? 'Order update' : 'Suivi de commande') + '</h2>' +
      '<p>' + (en ? 'Hello ' : 'Bonjour ') + esc_(d.clientName) + ',</p>' +
      '<p>' + (en ? 'Your order' : 'Votre commande') + ' <strong>#' + d.orderId + '</strong> ' +
        (en ? 'is now: ' : 'est maintenant : ') + '<strong>' + label + '</strong>.</p>' +
      '<p><a href="' + d.trackingUrl + '" style="background:#12689B;color:#fff;padding:12px 22px;' +
        'border-radius:24px;text-decoration:none;display:inline-block">' +
        (en ? 'Track my order' : 'Suivre ma commande') + '</a></p>' +
      '<p style="color:#6B7681;font-size:13px">' + esc_(d.restaurantName) + '</p>' +
    '</div>';

  GmailApp.sendEmail(d.clientEmail, subject, label, { htmlBody: html, name: d.restaurantName });
}

// ── Courriel de RÉCOMPENSE DE PARRAINAGE (au parrain) ─────────────────
function sendReferralEmail_(d) {
  var en = d.lang === 'en';
  var subject = en
    ? '🎉 You earned a referral reward — ' + d.restaurantName
    : '🎉 Vous avez gagné une récompense de parrainage — ' + d.restaurantName;

  var mealLine = d.freeMeals > 0
    ? (en
        ? 'You now have <strong>' + d.freeMeals + ' free meal(s)</strong> available!'
        : 'Vous avez maintenant <strong>' + d.freeMeals + ' repas gratuit(s)</strong> disponible(s) !')
    : (en ? 'Keep referring friends to unlock a free meal.' : 'Continuez à parrainer pour débloquer un repas gratuit.');

  var html =
    '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#14181D">' +
      '<h2 style="color:#8A6500">' + (en ? 'Thank you ' : 'Merci ') + esc_(d.clientName) + ' !</h2>' +
      '<p>' + (en
        ? 'A friend you referred just completed their first order.'
        : 'Un filleul que vous avez parrainé vient de recevoir sa première commande.') + '</p>' +
      '<p>' + (en ? 'Your points: ' : 'Vos points : ') + '<strong>' + d.points + '</strong><br>' + mealLine + '</p>' +
      '<p><a href="' + d.accountUrl + '" style="background:#12689B;color:#fff;padding:12px 22px;' +
        'border-radius:24px;text-decoration:none;display:inline-block">' +
        (en ? 'View my account' : 'Voir mon compte') + '</a></p>' +
    '</div>';

  GmailApp.sendEmail(d.clientEmail, subject, 'Points: ' + d.points, { htmlBody: html, name: d.restaurantName });
}

// ── Utilitaires ───────────────────────────────────────────────────────

/** Tableau HTML des plats commandés. */
function itemsTable_(items) {
  var rows = items.map(function (i) {
    return '<tr>' +
      '<td style="padding:4px 8px 4px 0">' + i.quantity + '×</td>' +
      '<td style="padding:4px 8px">' + esc_(i.name) + '</td>' +
      '<td style="padding:4px 0;text-align:right;white-space:nowrap">' + i.lineTotal + '</td>' +
    '</tr>';
  }).join('');
  return '<table style="width:100%;border-collapse:collapse;background:#F7F9FB;' +
    'border-radius:8px;padding:8px">' + rows + '</table>';
}

/** Version texte brut (repli pour les clients mail sans HTML). */
function plain_(d) {
  var lines = d.items.map(function (i) { return i.quantity + ' x ' + i.name + ' - ' + i.lineTotal; });
  return 'Commande #' + d.orderId + '\n' + lines.join('\n') +
    '\nTotal : ' + d.total + '\nSuivi : ' + d.trackingUrl;
}

/** Échappe le HTML pour éviter toute injection depuis les champs client. */
function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
