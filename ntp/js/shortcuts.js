// Accesos directos: sitios más visitados (chrome.topSites) hasta que el usuario
// los personaliza; después, su lista en chrome.storage.sync.

import { attachHoverPaint, clickSplat, BURST_DURATION_MS } from "./paint/splat.js";
import { loadSavedShortcuts, saveShortcuts, addShortcut, updateShortcut, removeShortcut, MAX_SHORTCUTS } from "./store.js";
import { openEditor } from "./editor.js";

const TOP_SITES_SHOWN = 8;
const FAVICON_SIZE = 32;

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const faviconUrl = (pageUrl) => {
  const url = new URL(chrome.runtime.getURL("/_favicon/"));
  url.searchParams.set("pageUrl", pageUrl);
  url.searchParams.set("size", String(FAVICON_SIZE));
  return url.toString();
};

export const labelFor = (site) => {
  if (site.title?.trim()) return site.title.trim();
  try {
    return new URL(site.url).hostname.replace(/^www\./, "");
  } catch {
    return site.url;
  }
};

const loadTopSites = () =>
  new Promise((resolve) => {
    if (!chrome?.topSites?.get) return resolve([]);
    chrome.topSites.get((sites) => {
      if (chrome.runtime.lastError) {
        console.warn("topSites:", chrome.runtime.lastError.message);
        return resolve([]);
      }
      resolve((sites ?? []).slice(0, TOP_SITES_SHOWN).map(({ url, title }) => ({ url, title: title ?? "" })));
    });
  });

/** Lista inicial: la guardada por el usuario o, si nunca ha editado, los más visitados. */
export const loadShortcuts = async () => (await loadSavedShortcuts()) ?? loadTopSites();

const navigateWithBurst = (event, tile, link, stopHover) => {
  if (reducedMotion() || event.ctrlKey || event.metaKey || event.button !== 0) return;
  event.preventDefault();
  stopHover();
  clickSplat(tile, tile.querySelector(".tile__splats"), tile.querySelector(".tile__icon"));
  setTimeout(() => { window.location.href = link.href; }, BURST_DURATION_MS);
};

const buildTile = (template, site, { onEdit }) => {
  const tile = template.content.firstElementChild.cloneNode(true);
  const link = tile.querySelector(".tile__link");
  const img = tile.querySelector("img");
  link.href = site.url;
  link.title = labelFor(site);
  link.setAttribute("aria-label", labelFor(site));
  img.src = faviconUrl(site.url);
  img.addEventListener("error", () => { img.replaceWith(fallbackGlyph(site)); }, { once: true });
  const stopHover = attachHoverPaint(tile, tile.querySelector(".tile__paint-back"));
  link.addEventListener("click", (event) => navigateWithBurst(event, tile, link, stopHover));
  tile.querySelector(".tile__edit").addEventListener("click", onEdit);
  tile.addEventListener("contextmenu", (event) => { event.preventDefault(); onEdit(); });
  return tile;
};

const fallbackGlyph = (site) => {
  const span = document.createElement("span");
  span.className = "tile__glyph";
  span.textContent = labelFor(site).slice(0, 1).toUpperCase();
  return span;
};

const buildAddTile = (onAdd) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "tile tile--add";
  btn.title = "Añadir acceso directo";
  btn.setAttribute("aria-label", "Añadir acceso directo");
  btn.textContent = "+";
  btn.addEventListener("click", onAdd);
  return btn;
};

/**
 * Pinta la lista y engancha el editor. Cada cambio produce una lista nueva,
 * se guarda y se vuelve a pintar.
 */
export const mountShortcuts = ({ container, template, dialog, initial }) => {
  const render = (list) => {
    const persist = async (next) => { await saveShortcuts(next); render(next); };
    const edit = (index) => openEditor({
      dialog, item: list[index],
      onSave: (item) => persist(updateShortcut(list, index, item)),
      onDelete: () => persist(removeShortcut(list, index)),
    });
    const add = () => openEditor({ dialog, onSave: (item) => persist(addShortcut(list, item)) });

    const tiles = list.map((site, i) => buildTile(template, site, { onEdit: () => edit(i) }));
    const addTile = list.length < MAX_SHORTCUTS ? [buildAddTile(add)] : [];
    container.replaceChildren(...tiles, ...addTile);
  };
  render(initial);
};
