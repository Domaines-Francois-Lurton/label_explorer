// Tableau de bord : bandeau, recherche, filtres, tri et grille des fiches.
import { chargerFiches } from "./donnees.js";
import { TYPES, COULEURS, INPI, PRIX, STATUTS, STATUT_BADGE, COULEUR_POINT, COULEUR_FOND, majuscules } from "./referentiels.js";
import { CONFIG } from "./config.js";
import { creerVueFiche } from "./fiche.js";
import { creerAdmin } from "./admin.js";

const $ = id => document.getElementById(id);
const fr = new Intl.Collator("fr", { sensitivity: "base" });

// Plusieurs valeurs cochées dans un même filtre : OU. Filtres différents : ET.
const FILTRES = [
  { cle: "statut", libelle: "Statut du projet", valeurs: () => STATUTS },
  { cle: "type", libelle: "Type de produit", valeurs: () => TYPES },
  { cle: "couleur", libelle: "Couleur", valeurs: () => COULEURS },
  { cle: "prix", libelle: "Positionnement prix", valeurs: () => PRIX },
  { cle: "inpi", libelle: "Statut INPI", valeurs: () => INPI },
  // listes libres : seulement les valeurs présentes dans les fiches affichables
  { cle: "appellation", libelle: "Appellation", valeurs: fiches => [...new Set(fiches.map(f => f.appellation).filter(Boolean))].sort(fr.compare) },
  { cle: "marches", libelle: "Marchés ciblés", valeurs: fiches => [...new Set(fiches.flatMap(f => f.marches))].sort(fr.compare) },
];

// Le texte des fiches viendra de la saisie admin : on l'échappe toujours avant de l'insérer.
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ICONE_VIDE = `<svg class="carte__vide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-4.5-4.5L8 19"/></svg>`;

const icone = d => `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONES = {
  modifier: icone(`<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>`),
  dupliquer: icone(`<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>`),
  archiver: icone(`<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9M10 13h4"/>`),
  supprimer: icone(`<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>`),
};

