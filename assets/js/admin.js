// Fonctions admin : formulaire de création / modification / duplication, archivage, suppression.
import { creerFiche, modifierFiche, supprimerFiche, enregistrerFichier, nouvelId, cheminsDe, supprimerFichiers } from "./donnees.js";
import { TYPES, COULEURS, INPI, PRIX, STATUTS, PAYS, majuscules } from "./referentiels.js";
import { CONFIG } from "./config.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fr = new Intl.Collator("fr", { sensitivity: "base" });
const sansAccent = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const MAX_VISUELS = 6;
const MAX_IMAGE = 3 * 1024 * 1024, MAX_PDF = 10 * 1024 * 1024; // visuels : idéalement < 1 Mo
const FORMATS_IMAGE = ["image/jpeg", "image/png"];

// champs saisis directement dans le formulaire (le reste : marchés, visuels, PDF)
const CHAMPS = ["titre", "marque", "type", "couleur", "inpi", "prix", "statut", "contenance", "dimension",
  "cepage", "appellation", "demandeur", "designer", "ref", "jus", "storytelling", "commentaire"];

const VIERGE = { type: TYPES[0], couleur: "", inpi: INPI[0], prix: PRIX[0], statut: "En attente",
  contenance: "75 cl", marches: [], visuels: [], couverture: 0, pdf: null };

// Chaque visuel existe en trois tailles :
//   miniature (640 px, quelques dizaines de Ko) pour la grille et les vignettes,
//   aperçu (1600 px, quelques centaines de Ko) pour la fiche détail et le plein écran,
//   original (jusqu'à 5 Mo), chargé seulement pour les téléchargements.
const TAILLES = { miniature: [640, 0.82], apercu: [1600, 0.85] };

// Version WebP réduite d'une image (cote = plus grand côté). null en cas d'échec : on se rabat sur l'original.
async function reduire(image, [cote, qualite]) {
  try {
    const bitmap = await createImageBitmap(image);
    const echelle = Math.min(1, cote / Math.max(bitmap.width, bitmap.height));
    const toile = document.createElement("canvas");
    toile.width = Math.round(bitmap.width * echelle);
    toile.height = Math.round(bitmap.height * echelle);
    toile.getContext("2d").drawImage(bitmap, 0, 0, toile.width, toile.height);
    bitmap.close();
    return await new Promise(ok => toile.toBlob(ok, "image/webp", qualite));
  } catch {
    return null;
  }
}

