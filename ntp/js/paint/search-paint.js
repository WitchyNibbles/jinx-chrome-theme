// Dos brochazos "chisel con halo" en X alargada detrás del buscador: morado
// de izquierda a derecha y rosa de derecha a izquierda. Se pintan al enfocar
// y se despintan al revés al perder el foco (misma timeline en reverse).

import { pick } from "./shapes.js";
import { brushStroke } from "./brush.js";
import { svgEl, append, gsap, reducedMotion } from "./svg.js";
import { PURPLES, PINKS } from "./palette.js";

const rng = Math.random;
const PAD = { x: 160, y: 140 };
const OVERHANG = 90;     // cuánto sobresale cada brochazo por fuera de la caja
const THICKNESS = 0.9;   // grosor de cada trazo, en proporción al alto de la caja
const ANGLE = 6;         // grados de cada brazo de la X respecto a la horizontal

const buildOverlay = (form) => {
  const { width, height } = form.getBoundingClientRect();
  const length = width + OVERHANG * 2;
  const thickness = height * THICKNESS;
  const svg = svgEl("svg", {
    class: "search__paint", "aria-hidden": "true",
    viewBox: `${-(width / 2 + PAD.x)} ${-(height / 2 + PAD.y)} ${width + PAD.x * 2} ${height + PAD.y * 2}`,
  });
  svg.style.inset = `${-PAD.y}px ${-PAD.x}px`;

  const purple = brushStroke({ length, thickness, colors: [pick(PURPLES, rng), ...PURPLES], angle: -ANGLE, rng, bristles: 16, mist: 26 });
  const pink = brushStroke({ length, thickness, colors: [pick(PINKS, rng), ...PINKS], angle: ANGLE, rng, bristles: 16, mist: 26, reverse: true });
  append(svg, purple.group, pink.group);
  return { svg, purple, pink };
};

const buildTimeline = ({ purple, pink }) => {
  const tl = gsap().timeline({ paused: true });
  purple.reveal(tl, { duration: 0.55, ease: "power2.inOut" });
  pink.reveal(tl, { duration: 0.55, ease: "power2.inOut", position: "-=0.4" });
  return tl;
};

export const attachSearchPaint = (form, input) => {
  let current = null; // { svg, tl }

  const paint = () => {
    if (reducedMotion()) return;
    if (current) { current.tl.play(); return; }
    const parts = buildOverlay(form);
    form.appendChild(parts.svg);
    const tl = buildTimeline(parts);
    tl.eventCallback("onReverseComplete", () => { parts.svg.remove(); current = null; });
    current = { svg: parts.svg, tl };
    tl.play();
  };

  const unpaint = () => { current?.tl.reverse(); };

  input.addEventListener("focus", paint);
  input.addEventListener("blur", unpaint);
};
