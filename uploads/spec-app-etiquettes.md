# Catalogue des étiquettes — Spécification v1

## Objet

Application web interne regroupant l'ensemble des étiquettes et designs créés par le service
marketing. Elle donne un état des lieux : pour chaque projet, le visuel et son statut (validé,
en attente, non retenu).

**Nature du livrable : prototype cliquable.** Données fictives, pas de base de données ni de
serveur. Toute modification faite dans l'interface est perdue au rechargement de la page.
Volume cible : moins de 50 cartes.

---

## Accès

Un seul écran d'entrée, un seul champ mot de passe, pas de lien « admin » séparé.

- `flurton` → vue lecture
- second mot de passe dédié → vue admin

Avertissement : dans un prototype front-end, ces mots de passe sont lisibles dans le code
source. C'est un filtre de confort pour une démo interne, pas une sécurité.

---

## Modèle de données — carte produit

| Champ | Type | Filtrable |
|---|---|---|
| Titre du projet | texte | recherche libre |
| Nom de la marque | texte | recherche libre |
| Type de produit | vin / bulle / sans alcool / spiritueux | oui |
| Couleur | rouge / blanc / rosé / orange — facultatif | oui |
| Statut INPI | Déposée / En cours / Non déposée | oui |
| Marchés ciblés | multi-sélection de pays, liste mondiale avec recherche | oui |
| Positionnement prix | entrée de gamme / milieu de gamme / premium / prestige | oui |
| Statut du projet | Validé / En attente / Non retenu | oui |
| Projet demandé par | texte | non |
| Nom du designer | texte | non |
| Jus | texte long (description du liquide) | non |
| Contenance / format | texte (75 cl, BIB, magnum…) | non |
| Référence interne | texte | non |
| Commentaire | texte long | non |
| Date de création | automatique | tri |
| Date de dernière modification | automatique | tri |
| Archivé | interrupteur indépendant du statut | bouton dédié, admin |
| Visuels | 1 à 6 fichiers JPG / PNG, < 5 Mo chacun, ordonnables, dont 1 couverture | — |
| PDF joint | 1 fichier, < 10 Mo, téléchargement uniquement (jamais affiché) | — |

Le PDF est indépendant : il ne compte pas dans la limite des 6 visuels ni dans celle des 5 Mo.

---

## Filtres et tri

Filtres disponibles : statut du projet, type de produit, couleur, positionnement prix,
statut INPI, marchés ciblés.

Barre de recherche libre portant sur le titre du projet et le nom de la marque.

Règles de combinaison : plusieurs valeurs cochées dans un même filtre se cumulent en OU,
deux filtres différents se cumulent en ET.

Le filtre « marchés ciblés » ne propose que les pays réellement présents dans les fiches,
pas la liste mondiale complète. La liste mondiale n'apparaît qu'en saisie, côté admin.

Tri : date de dernière modification (défaut, décroissant) ou alphabétique.

Les cartes archivées sont masquées partout par défaut. Un bouton « Voir les archives »,
visible uniquement en admin, permet de les afficher.

---

## Vue 1 — Dashboard

Grille de vignettes. Chaque vignette affiche :

- l'image de couverture
- le titre du projet
- le nom de la marque
- une pastille de statut
- de petits repères pour le type de produit et la couleur

Au-dessus : barre de filtres, champ de recherche, sélecteur de tri.

---

## Vue 2 — Détail de la carte

- Galerie des visuels en plein écran, navigation d'une image à l'autre
- Téléchargement d'un visuel seul, ou de tous les visuels en ZIP
- Téléchargement du PDF joint
- Ensemble des champs texte de la fiche

---

## Vue 3 — Admin

Même interface que la vue lecture, enrichie des fonctions suivantes :

- créer une carte
- modifier une carte
- dupliquer une carte (utile pour les gammes)
- archiver / désarchiver
- supprimer définitivement, avec confirmation explicite
- gérer les visuels : ajout, suppression, réordonnancement, désignation de la couverture

---

## Responsive

- Vue lecture : desktop et mobile.
- Vue admin : desktop uniquement. Sur mobile, afficher un message explicite —
  « La page ADMIN ne fonctionne que sur Desktop ».

---

## À fournir avant le design

Un jeu de 8 à 10 fiches fictives réalistes, avec de vrais visuels d'étiquettes.
Le design se juge très mal sur du Lorem ipsum, surtout pour une application dont le sujet
est précisément l'image.
