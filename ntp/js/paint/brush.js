// Brochazo reutilizable, estilo "chisel con halo": brocha plana de grosor
// constante con extremos cortados en ángulo, capa de sombra para dar peso,
// vetas de cerdas suaves, halo de aerosol y niebla alrededor. Un clipPath lo
// revela a lo largo del trazo. Devuelve los elementos y una función que añade
// su revelado a una timeline.

import { chiselBand, bristleLines, mistPoints, pick, rand } from "./shapes.js";
import { svgEl, append } from "./svg.js";

let clipCounter = 0;

const darken = (hex, factor) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift) => Math.round(((n >> shift) & 255) * factor);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")}`;
};

/**
 * @param {object} o
 * @param {number} o.length  largo del trazo
 * @param {number} o.thickness grosor máximo
 * @param {string[]} o.colors paleta del trazo (el primero manda)
 * @param {number} o.cx,o.cy centro; o.angle en grados; o.rng generador
 * @param {number} [o.bristles] nº de vetas
 * @param {boolean} [o.reverse] pintar de derecha a izquierda (en coords locales)
 * @param {number} [o.mist] nº de puntos de niebla alrededor (0 = ninguno)
 */
export const brushStroke = ({ length, thickness, colors, cx = 0, cy = 0, angle = 0, rng, bristles = 12, reverse = false, mist = 0, filter = "url(#brush-halo)" }) => {
  const band = chiselBand({ length, thickness, rng });
  const base = colors[0];
  clipCounter += 1;
  const clipId = `brush-clip-${clipCounter}`;
  const clipRect = svgEl("rect", { x: band.x0 - 12, y: -thickness, width: 0, height: thickness * 2 });
  const clip = append(svgEl("clipPath", { id: clipId }), clipRect);

  const shadow = svgEl("path", { d: band.d, fill: darken(base, 0.62), transform: "translate(1.5 3)" });
  const body = svgEl("path", { d: band.d, fill: base });
  const veins = bristleLines({ length: length * 0.92, thickness: thickness * 0.9, count: bristles, rng }).map((b) =>
    svgEl("path", { d: b.d, stroke: pick(colors, rng), "stroke-width": b.width, opacity: Math.min(1, b.opacity + 0.05), "stroke-linecap": "round", fill: "none" }));
  const mistEls = mistPoints({ count: mist, radius: length * 0.55, rng }).map((m) =>
    svgEl("circle", { cx: m.x, cy: m.y * (thickness / length) * 4, r: m.r, fill: pick(colors, rng), opacity: m.opacity * 0.8 }));

  const painted = append(svgEl("g", { "clip-path": `url(#${clipId})` }), shadow, body, ...veins, ...mistEls);
  const group = append(svgEl("g", { filter, transform: `translate(${cx} ${cy}) rotate(${angle}${reverse ? " 0 0) scale(-1 1" : ""})` }), clip, painted);

  const fullWidth = length + 24;
  const reveal = (tl, { duration = 0.5, ease = "power2.inOut", position } = {}) =>
    tl.to(clipRect, { attr: { width: fullWidth }, duration, ease }, position);

  const revealNow = () => clipRect.setAttribute("width", String(fullWidth));

  return { group, band, reveal, revealNow, base, fullWidth };
};

export { rand };
