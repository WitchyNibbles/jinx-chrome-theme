import { THEME_STORE_URL, THEME_LOCAL_HINT } from "./config.js";

const btn = document.getElementById("install-theme");
const hint = document.getElementById("theme-hint");

if (THEME_STORE_URL) {
  btn.href = THEME_STORE_URL;
} else {
  // Aún sin publicar: el botón no lleva a ningún sitio, se explica la carga local.
  btn.setAttribute("aria-disabled", "true");
  btn.removeAttribute("href");
  hint.hidden = false;
  hint.textContent = `El tema todavía no está en la Web Store. Cárgalo en local: ${THEME_LOCAL_HINT}`;
}