export async function demarrer({ role, deconnecter }) {
  const admin = role === "admin";
  let fiches = [], echecChargement = false;
  try {
    fiches = await chargerFiches({ admin });
  } catch {
    echecChargement = true;
  }
  const etat = {
    fiches,
    recherche: "",
    filtres: Object.fromEntries(FILTRES.map(f => [f.cle, []])),
    tri: "date", sens: "desc",
    archives: false,
    ouvert: null, // filtre dont la liste est dépliée
    vue: "catalogue", // ou "fiche"
    ficheId: null,    // fiche ouverte
    defilement: 0,    // position dans le catalogue, retrouvée au retour d'une fiche
    depuisCatalogue: false,
  };

  $("logout").addEventListener("click", deconnecter);
  for (const id of ["role", "archives", "nouvelle", "ficheActions"]) $(id).classList.toggle("hidden", !admin);

  // Notification temporaire. Ouverte en popover (couche supérieure du navigateur) pour rester visible
  // même au-dessus du formulaire admin ; rouverte à chaque message pour repasser devant une fenêtre ouverte entre-temps.
  let minuterie, fermeture;
  const notifier = message => {
    const toast = $("toast");
    toast.textContent = message;
    clearTimeout(minuterie);
    clearTimeout(fermeture);
    if (toast.matches(":popover-open")) toast.hidePopover();
    toast.showPopover();
    requestAnimationFrame(() => toast.classList.add("visible"));
    minuterie = setTimeout(() => {
      toast.classList.remove("visible");
      fermeture = setTimeout(() => toast.hidePopover(), 200); // après le fondu
    }, 3200);
  };
  const vueFiche = creerVueFiche({ notifier });

  // ---------- admin : créer, modifier, dupliquer, archiver, supprimer ----------
  const actions = admin && creerAdmin({
    notifier,
    fiches: () => etat.fiches,
    surChangement(type, fiche) {
      if (type === "creee") etat.fiches.push(fiche);
      if (type === "modifiee") etat.fiches = etat.fiches.map(f => f.id === fiche.id ? fiche : f);
      if (type === "supprimee") etat.fiches = etat.fiches.filter(f => f.id !== fiche.id);
      afficherFiltres(); // de nouvelles valeurs (appellation, pays) peuvent apparaître
      afficherGrille();
      if (etat.vue === "fiche" && etat.ficheId === fiche.id) {
        if (type === "supprimee") { history.replaceState(null, "", location.pathname + location.search); naviguer(); }
        else afficherFiche(fiche);
      }
    },
  });
  const agir = (action, fiche) => ({
    modifier: () => actions.ouvrirModification(fiche),
    dupliquer: () => actions.ouvrirDuplication(fiche),
    archiver: () => actions.basculerArchive(fiche),
    supprimer: () => actions.demanderSuppression(fiche),
  })[action]?.();

  if (admin) {
    $("nouvelle").addEventListener("click", () => actions.ouvrirCreation());
    $("grille").addEventListener("click", e => {
      const b = e.target.closest("[data-action]");
      if (b) agir(b.dataset.action, etat.fiches.find(f => f.id === b.closest(".carte").dataset.id));
    });
    $("ficheActions").addEventListener("click", e => {
      const b = e.target.closest("[data-action]");
      if (b) agir(b.dataset.action, etat.fiches.find(f => f.id === etat.ficheId));
    });
  }

  function afficherFiche(fiche) {
    etat.ficheId = fiche.id;
    vueFiche.afficher(fiche);
    $("ficheActions").querySelector("[data-action='archiver']").textContent = fiche.archive ? "Désarchiver" : "Archiver";
  }

  // ---------- admin : grand écran uniquement ----------
  const petitEcran = matchMedia("(max-width: 819px)");
  const majEcran = () => {
    const bloque = admin && petitEcran.matches;
    $("adminMobile").classList.toggle("hidden", !bloque);
    $("catalogue").classList.toggle("hidden", bloque || etat.vue !== "catalogue");
    $("fiche").classList.toggle("hidden", bloque || etat.vue !== "fiche");
  };
  petitEcran.addEventListener("change", majEcran);

  // ---------- navigation : #fiche/<id> ouvre une fiche, sans adresse on revient au catalogue ----------
  function naviguer() {
    const m = location.hash.match(/^#fiche\/(.+)$/);
    const fiche = m && enVueTout().find(f => f.id === decodeURIComponent(m[1]));
    if (m && !fiche) history.replaceState(null, "", location.pathname + location.search);

    if (fiche) {
      if (etat.vue === "catalogue") etat.defilement = scrollY;
      etat.vue = "fiche";
      afficherFiche(fiche);
      majEcran();
      scrollTo(0, 0);
      $("retour").focus({ preventScroll: true });
    } else if (etat.vue === "fiche") {
      etat.vue = "catalogue";
      etat.ficheId = null;
      vueFiche.fermer();
      majEcran();
      scrollTo(0, etat.defilement);
    } else {
      majEcran();
    }
  }
  addEventListener("hashchange", () => { etat.depuisCatalogue = etat.vue === "catalogue"; naviguer(); });
  // Retour : on remonte l'historique si on vient du catalogue, sinon (lien direct) on y va
  $("retour").addEventListener("click", () => {
    if (etat.depuisCatalogue) history.back();
    else { history.pushState(null, "", location.pathname + location.search); naviguer(); }
  });

  // ---------- bandeau ----------
  const { bandeau } = CONFIG;
  if (bandeau.afficher && bandeau.texte) {
    $("bandeau").classList.remove("hidden");
    const item = $("bandeauTexte"), piste = $("bandeauPiste");
    item.textContent = bandeau.texte;
    const copie = item.cloneNode(true);
    copie.removeAttribute("id");
    copie.setAttribute("aria-hidden", "true");
    piste.appendChild(copie);
    const mesurer = () => {
      const distance = item.getBoundingClientRect().width + 64; // 64 = gap de la piste
      piste.style.setProperty("--marquee-distance", distance + "px");
      piste.style.setProperty("--marquee-duration", distance / bandeau.vitesse + "s");
    };
    mesurer();
    document.fonts?.ready.then(mesurer);
  }

  // ---------- sélection des fiches ----------
  const enVue = () => etat.fiches.filter(f => !f.archive || (admin && etat.archives));
  // une fiche archivée reste ouvrable par lien pour l'admin, même archives masquées
  const enVueTout = () => etat.fiches.filter(f => !f.archive || admin);

  function correspond(f) {
    for (const { cle } of FILTRES) {
      const choix = etat.filtres[cle];
      if (!choix.length) continue;
      const ok = cle === "marches" ? choix.some(p => f.marches.includes(p)) : choix.includes(f[cle]);
      if (!ok) return false;
    }
    const q = etat.recherche.trim().toLowerCase();
    return !q || f.titre.toLowerCase().includes(q) || f.marque.toLowerCase().includes(q);
  }

  function trier(liste) {
    const signe = etat.sens === "asc" ? 1 : -1;
    const cmp = etat.tri === "alpha"
      ? (a, b) => fr.compare(a.titre, b.titre)
      : (a, b) => a.modifieLe.localeCompare(b.modifieLe) || fr.compare(b.titre, a.titre);
    return liste.sort((a, b) => signe * cmp(a, b));
  }

  // ---------- filtres ----------
  function afficherFiltres() {
    const fiches = enVue();
    $("filtres").innerHTML = FILTRES.map(({ cle, libelle, valeurs }) => {
      // une valeur cochée peut disparaître de la liste (ex. pays d'une fiche archivée) : on la garde visible
      const options = [...new Set([...valeurs(fiches), ...etat.filtres[cle]])];
      return `<div class="filtre">
        <button type="button" class="pill" data-cle="${cle}" aria-expanded="false" aria-controls="pop-${cle}">
          <span class="pill__libelle"></span><span class="chev" aria-hidden="true">▾</span></button>
        <div class="pop" id="pop-${cle}" role="group" aria-label="${esc(libelle)}" hidden>
          ${options.map(v => `<label class="opt"><input type="checkbox" data-cle="${cle}" value="${esc(v)}"${etat.filtres[cle].includes(v) ? " checked" : ""}>${esc(majuscules(v))}</label>`).join("")}
        </div></div>`;
    }).join("");
    majPills();
  }

  function majPills() {
    for (const { cle, libelle } of FILTRES) {
      const pill = $("filtres").querySelector(`.pill[data-cle="${cle}"]`);
      const n = etat.filtres[cle].length;
      pill.querySelector(".pill__libelle").textContent = n ? `${libelle} (${n})` : libelle;
      pill.classList.toggle("on", n > 0);
      const ouvert = etat.ouvert === cle;
      pill.setAttribute("aria-expanded", ouvert);
      $(`pop-${cle}`).hidden = !ouvert;
    }
    const actifs = Object.values(etat.filtres).some(v => v.length) || etat.recherche.trim();
    $("reinitialiser").disabled = !actifs;
  }

  function ouvrir(cle) {
    etat.ouvert = etat.ouvert === cle ? null : cle;
    majPills();
  }

  $("filtres").addEventListener("click", e => {
    const pill = e.target.closest(".pill");
    if (pill) ouvrir(pill.dataset.cle);
  });
  $("filtres").addEventListener("change", e => {
    const { cle } = e.target.dataset;
    const choix = etat.filtres[cle];
    etat.filtres[cle] = e.target.checked ? [...choix, e.target.value] : choix.filter(v => v !== e.target.value);
    majPills();
    afficherGrille();
  });
  // clic ailleurs ou Échap : on referme la liste dépliée
  document.addEventListener("click", e => {
    if (etat.ouvert && !e.target.closest(".filtre")) { etat.ouvert = null; majPills(); }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && etat.ouvert) {
      const pill = $("filtres").querySelector(`.pill[data-cle="${etat.ouvert}"]`);
      etat.ouvert = null;
      majPills();
      pill.focus();
    }
    // « / » place le curseur dans la recherche, comme sur le Portail
    if (e.key === "/" && etat.vue === "catalogue" && !e.target.closest("input, select, textarea")) {
      e.preventDefault();
      $("recherche").focus();
    }
  });

  function reinitialiser() {
    etat.filtres = Object.fromEntries(FILTRES.map(f => [f.cle, []]));
    etat.recherche = "";
    etat.ouvert = null;
    $("recherche").value = "";
    afficherFiltres();
    afficherGrille();
  }
  $("reinitialiser").addEventListener("click", reinitialiser);
  $("videReinitialiser").addEventListener("click", reinitialiser);

  // ---------- recherche, tri, archives ----------
  $("recherche").addEventListener("input", e => {
    etat.recherche = e.target.value;
    majPills();
    afficherGrille();
  });
  const majSens = sens => {
    etat.sens = sens;
    $("sens").textContent = sens === "asc" ? "↑" : "↓";
    afficherGrille();
  };
  // chaque tri repart dans son sens naturel : A → Z, ou la plus récente d'abord
  $("tri").addEventListener("change", e => { etat.tri = e.target.value; majSens(etat.tri === "alpha" ? "asc" : "desc"); });
  $("sens").addEventListener("click", () => majSens(etat.sens === "asc" ? "desc" : "asc"));
  $("archives").addEventListener("click", () => {
    etat.archives = !etat.archives;
    $("archives").setAttribute("aria-pressed", etat.archives);
    $("archives").textContent = etat.archives ? "Masquer les archives" : "Voir les archives";
    afficherFiltres();
    afficherGrille();
  });

  // ---------- grille ----------
  // nombre de cartes par ligne : préférence propre à chaque navigateur
  const CLE_COLONNES = "label-explorer-colonnes";
  function majColonnes(n) {
    $("grille").classList.toggle("grille--3", n === "3");
    $("grille").classList.toggle("grille--4", n === "4");
    document.querySelectorAll(".disposition button").forEach(b => b.setAttribute("aria-pressed", b.dataset.colonnes === n));
  }
  document.querySelector(".disposition").addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b) return;
    majColonnes(b.dataset.colonnes);
    try { localStorage.setItem(CLE_COLONNES, b.dataset.colonnes); } catch { /* sans mémorisation */ }
  });
  let colonnes = "3";
  try { colonnes = localStorage.getItem(CLE_COLONNES) === "4" ? "4" : "3"; } catch { /* valeur par défaut */ }
  majColonnes(colonnes);

  function carte(f) {
    const couverture = f.visuels[f.couverture];
    const visuel = couverture
      ? `<img src="${esc(couverture.miniature || couverture.url)}" alt="" loading="lazy">`
      : ICONE_VIDE;
    const couleur = f.couleur
      ? `<span class="point" style="background:${COULEUR_POINT[f.couleur]}" title="${esc(majuscules(f.couleur))}"></span>` : "";
    // actions admin hors du lien : un bouton ne peut pas être dans un <a>.
    // En 4 cartes par ligne, seule l'icône reste visible (libellé en infobulle).
    const bouton = (action, libelle, icone, classe = "") =>
      `<button type="button" data-action="${action}" class="${classe}" title="${libelle}" aria-label="${libelle} « ${esc(f.titre)} »">${icone}<span>${libelle}</span></button>`;
    const actionsAdmin = admin ? `<div class="carte__actions">
        ${bouton("modifier", "Modifier", ICONES.modifier)}
        ${bouton("dupliquer", "Dupliquer", ICONES.dupliquer)}
        ${bouton("archiver", f.archive ? "Désarchiver" : "Archiver", ICONES.archiver)}
        ${bouton("supprimer", "Supprimer", ICONES.supprimer, "danger")}
      </div>` : "";
    return `<article class="carte${f.archive ? " archivee" : ""}" data-id="${esc(f.id)}">
      <a class="carte__lien" href="#fiche/${encodeURIComponent(f.id)}">
      <div class="carte__visuel" style="background:${COULEUR_FOND[f.couleur] ?? COULEUR_FOND[""]}">
        ${visuel}
        <div class="carte__badges">
          ${f.archive ? `<span class="badge b-n">Archivée</span>` : ""}
          <span class="badge ${STATUT_BADGE[f.statut]}">${esc(majuscules(f.statut))}</span>
        </div>
      </div>
      <div class="carte__corps">
        <h3 class="carte__titre">${esc(f.titre)}</h3>
        <p class="carte__marque">${esc(f.marque)}</p>
        <div class="carte__reperes"><span class="tag">${esc(majuscules(f.type))}</span>${couleur}</div>
      </div>
      </a>
      ${actionsAdmin}
    </article>`;
  }

  function afficherGrille() {
    const liste = trier(enVue().filter(correspond));
    $("grille").innerHTML = liste.map(carte).join("");
    $("compte").textContent = liste.length > 1 ? `${liste.length} fiches` : liste.length ? "1 fiche" : "Aucune fiche";
    $("vide").classList.toggle("hidden", liste.length > 0);
    // trois raisons possibles à une grille vide : échec du chargement, catalogue vide, filtres trop stricts
    const catalogueVide = enVue().length === 0;
    $("videTexte").textContent = echecChargement
      ? "Impossible de charger le catalogue. Vérifiez la connexion puis rechargez la page."
      : catalogueVide
        ? (admin ? "Le catalogue est vide. Créez la première fiche avec « + Nouvelle fiche »." : "Le catalogue est vide pour le moment.")
        : "Aucune fiche ne correspond à ces critères.";
    $("videReinitialiser").classList.toggle("hidden", echecChargement || catalogueVide);
  }

  afficherFiltres();
  afficherGrille();
  naviguer();
}
