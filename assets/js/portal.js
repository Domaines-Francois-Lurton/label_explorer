/* =============================================================
   Portail Marketing — logique du portail
   Rendu des tuiles, recherche et date. Aucune dépendance externe.
   Les données proviennent de /config.js (window.PORTAL_CONFIG).
   ============================================================= */

(function () {
  "use strict";

  var cfg = window.PORTAL_CONFIG || {};
  var apps = Array.isArray(cfg.apps) ? cfg.apps : [];
  var brand = cfg.brand || {};
  var announcement = cfg.announcement || {};

  var el = {
    root: document.documentElement,
    eyebrow: document.getElementById("brand-name"),
    title: document.getElementById("hero-title"),
    subtitle: document.getElementById("hero-subtitle"),
    date: document.getElementById("header-date"),
    announcement: document.getElementById("announcement"),
    announcementTrack: document.getElementById("announcement-track"),
    announcementItem: document.getElementById("announcement-item"),
    search: document.getElementById("search"),
    count: document.getElementById("app-count"),
    grid: document.getElementById("app-grid"),
    empty: document.getElementById("empty-state"),
    emptyQuery: document.getElementById("empty-query"),
    footer: document.getElementById("footer-text"),
  };

  /* --- Utilitaires ------------------------------------------- */

  function setText(node, value) {
    if (node && typeof value === "string" && value.length) node.textContent = value;
  }

  // Insensible à la casse ET aux accents : « medaille » trouve « médailles ».
  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function formatDate(date) {
    var label = date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  /* --- Bandeau défilant ---------------------------------------
     Doit rester sur une seule ligne et boucler sans couture : on
     duplique le message, puis on translate la piste de la largeur
     exacte d'un exemplaire (message + espacement). La durée est
     déduite de cette distance pour que la vitesse reste constante,
     quelle que soit la longueur du texte.
     -------------------------------------------------------------- */

  var MARQUEE_GAP = 64; // doit correspondre au `gap` de .announcement__track

  function setupMarquee() {
    var track = el.announcementTrack;
    var item = el.announcementItem;
    if (!track || !item) return;

    if (announcement.direction === "droite-gauche") {
      el.announcement.classList.remove("announcement--ltr");
    } else {
      el.announcement.classList.add("announcement--ltr");
    }

    // Second exemplaire, invisible pour les lecteurs d'écran.
    var clone = item.cloneNode(true);
    clone.removeAttribute("id");
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);

    var speed = Number(announcement.vitesse) > 0 ? Number(announcement.vitesse) : 60;

    function measure() {
      var distance = item.getBoundingClientRect().width + MARQUEE_GAP;
      track.style.setProperty("--marquee-distance", distance + "px");
      track.style.setProperty("--marquee-duration", distance / speed + "s");
    }

    measure();
    // Les largeurs changent une fois la police Inter chargée : on remesure.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  }

  /* --- Rendu statique ---------------------------------------- */

  function renderChrome() {
    el.root.setAttribute("data-theme", cfg.theme || "frais");

    setText(el.eyebrow, brand.eyebrow);
    setText(el.title, brand.title);
    setText(el.subtitle, brand.subtitle);
    setText(el.footer, brand.footer);

    var now = new Date();
    if (el.date) {
      el.date.textContent = formatDate(now);
      el.date.setAttribute("datetime", now.toISOString().slice(0, 10));
    }

    if (announcement.show === false) {
      if (el.announcement) el.announcement.remove();
    } else {
      setText(el.announcementItem.querySelector(".announcement__label"), announcement.label);
      setText(el.announcementItem.querySelector(".announcement__body"), announcement.text);
      setupMarquee();
    }
  }

  /* --- Tuiles ------------------------------------------------- */

  function buildTile(app, index) {
    var link = document.createElement("a");
    link.className = "tile";
    link.href = app.url || "#";
    link.style.animationDelay = Math.min(index, 12) * 0.03 + "s";
    // Chaque application s'ouvre à côté du portail, jamais à sa place.
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    var badge = document.createElement("span");
    badge.className = "tile__badge";
    badge.setAttribute("aria-hidden", "true");
    var colors = app.color || [];
    badge.style.backgroundImage =
      "linear-gradient(160deg, " + (colors[0] || "#7b8ea3") + ", " + (colors[1] || "#4b5c70") + ")";
    badge.textContent = app.initials || (app.name || "?").slice(0, 2).toUpperCase();

    var body = document.createElement("div");
    body.className = "tile__body";

    var name = document.createElement("div");
    name.className = "tile__name";

    var label = document.createElement("span");
    label.textContent = app.name || "Sans titre";
    name.appendChild(label);

    // Étiquette facultative (« En travaux », « Nouveau »...).
    if (app.badge) {
      var flag = document.createElement("span");
      flag.className = "tile__flag";
      flag.textContent = app.badge;
      name.appendChild(flag);
    }

    var desc = document.createElement("div");
    desc.className = "tile__desc";
    desc.textContent = app.desc || "";

    body.appendChild(name);
    body.appendChild(desc);
    link.appendChild(badge);
    link.appendChild(body);
    return link;
  }

  function render(query) {
    var needle = normalize(query).trim();
    var visible = needle
      ? apps.filter(function (app) {
          return (
            normalize(app.name).indexOf(needle) !== -1 ||
            normalize(app.desc).indexOf(needle) !== -1
          );
        })
      : apps;

    el.grid.textContent = "";
    visible.forEach(function (app, i) {
      el.grid.appendChild(buildTile(app, i));
    });

    el.count.textContent = "(" + visible.length + ")";

    var nothingFound = needle.length > 0 && visible.length === 0;
    el.empty.hidden = !nothingFound;
    if (nothingFound) el.emptyQuery.textContent = query.trim();
  }

  /* --- Interactions ------------------------------------------- */

  function bind() {
    el.search.addEventListener("input", function (e) {
      render(e.target.value);
    });

    // « / » place le curseur dans la recherche, « Échap » l'efface.
    document.addEventListener("keydown", function (e) {
      var typingElsewhere =
        document.activeElement && document.activeElement !== document.body;

      if (e.key === "/" && !typingElsewhere) {
        e.preventDefault();
        el.search.focus();
      } else if (e.key === "Escape" && document.activeElement === el.search) {
        el.search.value = "";
        render("");
      }
    });
  }

  /* --- Démarrage ---------------------------------------------- */

  renderChrome();
  render("");
  bind();
})();
