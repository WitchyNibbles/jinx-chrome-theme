// Pintura de las losetas.
//  - hover: dos brochazos (azul y rosa) cruzan por detrás del favicon y se
//    quedan mientras el cursor esté encima; al salir, se despintan.
//  - clic: las cuatro esquinas del icono colapsan al centro; flash blanco y
//    una X grande de brochazos rosa/morado se estampa de golpe con overspray,
//    como un tag de grafiti; después se navega.
// Coordenadas: el <svg class="tile__splats"> tiene viewBox centrado en la
// loseta (unidades = px); el favicon está en ICON_CENTER.

import { mistPoints, pick } from "./shapes.js";
import { brushStroke } from "./brush.js";
import { svgEl, append, gsap, reducedMotion } from "./svg.js";
import { BLUES, PINKS, PURPLES } from "./palette.js";

const rng = Math.random;
const ICON_CENTER = { x: 0, y: 0 }; // el favicon está centrado en la loseta
const COLLAPSE_MS = 280;
const EXPLODE_MS = 560;
export const BURST_DURATION_MS = COLLAPSE_MS + EXPLODE_MS;

const mistGroup = (points, colors) =>
  append(svgEl("g"), ...points.map((p) =>
    svgEl("circle", { cx: p.x, cy: p.y, r: p.r, fill: pick(colors, rng), opacity: p.opacity })));

// ---------- hover: X perfecta de esquina a esquina detrás del favicon ----------

const HOVER_THICKNESS = 11;

// Cada brazo mide exactamente la diagonal de la loseta: el cuerpo del brochazo
// llega justo a las esquinas y lo único que sobresale son los cortes en ángulo.
const buildCross = (tile, host) => {
  const size = tile.getBoundingClientRect().width;
  const length = size * Math.SQRT2;
  const blue = brushStroke({
    length, thickness: HOVER_THICKNESS, colors: [pick(BLUES, rng), ...BLUES],
    cx: ICON_CENTER.x, cy: ICON_CENTER.y, angle: -45, rng, bristles: 5, mist: 6,
  });
  const pink = brushStroke({
    length, thickness: HOVER_THICKNESS, colors: [pick(PINKS, rng), ...PINKS],
    cx: ICON_CENTER.x, cy: ICON_CENTER.y, angle: 45, rng, bristles: 5, mist: 6, reverse: true,
  });
  append(host, blue.group, pink.group);

  const tl = gsap().timeline({ paused: true });
  blue.reveal(tl, { duration: 0.3, ease: "power2.out" });   // de abajo-izquierda a arriba-derecha
  pink.reveal(tl, { duration: 0.3, ease: "power2.out", position: "-=0.18" }); // de abajo-derecha a arriba-izquierda
  return tl;
};

export const attachHoverPaint = (tile, host) => {
  let tl = null;
  tile.addEventListener("mouseenter", () => {
    if (reducedMotion() || tile.classList.contains("tile--burst")) return;
    if (!tl) {
      tl = buildCross(tile, host);
      tl.eventCallback("onReverseComplete", () => { host.replaceChildren(); tl = null; });
    }
    tl.play();
  });
  tile.addEventListener("mouseleave", () => { tl?.reverse(); });
  return () => { tl?.kill(); tl = null; host.replaceChildren(); };
};

// ---------- clic: colapso de esquinas + explosión ----------

const QUADRANTS = [
  { clip: "inset(0 50% 50% 0)", dx: 1, dy: 1 },
  { clip: "inset(0 0 50% 50%)", dx: -1, dy: 1 },
  { clip: "inset(50% 50% 0 0)", dx: 1, dy: -1 },
  { clip: "inset(50% 0 0 50%)", dx: -1, dy: -1 },
];

const collapseIcon = (tile, icon) => {
  const rect = icon.getBoundingClientRect();
  const tileRect = tile.getBoundingClientRect();
  const pieces = QUADRANTS.map((q) => {
    const piece = icon.cloneNode(true);
    piece.classList.add("tile__icon-piece");
    piece.style.clipPath = q.clip;
    piece.style.left = `${rect.left - tileRect.left}px`;
    piece.style.top = `${rect.top - tileRect.top}px`;
    tile.appendChild(piece);
    return { piece, q };
  });
  icon.style.visibility = "hidden";
  const quarter = rect.width / 4;
  return gsap().to(pieces.map((p) => p.piece), {
    x: (i) => pieces[i].q.dx * quarter, y: (i) => pieces[i].q.dy * quarter,
    scale: 0.15, rotation: (i) => (i % 2 ? 35 : -35), transformOrigin: "center",
    duration: COLLAPSE_MS / 1000, ease: "power3.in", stagger: 0.015,
    onComplete: () => pieces.forEach((p) => p.piece.remove()),
  });
};

const STAMP = { length: 150, thickness: 18 };

const explode = (host) => {
  const origin = `${ICON_CENTER.x} ${ICON_CENTER.y}`;
  const flash = svgEl("circle", { cx: ICON_CENTER.x, cy: ICON_CENTER.y, r: 30, fill: "#fff", filter: "url(#paint-glow)" });

  const purple = brushStroke({ ...STAMP, colors: [pick(PURPLES, rng), ...PURPLES], cx: ICON_CENTER.x, cy: ICON_CENTER.y, angle: -45, rng, bristles: 8 });
  const pink = brushStroke({ ...STAMP, colors: [pick(PINKS, rng), ...PINKS], cx: ICON_CENTER.x, cy: ICON_CENTER.y, angle: 45, rng, bristles: 8 });
  purple.revealNow();
  pink.revealNow();
  const stamp = append(svgEl("g"), purple.group, pink.group);
  const mist = mistGroup(mistPoints({ count: 40, radius: 100, rng, cx: ICON_CENTER.x, cy: ICON_CENTER.y }), [...PINKS, ...PURPLES]);

  append(host, mist, flash, stamp);

  const tl = gsap().timeline();
  tl.fromTo(flash, { scale: 0.3, opacity: 1, svgOrigin: origin }, { scale: 1.5, opacity: 0, duration: 0.32, ease: "power2.out" });
  tl.from(stamp, { scale: 0.15, rotation: -30, svgOrigin: origin, duration: 0.42, ease: "back.out(2.2)" }, 0.06);
  tl.from(mist, { scale: 0.1, opacity: 0, svgOrigin: origin, duration: 0.4, ease: "expo.out" }, 0.14);
  return tl;
};

export const clickSplat = (tile, host, icon) => {
  if (reducedMotion()) return;
  host.replaceChildren(); // corta el aro del hover: ahora manda la explosión
  const tl = gsap().timeline();
  tl.add(collapseIcon(tile, icon));
  // La explosión se construye justo cuando las esquinas se han juntado: así no
  // existe ningún trozo de pintura antes de tiempo.
  tl.add(() => { tile.classList.add("tile--burst"); explode(host); });
};
