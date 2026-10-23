// Archive ZIP minimale, sans dépendance. Les fichiers sont stockés tels quels (pas de compression) :
// les visuels JPG / PNG sont déjà compressés, les recompresser ne gagnerait presque rien.

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(octets) {
  let c = 0xFFFFFFFF;
  for (const o of octets) c = TABLE[(c ^ o) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

// fichiers : [{ nom, octets: Uint8Array }] → Blob application/zip
export function creerZip(fichiers) {
  const enc = new TextEncoder();
  const d = new Date();
  const heure = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const jour = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const contenu = [], repertoire = [];
  let position = 0;

  for (const { nom, octets } of fichiers) {
    const n = enc.encode(nom), crc = crc32(octets), taille = octets.length;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);       // version requise
    local.setUint16(6, 0x0800, true);   // noms en UTF-8
    local.setUint16(10, heure, true);
    local.setUint16(12, jour, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, taille, true);  // taille stockée
    local.setUint32(22, taille, true);  // taille réelle
    local.setUint16(26, n.length, true);
    contenu.push(local, n, octets);

    const entree = new DataView(new ArrayBuffer(46));
    entree.setUint32(0, 0x02014b50, true);
    entree.setUint16(4, 20, true);
    entree.setUint16(6, 20, true);
    entree.setUint16(8, 0x0800, true);
    entree.setUint16(12, heure, true);
    entree.setUint16(14, jour, true);
    entree.setUint32(16, crc, true);
    entree.setUint32(20, taille, true);
    entree.setUint32(24, taille, true);
    entree.setUint16(28, n.length, true);
    entree.setUint32(42, position, true); // emplacement de l'en-tête local
    repertoire.push(entree, n);

    position += 30 + n.length + taille;
  }

  const tailleRepertoire = repertoire.reduce((s, p) => s + p.byteLength, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true);
  fin.setUint16(8, fichiers.length, true);
  fin.setUint16(10, fichiers.length, true);
  fin.setUint32(12, tailleRepertoire, true);
  fin.setUint32(16, position, true);

  return new Blob([...contenu, ...repertoire, fin], { type: "application/zip" });
}
