// Accès aux fiches : Firestore pour les fiches, Storage pour les fichiers.
// Le reste de l'interface ne connaît que les fonctions exportées ci-dessous et la forme d'une fiche.
//
// Fiche (collection « fiches », l'id est celui du document) :
//   { titre, marque, type, couleur, inpi, marches[], prix, statut,
//     contenance, dimension, cepage, appellation, demandeur, designer, ref,
//     jus, storytelling, commentaire,
//     creeLe, modifieLe (dates ISO), archive,
//     visuels[{ url, chemin,                 original HD (téléchargements)
//               apercu, cheminApercu,        1600 px WebP (fiche détail, plein écran)
//               miniature, cheminMiniature }], 640 px WebP (grille, vignettes)
//     couverture (index dans visuels),
//     pdf { url, chemin, nom } | null }
//
// Fichiers rangés dans Storage sous fiches/<id>/… Une copie de fiche réutilise les fichiers
// de l'original : on ne supprime un fichier que lorsque plus aucune fiche ne s'en sert.
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL, deleteObject }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";
import { db, storage } from "./firebase.js";

const fiches = collection(db, "fiches");
const versFiche = d => ({ id: d.id, ...d.data() });
const maintenant = () => new Date().toISOString();

// Les règles refusent les archives aux comptes lecture : leur requête doit donc les exclure.
export async function chargerFiches({ admin }) {
  const requete = admin ? fiches : query(fiches, where("archive", "==", false));
  return (await getDocs(requete)).docs.map(versFiche);
}

// Identifiant réservé avant la création, pour ranger les fichiers sous fiches/<id>/.
export const nouvelId = () => doc(fiches).id;

// champs : tout sauf creeLe et modifieLe. Renvoie la fiche créée.
export async function creerFiche(id, champs) {
  const date = maintenant();
  const fiche = { ...champs, creeLe: date, modifieLe: date };
  await setDoc(doc(fiches, id), fiche);
  return { id, ...fiche };
}

// champs : seulement ce qui change. Renvoie la fiche à jour.
// horodater: false pour un simple changement d'état (archivage) qui ne compte pas comme une modification.
export async function modifierFiche(id, champs, { horodater = true } = {}) {
  await updateDoc(doc(fiches, id), { ...champs, ...(horodater && { modifieLe: maintenant() }) });
  return versFiche(await getDoc(doc(fiches, id)));
}

export async function supprimerFiche(id) {
  await deleteDoc(doc(fiches, id));
}

// Envoie un fichier dans Storage. Renvoie { url, chemin }.
export async function enregistrerFichier(ficheId, nom, contenu, type) {
  const chemin = `fiches/${ficheId}/${nom}`;
  const fichier = ref(storage, chemin);
  await uploadBytes(fichier, contenu, { contentType: type });
  return { url: await getDownloadURL(fichier), chemin };
}

// Tous les fichiers Storage d'une fiche.
export const cheminsDe = f =>
  [...f.visuels.flatMap(v => [v.chemin, v.cheminApercu, v.cheminMiniature]), f.pdf?.chemin].filter(Boolean);

// Supprime ceux de ces fichiers qu'aucune des fiches restantes n'utilise.
// Un échec (fichier déjà absent…) n'empêche pas le reste : il ne laisse qu'un fichier orphelin.
export async function supprimerFichiers(chemins, fichesRestantes) {
  const utilises = new Set(fichesRestantes.flatMap(cheminsDe));
  await Promise.allSettled(chemins.filter(c => !utilises.has(c)).map(c => deleteObject(ref(storage, c))));
}
