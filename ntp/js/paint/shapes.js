// Geometría de la pintura. Todo es puro: recibe un generador aleatorio `rng`
// (0..1) y devuelve datos (paths SVG, puntos), sin tocar el DOM.

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const between = (rng, min, max) => lerp(min, max, rng());
const fmt = (n) => Number(n.toFixed(2));

/** Convierte una lista de puntos en una curva suave (Catmull-Rom → Bézier cúbica). */
export const smoothPath = (points, closed) => {
  const n = points.length;
  if (n < 2) return "";
  const at = (i) => (closed ? points[((i % n) + n) % n] : points[Math.min(Math.max(i, 0), n - 1)]);
  const segments = closed ? n : n - 1;
  let d = `M${fmt(points[0].x)},${fmt(points[0].y)}`;
  for (let i = 0; i < segments; i += 1) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += `C${fmt(c1x)},${fmt(c1y)} ${fmt(c2x)},${fmt(c2y)} ${fmt(p2.x)},${fmt(p2.y)}`;
  }
  return closed ? `${d}Z` : d;
};

/**
 * Salpicadura: silueta irregular con púas y algún tentáculo largo.
 * Devuelve el path (centrado en 0,0) y los puntos de anclaje para goteos.
 */
export const splatShape = ({ radius, points = 14, spikiness = 0.55, tendrils = 2, rng }) => {
  const tendrilAt = new Set(Array.from({ length: tendrils }, () => Math.floor(rng() * points)));
  const outline = Array.from({ length: points }, (_, i) => {
    const angle = (i / points) * TAU + between(rng, -0.12, 0.12);
    const base = radius * (1 - spikiness / 2 + spikiness * rng());
    const r = tendrilAt.has(i) ? base * between(rng, 1.7, 2.6) : base;
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  });
  const lowest = outline.reduce((a, b) => (b.y > a.y ? b : a));
  return Object.freeze({ d: smoothPath(outline, true), dripAnchor: { x: fmt(lowest.x), y: fmt(lowest.y) } });
};

/** Goteo: una lágrima que cuelga de (x, y). Se anima escalando en Y desde su origen. */
export const dripShape = ({ x, y, rng, minLength = 14, maxLength = 46, width = 6 }) => {
  const length = between(rng, minLength, maxLength);
  const w = width * between(rng, 0.7, 1.3);
  const d = `M${fmt(x - w / 2)},${fmt(y)}`
    + `C${fmt(x - w / 2)},${fmt(y + length * 0.6)} ${fmt(x - w * 0.7)},${fmt(y + length)} ${fmt(x)},${fmt(y + length)}`
    + `C${fmt(x + w * 0.7)},${fmt(y + length)} ${fmt(x + w / 2)},${fmt(y + length * 0.6)} ${fmt(x + w / 2)},${fmt(y)}Z`;
  return Object.freeze({ d, length: fmt(length), origin: { x: fmt(x), y: fmt(y) } });
};

/** Niebla de aerosol: puntitos finos alrededor de un centro, más densos cerca. */
export const mistPoints = ({ count, radius, rng, cx = 0, cy = 0 }) =>
  Array.from({ length: count }, () => {
    const angle = rng() * TAU;
    const dist = radius * Math.sqrt(rng()) * between(rng, 0.6, 1.4);
    return Object.freeze({
      x: fmt(cx + Math.cos(angle) * dist),
      y: fmt(cy + Math.sin(angle) * dist),
      r: fmt(between(rng, 1, 3.6)),
      opacity: fmt(between(rng, 0.4, 0.95)),
    });
  });

/**
 * Brochazo alrededor de un rectángulo: un arco corto y ondulado del contorno,
 * separado del borde por `gap`. `index/total` reparten los brochazos por todo el
 * perímetro; el jitter los hace irregulares.
 */
export const strokeAroundRect = ({ rect, index, total, rng, gap = 26, wobble = 10, segments = 5 }) => {
  const { width, height } = rect;
  const rx = width / 2 + gap, ry = height / 2 + gap;
  const arc = (TAU / total) * between(rng, 0.55, 0.95);
  const start = (index / total) * TAU + between(rng, -0.2, 0.2);
  const points = Array.from({ length: segments }, (_, i) => {
    const t = start + (i / (segments - 1)) * arc;
    const wob = between(rng, -wobble, wobble);
    return { x: Math.cos(t) * (rx + wob), y: Math.sin(t) * (ry + wob) };
  });
  const end = points[points.length - 1];
  return Object.freeze({
    d: smoothPath(points, false),
    width: fmt(between(rng, 10, 22)),
    end: { x: fmt(end.x), y: fmt(end.y) },
    hangsDown: end.y > 0, // solo gotea lo que está por debajo del centro
  });
};

