// Fiche détail : galerie, plein écran, téléchargements et ensemble des informations.
import { STATUT_BADGE, INPI_BADGE, COULEUR_POINT, COULEUR_FOND, majuscules, nomComplet } from "./referentiels.js";
import { creerZip } from "./zip.js";
import { CONFIG } from "./config.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const valeur = s => (s && String(s).trim() ? esc(s) : `<span class="vide-champ">—</span>`);

const DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const date = iso => {
  if (!iso) return "";
  if (iso.length > 10) return DATE.format(new Date(iso)); // date ISO complète
  const [a, m, j] = iso.split("-").map(Number);           // AAAA-MM-JJ, lue en heure locale
  return DATE.format(new Date(a, m - 1, j));
};

// nom de fichier sans accent ni espace : « Bulle d'Or » → « bulle-d-or »
const slug = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const extension = url => (url.split(/[?#]/)[0].match(/\.([a-z0-9]{2,4})$/i)?.[1] ?? "jpg").toLowerCase();

const ICONE_VIDE = `<svg class="scene__vide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-4.5-4.5L8 19"/></svg>`;

export function creerVueFiche({ notifier }) {
  let fiche = null, index = 0, retourFocus = null, prechargees = [];

  // ---------- galerie ----------
  // Affichage : l'aperçu allégé (1600 px). L'original HD ne sert qu'aux téléchargements.
  const nb = () => fiche.visuels.length;
  const affichage = v => v.apercu || v.url;

  // Le navigateur garde l'ancienne image à l'écran tant que la nouvelle n'est pas arrivée. Pendant ce temps :
  //   - autre visuel de la même fiche : image estompée, pour montrer que le clic est pris en compte ;
  //   - nouvelle fiche : image masquée, pour ne jamais montrer le visuel de la fiche précédente.
  function charger(img, src, masquer = false) {
    if (img.getAttribute("src") === src) { img.classList.remove("masquee"); return; }
    img.classList.add(masquer ? "masquee" : "en-chargement");
    img.onload = img.onerror = () => img.classList.remove("en-chargement", "masquee");
    img.src = src;
    if (img.complete) img.classList.remove("en-chargement", "masquee"); // déjà en cache
  }

  function montrer(i, { nouvelleFiche = false } = {}) {
    index = (i + nb()) % nb();
    const src = affichage(fiche.visuels[index]);
    charger($("sceneImage"), src, nouvelleFiche);
    $("sceneImage").alt = `${nomComplet(fiche)}, visuel ${index + 1}`;
    $("compteur").textContent = `Visuel ${index + 1} / ${nb()}`;
    $("miniatures").querySelectorAll(".miniature").forEach((m, k) => m.setAttribute("aria-current", k === index));
    if (!$("pleinEcran").hidden) {
      charger($("peImage"), src);
      $("peImage").alt = $("sceneImage").alt;
      $("peCompteur").textContent = $("compteur").textContent;
    }
  }

  // Les autres visuels se chargent en arrière-plan dès l'ouverture : passer de l'un à l'autre est ensuite immédiat.
  // Les voisins de l'image affichée d'abord.
  function precharger() {
    const ordre = fiche.visuels.map((_, k) => (index + k) % nb()).sort((a, b) =>
      Math.min(Math.abs(a - index), nb() - Math.abs(a - index)) - Math.min(Math.abs(b - index), nb() - Math.abs(b - index)));
    prechargees = ordre.slice(1).map(k => Object.assign(new Image(), { src: affichage(fiche.visuels[k]) }));
  }

  function rendreGalerie() {
    const avecVisuels = nb() > 0;
    $("scene").style.background = COULEUR_FOND[fiche.couleur] ?? COULEUR_FOND[""];
    $("sceneOuvrir").classList.toggle("hidden", !avecVisuels);
    $("sceneVide").innerHTML = avecVisuels ? "" : `${ICONE_VIDE}<span>Aucun visuel pour cette fiche</span>`;
    $("sceneVide").classList.toggle("hidden", avecVisuels);
    const plusieurs = nb() > 1;
    for (const id of ["prec", "suiv", "pePrec", "peSuiv"]) $(id).classList.toggle("hidden", !plusieurs);
    $("compteur").classList.toggle("hidden", !avecVisuels);
    $("miniatures").innerHTML = plusieurs
      ? fiche.visuels.map((v, i) => `<button type="button" class="miniature" data-i="${i}" aria-label="Visuel ${i + 1}"><img src="${esc(v.miniature || v.url)}" alt="" loading="lazy"></button>`).join("")
      : "";
    $("dlVisuel").disabled = $("dlTout").disabled = !avecVisuels;
    $("dlTout").classList.toggle("hidden", !plusieurs);
    $("dlPdf").classList.toggle("hidden", !CONFIG.pdf || !fiche.pdf); // fonction PDF en pause : bouton masqué pour tous
    if (avecVisuels) {
      montrer(fiche.couverture < nb() ? fiche.couverture : 0, { nouvelleFiche: true });
      precharger();
    }
  }

  $("prec").addEventListener("click", () => montrer(index - 1));
  $("suiv").addEventListener("click", () => montrer(index + 1));
  $("miniatures").addEventListener("click", e => {
    const m = e.target.closest(".miniature");
    if (m) montrer(Number(m.dataset.i));
  });

  // ---------- plein écran ----------
  function ouvrirPleinEcran() {
    retourFocus = document.activeElement;
    $("pleinEcran").hidden = false;
    document.body.classList.add("sans-defilement");
    montrer(index);
    requestAnimationFrame(() => $("pleinEcran").classList.add("ouvert"));
    $("peFermer").focus();
  }
  function fermerPleinEcran() {
    if ($("pleinEcran").hidden) return;
    $("pleinEcran").classList.remove("ouvert");
    $("pleinEcran").hidden = true;
    document.body.classList.remove("sans-defilement");
    retourFocus?.focus();
  }
  $("sceneOuvrir").addEventListener("click", ouvrirPleinEcran);
  $("peFermer").addEventListener("click", fermerPleinEcran);
  $("pePrec").addEventListener("click", () => montrer(index - 1));
  $("peSuiv").addEventListener("click", () => montrer(index + 1));
  // clic sur le fond (hors image et boutons) : on ferme
  $("pleinEcran").addEventListener("click", e => { if (e.target === $("pleinEcran")) fermerPleinEcran(); });

  document.addEventListener("keydown", e => {
    if (!fiche || $("fiche").classList.contains("hidden")) return;
    const pleinEcran = !$("pleinEcran").hidden;
    if (pleinEcran && e.key === "Escape") { fermerPleinEcran(); return; }
    if (pleinEcran && e.key === "Tab") {
      // le focus reste dans la fenêtre plein écran
      const boutons = [...$("pleinEcran").querySelectorAll("button:not(.hidden)")];
      const i = boutons.indexOf(document.activeElement);
      const j = e.shiftKey ? (i <= 0 ? boutons.length - 1 : i - 1) : (i + 1) % boutons.length;
      e.preventDefault();
      boutons[j].focus();
      return;
    }
    if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && nb() > 1 && !e.target.closest("input, select, textarea")) {
      e.preventDefault();
      montrer(index + (e.key === "ArrowLeft" ? -1 : 1));
    }
  });

  // ---------- téléchargements ----------
  const base = () => slug(fiche.ref || nomComplet(fiche)) || "etiquette";
  // extension tirée du chemin Storage (l'adresse de téléchargement porte des paramètres)
  const nomVisuel = (v, i) => `${base()}-visuel-${i + 1}.${extension(v.chemin || v.url)}`;

  function enregistrer(blob, nom) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }

  async function lire(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.blob();
  }

  async function avecAttente(bouton, action) {
    const texte = bouton.querySelector("span").textContent;
    bouton.disabled = true;
    bouton.querySelector("span").textContent = "Préparation…";
    try {
      await action();
    } catch {
      notifier("Téléchargement impossible. Vérifiez la connexion puis réessayez.");
    } finally {
      bouton.disabled = false;
      bouton.querySelector("span").textContent = texte;
    }
  }

  $("dlVisuel").addEventListener("click", () => avecAttente($("dlVisuel"), async () => {
    const v = fiche.visuels[index];
    enregistrer(await lire(v.url), nomVisuel(v, index));
  }));
  $("dlTout").addEventListener("click", () => avecAttente($("dlTout"), async () => {
    const fichiers = await Promise.all(fiche.visuels.map(async (v, i) => ({
      nom: nomVisuel(v, i),
      octets: new Uint8Array(await (await lire(v.url)).arrayBuffer()),
    })));
    enregistrer(creerZip(fichiers), `${base()}-visuels.zip`);
  }));
  // le PDF garde le nom sous lequel l'admin l'a déposé
  $("dlPdf").addEventListener("click", () => avecAttente($("dlPdf"), async () => {
    enregistrer(await lire(fiche.pdf.url), fiche.pdf.nom || `${base()}.pdf`);
  }));

  // ---------- informations ----------
  function rendreInfos() {
    const f = fiche;
    const couleur = f.couleur
      ? `<span class="tag tag--grand" style="background:${COULEUR_FOND[f.couleur]}"><span class="point" style="background:${COULEUR_POINT[f.couleur]}"></span>${esc(majuscules(f.couleur))}</span>` : "";
    const champ = (lib, val) => `<div><dt>${lib}</dt><dd>${valeur(val)}</dd></div>`;
    const texte = (lib, val) => val && val.trim() ? `<h2 class="infos__lib">${lib}</h2><p class="infos__texte">${esc(val)}</p>` : "";

    $("infos").innerHTML = `
      <div class="infos__tete">
        <div>
          <h1 class="infos__titre">${esc(f.marque)}</h1>
          <p class="infos__marque">${esc(f.titre)}</p>
        </div>
        <span class="badge badge--grand ${STATUT_BADGE[f.statut]}">${esc(majuscules(f.statut))}</span>
      </div>
      ${f.archive ? `<p class="infos__archive">Fiche archivée</p>` : ""}
      <div class="pastilles">
        <span class="tag tag--grand">${esc(majuscules(f.type))}</span>
        ${couleur}
        <span class="badge badge--grand ${INPI_BADGE[f.inpi]}">INPI · ${esc(majuscules(f.inpi))}</span>
        <span class="tag tag--grand">${esc(majuscules(f.prix))}</span>
      </div>
      <h2 class="infos__lib">Marchés ciblés</h2>
      <div class="marches">${f.marches.length ? f.marches.map(m => `<span class="tag">${esc(majuscules(m))}</span>`).join("") : valeur("")}</div>
      <dl class="encart encart--2">
        ${champ("Demandé par", f.demandeur)}
        ${champ("Designer", f.designer)}
        ${champ("Dimension de l'étiquette", f.dimension)}
        ${champ("Référence interne", f.ref)}
        ${champ("Créée le", date(f.creeLe))}
        ${champ("Modifiée le", date(f.modifieLe))}
      </dl>
      <div class="encart">
        <dl class="encart__ligne">
          ${champ("Cépage", f.cepage)}
          ${champ("Appellation", f.appellation && majuscules(f.appellation))}
          ${champ("Contenance", f.contenance)}
        </dl>
        ${texte("Information produit", f.jus)}
        ${texte("Storytelling", f.storytelling)}
        ${texte("Commentaire", f.commentaire)}
      </div>`;
  }

  return {
    afficher(f) {
      fiche = f;
      rendreInfos();
      rendreGalerie();
      document.title = `${nomComplet(f)} - Label Explorer`;
    },
    fermer() {
      fermerPleinEcran();
      fiche = null;
      document.title = "Label Explorer - François Lurton";
    },
  };
}
