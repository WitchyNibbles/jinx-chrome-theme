// Lista de accesos directos: helpers puros (testeables) + persistencia en
// chrome.storage.sync. Si no hay lista guardada se usan los sitios más visitados.

const STORAGE_KEY = "shortcuts";
export const MAX_SHORTCUTS = 12;

export const normalizeUrl = (raw) => {
  const text = String(raw ?? "").trim();
  if (!text) throw new Error("Escribe una dirección.");
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `https://${text}`;
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error("Esa dirección no es válida.");
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error("Solo se admiten direcciones http(s).");
  if (!url.hostname.includes(".") && url.hostname !== "localhost") throw new Error("Falta el dominio (p. ej. ejemplo.com).");
  return url.toString();
};

const toItem = ({ url, title }) => Object.freeze({ url: normalizeUrl(url), title: String(title ?? "").trim() });

export const addShortcut = (list, item) => {
  if (list.length >= MAX_SHORTCUTS) throw new Error(`Máximo ${MAX_SHORTCUTS} accesos directos.`);
  return Object.freeze([...list, toItem(item)]);
};

export const updateShortcut = (list, index, item) => {
  if (index < 0 || index >= list.length) throw new Error("Acceso directo inexistente.");
  return Object.freeze(list.map((s, i) => (i === index ? toItem(item) : s)));
};

export const removeShortcut = (list, index) => {
  if (index < 0 || index >= list.length) throw new Error("Acceso directo inexistente.");
  return Object.freeze(list.filter((_, i) => i !== index));
};

/**
 * Área de almacenamiento, por orden de preferencia:
 *   chrome.storage.sync (sigue a la cuenta) → chrome.storage.local → localStorage.
 * Todas exponen la misma interfaz { get(key), set(obj) } asíncrona.
 */
const localStorageArea = () => {
  const ls = globalThis.localStorage;
  if (!ls) return null;
  return {
    get: async (key) => {
      const raw = ls.getItem(key);
      return { [key]: raw ? JSON.parse(raw) : undefined };
    },
    set: async (obj) => { Object.entries(obj).forEach(([k, v]) => ls.setItem(k, JSON.stringify(v))); },
  };
};

const storageArea = () => {
  const areas = globalThis.chrome?.storage;
  return areas?.sync ?? areas?.local ?? localStorageArea();
};

/** @returns {Promise<ReadonlyArray<{url,title}>|null>} null = nunca personalizado */
export const loadSavedShortcuts = async () => {
  const area = storageArea();
  if (!area) return null;
  try {
    const data = await area.get(STORAGE_KEY);
    const saved = data?.[STORAGE_KEY];
    return Array.isArray(saved) ? Object.freeze(saved.map((s) => Object.freeze({ ...s }))) : null;
  } catch (error) {
    console.warn("No se pudo leer la lista guardada:", error);
    return null;
  }
};

export const saveShortcuts = async (list) => {
  const area = storageArea();
  if (!area) throw new Error("No se puede guardar: el navegador no ofrece almacenamiento.");
  try {
    await area.set({ [STORAGE_KEY]: list.map(({ url, title }) => ({ url, title })) });
  } catch (error) {
    console.error("storage.set:", error);
    throw new Error(`No se pudo guardar (${error.message ?? error}).`);
  }
};
