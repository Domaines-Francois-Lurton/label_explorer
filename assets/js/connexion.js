// Point d'entrée : reprend la session si possible, sinon affiche la connexion.
// Un seul champ, deux comptes Firebase : le mot de passe saisi est essayé sur le compte lecture,
// puis sur le compte admin. Le contrôle se fait chez Firebase, plus dans le navigateur.
import { signInWithEmailAndPassword, signOut, setPersistence, browserSessionPersistence }
  from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth, COMPTES, roleDe } from "./firebase.js";
import { demarrer } from "./catalogue.js";

const $ = id => document.getElementById(id);
const form = $("loginForm"), input = $("password"), toggle = form.querySelector(".cx-toggle"), bouton = form.querySelector(".cx-submit");
const ERREURS = ["has-error", "erreur-reseau", "erreur-tentatives"];

function ouvrir(utilisateur) {
  $("connexion").hidden = true;
  document.body.classList.remove("cx");
  $("app").classList.remove("hidden");
  demarrer({
    role: roleDe(utilisateur),
    async deconnecter() { await signOut(auth); location.reload(); },
  });
}

// Mauvais mot de passe : on passe au compte suivant. Autre problème (réseau, trop d'essais) : on s'arrête.
const mauvaisMotDePasse = err => ["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found", "auth/invalid-login-credentials"].includes(err.code);

async function seConnecter(motDePasse) {
  for (const email of [COMPTES.lecture, COMPTES.admin]) {
    try {
      return (await signInWithEmailAndPassword(auth, email, motDePasse)).user;
    } catch (err) {
      if (!mauvaisMotDePasse(err)) throw err;
    }
  }
  return null;
}

toggle.addEventListener("click", () => {
  const voir = input.type === "password";
  input.type = voir ? "text" : "password";
  toggle.textContent = voir ? "Masquer" : "Afficher";
  toggle.setAttribute("aria-pressed", voir);
});
input.addEventListener("input", () => form.classList.remove(...ERREURS));

form.addEventListener("submit", async e => {
  e.preventDefault();
  if (!input.value) { input.focus(); return; }
  bouton.disabled = true;
  form.classList.remove(...ERREURS);
  try {
    const utilisateur = await seConnecter(input.value);
    if (utilisateur) { ouvrir(utilisateur); return; }
    form.classList.add("has-error");
  } catch (err) {
    form.classList.add(err.code === "auth/too-many-requests" ? "erreur-tentatives" : "erreur-reseau");
  } finally {
    bouton.disabled = false;
  }
  input.focus();
  input.select();
});

// Session limitée à l'onglet : fermer l'onglet déconnecte, comme sur Dépôts de marques.
await setPersistence(auth, browserSessionPersistence);
await auth.authStateReady();
if (auth.currentUser) {
  ouvrir(auth.currentUser);
} else {
  $("connexion").hidden = false;
  input.focus();
}
