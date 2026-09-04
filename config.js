/* =============================================================
   PORTAIL MARKETING — Configuration
   -------------------------------------------------------------
   Seul fichier à modifier pour faire vivre le portail au quotidien :
   ajouter une application, changer l'annonce, changer l'ambiance.
   Aucune connaissance technique requise, respectez juste la
   ponctuation (virgules, guillemets, accolades).
   ============================================================= */

window.PORTAL_CONFIG = {

  /* --- Identité ------------------------------------------------ */
  brand: {
    eyebrow: 'Portail Marketing',
    title: 'Bienvenue',
    subtitle: 'Boite à outils marketing François Lurton',
    footer: 'Portail interne · François Lurton SA',
  },

  /* --- Ambiance ------------------------------------------------
     Valeurs possibles : 'frais' | 'ambre' | 'neutre' | 'blanc-chaud'
     -------------------------------------------------------------- */
  theme: 'frais',

  /* --- Annonce interne -----------------------------------------
     Le bandeau défile en continu, sur une seule ligne.
     `show`      : false masque complètement le bandeau.
     `direction` : 'gauche-droite' ou 'droite-gauche'.
     `vitesse`   : pixels par seconde (plus grand = plus rapide).
     -------------------------------------------------------------- */
  announcement: {
    show: true,
    direction: 'droite-gauche',
    vitesse: 35,
    label: 'Annonce interne :',
    text: 'Bienvenue sur le nouveau portail marketing. Retrouvez ici toutes les applications qui peuvent vous être utiles.',
  },

  /* --- Applications --------------------------------------------
     Pour ajouter une application, dupliquez un bloc { ... } et
     adaptez les valeurs. `initials` = 2 lettres affichées sur la
     pastille. `color` = dégradé de la pastille (début, fin).

     `badge` est facultatif : le texte indiqué s'affiche en petite
     étiquette à côté du nom (« En travaux », « Nouveau »...).
     Supprimez la ligne quand l'application est prête.
     -------------------------------------------------------------- */
  apps: [
    {
      id: 'bible',
      name: 'Bible DFL',
      initials: 'BD',
      color: ['oklch(0.68 0.13 250)', 'oklch(0.55 0.16 258)'],
      url: 'https://domaines-francois-lurton.github.io/bible_DFL/',
      desc: 'Référentiel de marque et argumentaire produits Domaines François Lurton.',
      badge: 'En travaux',
    },
    {
      id: 'wine-awards',
      name: 'Wine Awards Tracker',
      initials: 'WA',
      color: ['oklch(0.72 0.13 165)', 'oklch(0.58 0.14 165)'],
      url: 'https://domaines-francois-lurton.github.io/wine_awards_tracker/',
      desc: 'Suivi des médailles et distinctions obtenues par nos vins et marques.',
    },
    {
      id: 'signature',
      name: 'Signature Email App',
      initials: 'SE',
      color: ['oklch(0.72 0.12 45)', 'oklch(0.6 0.15 40)'],
      url: 'https://domaines-francois-lurton.github.io/signature_email_app/',
      desc: 'Générateur de signatures email harmonisées pour les équipes.',
    },
    {
      id: 'press',
      name: 'Press Tracker',
      initials: 'PT',
      color: ['oklch(0.7 0.13 320)', 'oklch(0.56 0.16 320)'],
      url: 'https://domaines-francois-lurton.github.io/press-tracker/',
      desc: 'Suivi de tous les échantillons envoyés à la presse.',
    },
    {
      id: 'label-explorer',
      name: 'Label Explorer',
      initials: 'LE',
      color: ['oklch(0.72 0.11 95)', 'oklch(0.58 0.13 85)'],
      url: 'https://domaines-francois-lurton.github.io/label_explorer/',
      desc: 'Application regroupant toutes les créations d’étiquettes - 2nd label.',
      badge: 'En travaux',
    },
  ],
};
