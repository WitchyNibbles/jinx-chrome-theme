import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeUrl, addShortcut, updateShortcut, removeShortcut, MAX_SHORTCUTS } from "../js/store.js";

test("normalizeUrl añade https:// y valida el dominio", () => {
  assert.equal(normalizeUrl("github.com"), "https://github.com/");
  assert.equal(normalizeUrl("  http://example.org/a?b=1 "), "http://example.org/a?b=1");
  assert.throws(() => normalizeUrl(""), /Escribe/);
  assert.throws(() => normalizeUrl("solotexto"), /dominio/);
  assert.throws(() => normalizeUrl("ftp://x.com"), /http/);
});

test("addShortcut devuelve una lista nueva, congelada, sin mutar la original", () => {
  const original = Object.freeze([{ url: "https://a.com/", title: "A" }]);
  const next = addShortcut(original, { url: "b.com", title: " B " });
  assert.equal(original.length, 1);
  assert.deepEqual(next, [{ url: "https://a.com/", title: "A" }, { url: "https://b.com/", title: "B" }]);
  assert.ok(Object.isFrozen(next) && Object.isFrozen(next[1]));
});

test("addShortcut respeta el máximo", () => {
  const full = Array.from({ length: MAX_SHORTCUTS }, (_, i) => ({ url: `https://s${i}.com/`, title: "" }));
  assert.throws(() => addShortcut(full, { url: "x.com" }), /Máximo/);
});

test("updateShortcut y removeShortcut trabajan por índice y validan rango", () => {
  const list = [{ url: "https://a.com/", title: "A" }, { url: "https://b.com/", title: "B" }];
  assert.deepEqual(updateShortcut(list, 1, { url: "c.com", title: "C" })[1], { url: "https://c.com/", title: "C" });
  assert.deepEqual(removeShortcut(list, 0), [{ url: "https://b.com/", title: "B" }]);
  assert.throws(() => updateShortcut(list, 2, { url: "c.com" }), /inexistente/);
  assert.throws(() => removeShortcut(list, -1), /inexistente/);
});

import { loadSavedShortcuts, saveShortcuts } from "../js/store.js";

test("sin chrome.storage se usa localStorage y el guardado no falla", async () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  delete globalThis.chrome;
  assert.equal(await loadSavedShortcuts(), null);
  await saveShortcuts([{ url: "https://a.com/", title: "A" }]);
  assert.deepEqual(await loadSavedShortcuts(), [{ url: "https://a.com/", title: "A" }]);
});

test("chrome.storage.sync tiene prioridad sobre localStorage", async () => {
  const mem = {};
  globalThis.chrome = { storage: { sync: { get: async (k) => ({ [k]: mem[k] }), set: async (o) => Object.assign(mem, o) } } };
  await saveShortcuts([{ url: "https://b.com/", title: "" }]);
  assert.deepEqual(mem.shortcuts, [{ url: "https://b.com/", title: "" }]);
  delete globalThis.chrome;
});
