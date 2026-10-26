// Listes de valeurs et couleurs associées, partagées par le catalogue, la fiche détail et le formulaire admin.

// Affichage de ces valeurs : majuscule à chaque mot (« entrée de gamme » → « Entrée De Gamme »).
// La valeur enregistrée, elle, ne change pas.
// Nom d'une fiche quand il tient en une ligne (titre d'onglet, confirmation, noms de fichiers) :
// la marque d'abord, le projet ensuite, comme à l'affichage.
export const nomComplet = f => [f.marque, f.titre].filter(Boolean).join(" – ");

export const majuscules = s => String(s ?? "").replace(/(^|[\s-])(\p{L})/gu, (_, avant, lettre) => avant + lettre.toUpperCase());

export const TYPES = ["vin", "bulle", "sans alcool", "spiritueux"];
export const COULEURS = ["rouge", "blanc", "rosé", "orange"];
export const INPI = ["Déposée", "En cours", "Non déposée"];
export const PRIX = ["entrée de gamme", "milieu de gamme", "premium", "prestige"];
export const STATUTS = ["En utilisation", "En attente", "Non retenu"];

// Pastille de statut : classe de badge (voir style.css)
export const STATUT_BADGE = { "En utilisation": "b-r", "En attente": "b-o", "Non retenu": "b-g" };
export const INPI_BADGE = { "Déposée": "b-g", "En cours": "b-o", "Non déposée": "b-n" };

// Pastille de couleur du vin, et teinte de fond quand une fiche n'a pas encore de visuel
export const COULEUR_POINT = { rouge: "#7a1f2b", blanc: "#d8c48a", rosé: "#e8a2b0", orange: "#d9812f" };
export const COULEUR_FOND = { rouge: "#f6e9ea", blanc: "#f6f2e6", rosé: "#fbecef", orange: "#faeee1", "": "#eef0f2" };

// Pays proposés à la saisie (admin). Le filtre, lui, ne montre que les pays présents dans les fiches.
export const PAYS = ["France", "Belgique", "Suisse", "Allemagne", "Royaume-Uni", "Espagne", "Italie", "Portugal", "Pays-Bas", "Irlande",
  "États-Unis", "Canada", "Mexique", "Brésil", "Japon", "Chine", "Corée du Sud", "Singapour", "Hong Kong", "Émirats arabes unis",
  "Arabie saoudite", "Australie", "Nouvelle-Zélande", "Afrique du Sud", "Suède", "Norvège", "Danemark", "Pologne", "Autriche", "Luxembourg"];
