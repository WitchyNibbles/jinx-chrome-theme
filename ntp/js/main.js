import { startClock } from "./clock.js";
import { loadShortcuts, mountShortcuts } from "./shortcuts.js";
import { bindSearch } from "./search.js";
import { attachSearchPaint } from "./paint/search-paint.js";
import { ensurePaintDefs } from "./paint/svg.js";

const byId = (id) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Falta el elemento #${id} en newtab.html`);
  return el;
};

const registerGsapPlugins = () => {
  const { gsap, DrawSVGPlugin } = globalThis;
  if (!gsap || !DrawSVGPlugin) throw new Error("Faltan vendor/gsap.min.js o vendor/DrawSVGPlugin.min.js");
  gsap.registerPlugin(DrawSVGPlugin);
};

const init = async () => {
  registerGsapPlugins();
  ensurePaintDefs();
  startClock({ timeEl: byId("clock-time"), dateEl: byId("clock-date") });
  bindSearch(byId("search"), byId("search-input"));
  attachSearchPaint(byId("search"), byId("search-input"));
  const mount = (initial) => mountShortcuts({
    container: byId("shortcuts"), template: byId("tile-template"), dialog: byId("shortcut-editor"), initial,
  });
  try {
    mount(await loadShortcuts());
  } catch (error) {
    console.error("No se pudieron cargar los accesos directos:", error);
    mount([]);
  }
};

init();