// fiches() : liste à jour, pour les suggestions de saisie.
// surChangement(type, fiche) : type = "creee" | "modifiee" | "supprimee".
export function creerAdmin({ notifier, fiches, surChangement }) {
  const dlg = $("formulaire"), form = $("formFiche");
  // brouillon : { id (null = nouvelle fiche), copie, marches[], couverture,
  //   visuels[] : déjà en ligne { url, chemin, miniature, cheminMiniature } ou nouveau { url (aperçu local), fichier },
  //   pdf : déjà en ligne { url, chemin, nom } ou nouveau { url, nom, fichier }, ou null }
  let brouillon = null, modifie = false;

  const remplirSelect = (sel, valeurs, vide) => {
    sel.innerHTML = (vide ? `<option value="">—</option>` : "") + valeurs.map(v => `<option value="${esc(v)}">${esc(majuscules(v))}</option>`).join("");
  };
  remplirSelect(form.elements.type, TYPES);
  remplirSelect(form.elements.couleur, COULEURS, true);
  remplirSelect(form.elements.inpi, INPI);
  remplirSelect(form.elements.prix, PRIX);
  remplirSelect(form.elements.statut, STATUTS);

  // valeurs déjà saisies ailleurs, proposées à la frappe pour garder des libellés identiques (utile aux filtres)
  function remplirSuggestions() {
    for (const [id, cle] of [["listeMarques", "marque"], ["listeAppellations", "appellation"], ["listeDesigners", "designer"]]) {
      $(id).innerHTML = [...new Set(fiches().map(f => f[cle]).filter(Boolean))].sort(fr.compare)
        .map(v => `<option value="${esc(v)}">`).join("");
    }
  }

  function ouvrir(titre, source, id, copie = false) {
    brouillon = {
      id, copie,
      marches: [...source.marches],
      visuels: source.visuels.map(v => ({ ...v })),
      couverture: source.couverture ?? 0,
      pdf: source.pdf ? { ...source.pdf } : null,
    };
    for (const cle of CHAMPS) form.elements[cle].value = source[cle] ?? "";
    form.querySelectorAll("[aria-invalid]").forEach(e => e.removeAttribute("aria-invalid"));
    $("formTitre").textContent = titre;
    $("formPays").value = "";
    remplirSuggestions();
    rendreMarches();
    rendrePays();
    afficherRefus([]);
    rendreVisuels();
    rendrePdf();
    modifie = false;
    dlg.showModal();
    dlg.querySelector(".modale__corps").scrollTop = 0;
    form.elements.titre.focus();
  }

  function annuler() {
    if (modifie && !confirm("Abandonner les modifications ?")) return;
    dlg.close();
  }
  form.addEventListener("input", e => {
    modifie = true;
    if (e.target.value.trim()) e.target.removeAttribute("aria-invalid");
  });
  form.addEventListener("change", () => { modifie = true; });
  dlg.querySelectorAll("[data-annuler]").forEach(b => b.addEventListener("click", annuler));
  dlg.addEventListener("cancel", e => { e.preventDefault(); annuler(); }); // touche Échap

  // ---------- marchés ciblés ----------
  function rendreMarches() {
    $("formMarches").innerHTML = brouillon.marches.map(p =>
      `<span class="puce">${esc(p)}<button type="button" data-pays="${esc(p)}" aria-label="Retirer ${esc(p)}">✕</button></span>`).join("");
  }
  const propositions = () => {
    const q = sansAccent($("formPays").value.trim());
    return q ? PAYS.filter(p => sansAccent(p).includes(q) && !brouillon.marches.includes(p)).slice(0, 6) : [];
  };
  function rendrePays() {
    $("formSuggestions").innerHTML = propositions().map(p =>
      `<button type="button" class="suggestion" data-pays="${esc(p)}">+ ${esc(p)}</button>`).join("");
  }
  function ajouterPays(p) {
    if (!p || brouillon.marches.includes(p)) return;
    brouillon.marches.push(p);
    modifie = true;
    $("formPays").value = "";
    rendreMarches();
    rendrePays();
    $("formPays").focus();
  }
  $("formPays").addEventListener("input", rendrePays);
  // Entrée : premier pays proposé, ou le texte tel quel s'il n'est pas dans la liste
  $("formPays").addEventListener("keydown", e => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const saisi = $("formPays").value.trim();
    ajouterPays(propositions()[0] ?? (saisi && saisi[0].toUpperCase() + saisi.slice(1)));
  });
  $("formSuggestions").addEventListener("click", e => {
    const b = e.target.closest("[data-pays]");
    if (b) ajouterPays(b.dataset.pays);
  });
  $("formMarches").addEventListener("click", e => {
    const b = e.target.closest("[data-pays]");
    if (!b) return;
    brouillon.marches = brouillon.marches.filter(p => p !== b.dataset.pays);
    modifie = true;
    rendreMarches();
    rendrePays();
  });

  // ---------- visuels ----------
  function rendreVisuels() {
    const { visuels, couverture } = brouillon;
    $("formCompte").textContent = `(${visuels.length} / ${MAX_VISUELS})`;
    $("formVisuels").innerHTML = visuels.map((v, i) => `
      <div class="vignette${i === couverture ? " vignette--couv" : ""}">
        <button type="button" class="vignette__image" data-action="couverture" data-i="${i}"
          aria-label="Visuel ${i + 1}${i === couverture ? ", couverture" : " : en faire la couverture"}"><img src="${esc(v.miniature || v.url)}" alt=""></button>
        ${i === couverture ? `<span class="vignette__couv">COUV.</span>` : ""}
        <button type="button" class="vignette__suppr" data-action="retirer" data-i="${i}" aria-label="Retirer le visuel ${i + 1}">✕</button>
        <div class="vignette__ordre">
          <button type="button" data-action="avant" data-i="${i}" aria-label="Déplacer le visuel ${i + 1} vers la gauche"${i === 0 ? " disabled" : ""}>‹</button>
          <button type="button" data-action="apres" data-i="${i}" aria-label="Déplacer le visuel ${i + 1} vers la droite"${i === visuels.length - 1 ? " disabled" : ""}>›</button>
        </div>
      </div>`).join("") + (visuels.length < MAX_VISUELS ? `
      <label class="vignette vignette--ajout">
        <input type="file" accept="image/jpeg,image/png" multiple class="masque" id="formFichiers">
        <span aria-hidden="true">+</span>Ajouter
      </label>` : "");
  }

  // Fichiers refusés : listés sous les visuels, dans le formulaire (une notification serait cachée par la fenêtre).
  // Le message reste jusqu'au prochain ajout ou à la fermeture du formulaire.
  const taille = octets => `${(octets / 1048576).toFixed(1).replace(".", ",")} Mo`;
  function afficherRefus(refus) {
    $("formRefus").hidden = !refus.length;
    $("formRefus").innerHTML = refus.length
      ? `<p>${refus.length > 1 ? `${refus.length} fichiers n'ont pas été ajoutés :` : "Ce fichier n'a pas été ajouté :"}</p>
         <ul>${refus.map(r => `<li>${esc(r)}</li>`).join("")}</ul>`
      : "";
  }

  function ajouterImages(liste) {
    const refus = [];
    for (const fichier of liste) {
      if (!FORMATS_IMAGE.includes(fichier.type)) refus.push(`« ${fichier.name} » : format non accepté, uniquement JPG ou PNG.`);
      else if (fichier.size > MAX_IMAGE) refus.push(`« ${fichier.name} » : ${taille(fichier.size)}, au-delà de la limite de 3 Mo.`);
      else if (brouillon.visuels.length >= MAX_VISUELS) refus.push(`« ${fichier.name} » : la fiche a déjà ${MAX_VISUELS} visuels, le maximum.`);
      else {
        brouillon.visuels.push({ url: URL.createObjectURL(fichier), fichier });
        modifie = true;
      }
    }
    afficherRefus(refus);
    rendreVisuels();
  }

  $("formVisuels").addEventListener("change", e => {
    if (e.target.id === "formFichiers") ajouterImages(e.target.files);
  });
  $("formVisuels").addEventListener("click", e => {
    const b = e.target.closest("[data-action]");
    if (!b) return;
    const i = Number(b.dataset.i), v = brouillon.visuels;
    const couv = v[brouillon.couverture];
    if (b.dataset.action === "couverture") brouillon.couverture = i;
    if (b.dataset.action === "retirer") {
      v.splice(i, 1);
      brouillon.couverture = Math.max(0, v.indexOf(couv));
    }
    if (b.dataset.action === "avant" || b.dataset.action === "apres") {
      const j = b.dataset.action === "avant" ? i - 1 : i + 1;
      [v[i], v[j]] = [v[j], v[i]];
      brouillon.couverture = v.indexOf(couv); // la couverture suit son visuel
    }
    modifie = true;
    rendreVisuels();
  });
  // glisser-déposer des fichiers sur la zone des visuels
  $("formVisuels").addEventListener("dragover", e => { e.preventDefault(); $("formVisuels").classList.add("depot"); });
  $("formVisuels").addEventListener("dragleave", () => $("formVisuels").classList.remove("depot"));
  $("formVisuels").addEventListener("drop", e => {
    e.preventDefault();
    $("formVisuels").classList.remove("depot");
    ajouterImages(e.dataTransfer.files);
  });

  // ---------- PDF ----------
  // Fonction en pause (CONFIG.pdf) : section grisée, rien à cliquer. Un PDF déjà joint est conservé tel quel.
  $("sectionPdf").classList.toggle("en-pause", !CONFIG.pdf);
  function rendrePdf() {
    if (!CONFIG.pdf) {
      $("formPdf").innerHTML = `<span class="btn-ghost" aria-disabled="true">Joindre un PDF</span>`;
      return;
    }
    $("formPdf").innerHTML = brouillon.pdf
      ? `<div class="pdf-fichier"><span class="pdf-fichier__nom">${esc(brouillon.pdf.nom)}</span>
           <button type="button" class="link" data-action="retirer-pdf">Retirer</button></div>`
      : `<label class="btn-ghost"><input type="file" accept="application/pdf" class="masque" id="formFichierPdf">Joindre un PDF</label>`;
  }
  $("formPdf").addEventListener("change", e => {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    if (fichier.type !== "application/pdf") notifier(`« ${fichier.name} » n'est pas un PDF.`);
    else if (fichier.size > MAX_PDF) notifier(`« ${fichier.name} » dépasse 10 Mo.`);
    else brouillon.pdf = { url: URL.createObjectURL(fichier), nom: fichier.name, fichier };
    rendrePdf();
  });
  $("formPdf").addEventListener("click", e => {
    if (!e.target.closest("[data-action='retirer-pdf']")) return;
    brouillon.pdf = null;
    modifie = true;
    rendrePdf();
  });

  // ---------- enregistrement ----------
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const manquants = ["titre", "marque"].filter(c => !form.elements[c].value.trim());
    for (const c of ["titre", "marque"]) form.elements[c].toggleAttribute("aria-invalid", manquants.includes(c));
    if (manquants.length) {
      form.elements[manquants[0]].focus();
      return;
    }

    const bouton = $("formEnregistrer");
    bouton.disabled = true;
    bouton.textContent = "Enregistrement…";
    try {
      const id = brouillon.id ?? nouvelId();
      const ancienne = brouillon.id && fiches().find(f => f.id === brouillon.id);

      // Envoie les versions réduites qui manquent encore (miniature, aperçu), à partir de l'image source.
      // Une réduction impossible renvoie à l'original : l'affichage marche, juste plus lentement.
      const envoyerReductions = async (source, nom, deja) => {
        const res = {};
        for (const [taille, reglage] of Object.entries(TAILLES)) {
          const cleChemin = taille === "miniature" ? "cheminMiniature" : "cheminApercu";
          if (deja[taille] && deja[cleChemin]) { res[taille] = deja[taille]; res[cleChemin] = deja[cleChemin]; continue; }
          const reduit = await reduire(source, reglage);
          const envoye = reduit && await enregistrerFichier(id, `${nom}-${taille}.webp`, reduit, "image/webp");
          res[taille] = envoye?.url ?? deja.url;
          res[cleChemin] = envoye?.chemin ?? "";
        }
        return res;
      };

      const envoyerVisuel = async v => {
        // nouveau fichier : original + versions réduites
        if (v.fichier) {
          const nom = crypto.randomUUID();
          const original = await enregistrerFichier(id, `${nom}.${v.fichier.type === "image/png" ? "png" : "jpg"}`, v.fichier, v.fichier.type);
          URL.revokeObjectURL(v.url); // aperçu local devenu inutile
          return { ...original, ...(await envoyerReductions(v.fichier, nom, { url: original.url })) };
        }
        // déjà en ligne : gardé tel quel, sauf s'il date d'avant une des tailles réduites
        const garde = { url: v.url, chemin: v.chemin, miniature: v.miniature ?? v.url, cheminMiniature: v.cheminMiniature ?? "",
          apercu: v.apercu ?? v.url, cheminApercu: v.cheminApercu ?? "" };
        if (garde.cheminMiniature && garde.cheminApercu) return garde;
        try {
          const source = await (await fetch(v.url)).blob();
          const nom = v.chemin.split("/").pop().replace(/\.[^.]+$/, "");
          return { ...garde, ...(await envoyerReductions(source, nom, garde)) };
        } catch {
          return garde;
        }
      };
      const envoyerPdf = async p => {
        if (!p.fichier) return { url: p.url, chemin: p.chemin, nom: p.nom };
        const envoye = await enregistrerFichier(id, `${crypto.randomUUID()}.pdf`, p.fichier, "application/pdf");
        URL.revokeObjectURL(p.url);
        return { ...envoye, nom: p.nom };
      };

      const visuels = await Promise.all(brouillon.visuels.map(envoyerVisuel));
      const donnees = {
        ...Object.fromEntries(CHAMPS.map(c => [c, form.elements[c].value.trim()])),
        marches: brouillon.marches,
        visuels,
        couverture: Math.min(brouillon.couverture, Math.max(visuels.length - 1, 0)),
        pdf: brouillon.pdf ? await envoyerPdf(brouillon.pdf) : null,
      };
      if (ancienne) {
        const maj = await modifierFiche(id, donnees);
        surChangement("modifiee", maj);
        // visuels ou PDF retirés : on libère les fichiers que plus aucune fiche n'utilise
        const gardes = new Set(cheminsDe(maj));
        supprimerFichiers(cheminsDe(ancienne).filter(c => !gardes.has(c)), fiches());
        notifier("Fiche enregistrée.");
      } else {
        surChangement("creee", await creerFiche(id, { ...donnees, archive: false }));
        notifier(brouillon.copie ? "Copie créée." : "Fiche créée.");
      }
      modifie = false;
      dlg.close();
    } catch {
      notifier("Enregistrement impossible. Réessayez.");
    } finally {
      bouton.disabled = false;
      bouton.textContent = "Enregistrer";
    }
  });

  // ---------- suppression ----------
  let aSupprimer = null;
  const sup = $("suppression");
  $("supAnnuler").addEventListener("click", () => sup.close());
  sup.addEventListener("click", e => { if (e.target === sup) sup.close(); }); // clic sur le fond
  $("supConfirmer").addEventListener("click", async () => {
    try {
      await supprimerFiche(aSupprimer.id);
      surChangement("supprimee", aSupprimer);
      // fichiers partagés avec une copie : gardés tant qu'une fiche s'en sert
      supprimerFichiers(cheminsDe(aSupprimer), fiches());
      notifier("Fiche supprimée.");
    } catch {
      notifier("Suppression impossible. Réessayez.");
    }
    sup.close();
  });

  return {
    ouvrirCreation: () => ouvrir("Nouvelle fiche", VIERGE, null),
    ouvrirModification: f => ouvrir("Modifier la fiche", f, f.id),
    // la copie n'existe qu'une fois enregistrée : annuler ne laisse aucune fiche en trop
    ouvrirDuplication: f => ouvrir("Dupliquer la fiche", { ...f, titre: `${f.titre} (copie)` }, null, true),
    async basculerArchive(f) {
      try {
        const maj = await modifierFiche(f.id, { archive: !f.archive }, { horodater: false });
        surChangement("modifiee", maj);
        notifier(maj.archive ? "Fiche archivée." : "Fiche désarchivée.");
      } catch {
        notifier("Action impossible. Réessayez.");
      }
    },
    demanderSuppression(f) {
      aSupprimer = f;
      $("supNom").textContent = f.titre;
      sup.showModal();
      $("supAnnuler").focus();
    },
  };
}
