// MASCOT ART (version 2 opening screens). Original simple drawing of a cardinal.
// To use new art: replace the SVG text below, or set MASCOT_IMAGE to an image file
// in this folder (for example "intro/cardinal.png"). Nothing else needs to change.
const MASCOT_IMAGE = "";   // leave empty to use the drawing below

const MASCOT_SVG = `<svg viewBox="0 0 200 220" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <!-- crest -->
  <path d="M100 8 L128 62 L72 62 Z" fill="#c8102e"/>
  <path d="M108 2 L138 58 L96 50 Z" fill="#a50d25"/>
  <!-- body -->
  <ellipse cx="100" cy="190" rx="92" ry="70" fill="#a50d25"/>
  <!-- head -->
  <circle cx="100" cy="105" r="62" fill="#c8102e"/>
  <!-- black face mask -->
  <path d="M52 92 Q100 78 148 92 Q150 130 100 146 Q50 130 52 92 Z" fill="#1a1a1a"/>
  <!-- eyes -->
  <circle cx="78" cy="102" r="13" fill="#ffffff"/>
  <circle cx="122" cy="102" r="13" fill="#ffffff"/>
  <circle cx="80" cy="104" r="7" fill="#1a1a1a"/>
  <circle cx="120" cy="104" r="7" fill="#1a1a1a"/>
  <circle cx="83" cy="100" r="2.5" fill="#ffffff"/>
  <circle cx="123" cy="100" r="2.5" fill="#ffffff"/>
  <!-- beak -->
  <path d="M84 118 L116 118 L100 142 Z" fill="#f2a33a"/>
  <path d="M84 118 L116 118 L100 127 Z" fill="#e08a1e"/>
  <!-- cheeks -->
  <circle cx="58" cy="130" r="8" fill="#e8546b" opacity="0.8"/>
  <circle cx="142" cy="130" r="8" fill="#e8546b" opacity="0.8"/>
</svg>`;

function mascotArt(cls) {
  if (MASCOT_IMAGE) return `<img class="${cls}" src="${MASCOT_IMAGE}" alt="">`;
  return `<span class="${cls}">${MASCOT_SVG}</span>`;
}
