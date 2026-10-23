// Initialisation de Firebase (chargé depuis le CDN officiel, sans étape de construction).
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";
import { FIREBASE_CONFIG } from "./firebase-config.js";

export const app = initializeApp(FIREBASE_CONFIG);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Les deux comptes créés dans Authentication. Les règles de sécurité (firebase/*.rules)
// s'appuient sur ces adresses : les changer ici impose de les changer là-bas.
export const COMPTES = {
  lecture: "lecture@label-explorer.internal",
  admin: "admin@label-explorer.internal",
};
export const roleDe = utilisateur => utilisateur?.email === COMPTES.admin ? "admin" : "lecture";