export const pick = (list, rng) => list[Math.floor(rng() * list.length)];
export const rand = between;

/**
 * Brochazo recto: banda horizontal centrada en (0,0) de `length` × `thickness`
 * con las dos puntas afiladas (la brocha entra en `tipIn` y sale en `tipOut`,
 * fracciones de la longitud) y bordes temblorosos en el cuerpo. Es un path
 * relleno; se revela con un clipPath.
 */
export const brushBand = ({ length, thickness, rng, jitter = 0.12, tipIn = 0.14, tipOut = 0.3, steps = 28 }) => {
  const x0 = -length / 2;
  const half = thickness / 2;
  const profile = (t) => {
    const enter = Math.min(1, t / tipIn) ** 0.8;
    const leave = Math.min(1, (1 - t) / tipOut) ** 0.8;
    return enter * leave;
  };
  const top = [], bottom = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = x0 + t * length;
    const h = half * profile(t);
    const wob = jitter * profile(t); // las puntas no tiemblan: quedan afiladas
    top.push({ x, y: -h * (1 + between(rng, -wob, wob)) });
    bottom.push({ x, y: h * (1 + between(rng, -wob, wob)) });
  }
  const outline = [...top, ...bottom.reverse()];
  return Object.freeze({ d: smoothPath(outline, true), x0: fmt(x0), x1: fmt(x0 + length) });
};

/** Vetas de cerdas: líneas finas dentro de la banda, de distinta longitud y altura. */
export const bristleLines = ({ length, thickness, count, rng }) =>
  Array.from({ length: count }, () => {
    const y = between(rng, -thickness * 0.42, thickness * 0.42);
    const start = -length / 2 + between(rng, 0, length * 0.3);
    const end = length / 2 - between(rng, 0, length * 0.3);
    return Object.freeze({
      d: `M${fmt(start)},${fmt(y)}L${fmt(end)},${fmt(y + between(rng, -2, 2))}`,
      width: fmt(between(rng, 1, 3.5)),
      opacity: fmt(between(rng, 0.25, 0.7)),
    });
  });

/** Hebras sueltas al final del brochazo, donde la brocha se levanta. */
export const flickLines = ({ x, thickness, count, rng, dir = 1 }) =>
  Array.from({ length: count }, () => {
    const y = between(rng, -thickness * 0.35, thickness * 0.35);
    const len = between(rng, thickness * 0.3, thickness * 0.9);
    return Object.freeze({
      d: `M${fmt(x - dir * len * 0.4)},${fmt(y)}L${fmt(x + dir * len)},${fmt(y + between(rng, -4, 4))}`,
      width: fmt(between(rng, 1.5, 4)),
    });
  });

/**
 * Aro pintado a mano alrededor de (cx, cy): arco casi cerrado con radio
 * tembloroso, como un círculo hecho de un solo brochazo.
 */
export const ringArc = ({ cx, cy, radius, rng, wobble = 0.12, points = 14 }) => {
  const start = between(rng, -Math.PI, Math.PI);
  const sweep = TAU * between(rng, 0.82, 0.96);
  const pts = Array.from({ length: points }, (_, i) => {
    const t = start + (i / (points - 1)) * sweep;
    const r = radius * (1 + between(rng, -wobble, wobble));
    return { x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r };
  });
  const lowest = pts.reduce((a, b) => (b.y > a.y ? b : a));
  return Object.freeze({ d: smoothPath(pts, false), bottom: { x: fmt(lowest.x), y: fmt(lowest.y) } });
};

/**
 * Brocha plana (chisel): banda recta de grosor constante con los extremos
 * cortados en ángulo (`skew` px de inclinación) y un temblor mínimo en los
 * bordes largos. Centrada en (0,0).
 */
export const chiselBand = ({ length, thickness, rng, skew = thickness * 0.3, jitter = 0.05, steps = 16 }) => {
  const h = thickness / 2;
  const x0 = -length / 2, x1 = length / 2;
  const edge = (y, from, to) => Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const x = from + (to - from) * t;
    const inner = i > 0 && i < steps ? 1 + between(rng, -jitter, jitter) : 1; // las esquinas no tiemblan
    return { x, y: y * inner };
  });
  const top = edge(-h, x0, x1 - skew);
  const bottom = edge(h, x1, x0 + skew).map((p) => p);
  const d = [
    `M${fmt(top[0].x)},${fmt(top[0].y)}`,
    ...top.slice(1).map((p) => `L${fmt(p.x)},${fmt(p.y)}`),
    ...bottom.map((p) => `L${fmt(p.x)},${fmt(p.y)}`),
    "Z",
  ].join("");
  return Object.freeze({ d, x0: fmt(x0), x1: fmt(x1) });
};
