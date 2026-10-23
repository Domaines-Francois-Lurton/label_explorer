// Réglages modifiables sans toucher au reste du code.
export const CONFIG = {
  /* Bandeau défilant en haut du catalogue.
     `vitesse` : pixels par seconde (plus grand = plus rapide). `afficher: false` le masque. */
  bandeau: {
    afficher: true,
    vitesse: 35,
    texte: "Chaque étiquette doit être validée par le service marketing avant diffusion au client. Merci 🙏🏼",
  },

  /* PDF joint aux fiches. false : grisé dans le formulaire admin, bouton masqué sur la fiche.
     Passer à true pour le réactiver (tout le reste est déjà en place). */
  pdf: false,
};
