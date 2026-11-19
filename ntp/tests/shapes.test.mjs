import { test } from "node:test";
import assert from "node:assert/strict";
import { smoothPath, splatShape, dripShape, mistPoints, strokeAroundRect } from "../js/paint/shapes.js";

const seeded = (seed = 7) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

test("smoothPath cierra con Z solo cuando se pide y empieza en el primer punto", () => {
  const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
  assert.match(smoothPath(pts, true), /^M0,0C.*Z$/);
  assert.match(smoothPath(pts, false), /^M0,0C[^Z]*$/);
  assert.equal(smoothPath([{ x: 1, y: 1 }], false), "");
});

test("splatShape produce una silueta cerrada con tentáculos más largos que el radio", () => {
  const rng = seeded();
  const { d, dripAnchor } = splatShape({ radius: 20, points: 12, tendrils: 2, rng });
  assert.match(d, /^M.*Z$/);
  const numbers = d.match(/-?\d+(\.\d+)?/g).map(Number);
  const maxAbs = Math.max(...numbers.map(Math.abs));
  assert.ok(maxAbs > 20 * 1.3, "algún punto sobresale como tentáculo");
  assert.ok(dripAnchor.y > 0, "el anclaje del goteo está en la parte baja");
});

test("dripShape cuelga hacia abajo desde su origen y respeta la longitud", () => {
  const drip = dripShape({ x: 5, y: 10, rng: seeded(3), minLength: 20, maxLength: 20 });
  assert.equal(drip.length, 20);
  assert.deepEqual(drip.origin, { x: 5, y: 10 });
  assert.match(drip.d, /,30 /); // el extremo inferior está en y = 10 + 20
});

test("mistPoints reparte puntos finos con opacidad parcial dentro del radio ampliado", () => {
  const pts = mistPoints({ count: 40, radius: 30, rng: seeded(11) });
  assert.equal(pts.length, 40);
  for (const p of pts) {
    assert.ok(Math.hypot(p.x, p.y) <= 30 * 1.4 + 0.01);
    assert.ok(p.r >= 1 && p.r <= 3.6);
    assert.ok(p.opacity >= 0.4 && p.opacity <= 0.95);
    assert.ok(Object.isFrozen(p));
  }
});

test("strokeAroundRect rodea el rectángulo repartiendo brochazos por el perímetro", () => {
  const rect = { width: 560, height: 48 };
  const strokes = Array.from({ length: 8 }, (_, i) => strokeAroundRect({ rect, index: i, total: 8, rng: seeded(i + 1) }));
  const above = strokes.filter((s) => !s.hangsDown).length;
  assert.ok(above >= 2 && above <= 6, "hay brochazos por arriba y por abajo");
  for (const s of strokes) {
    assert.match(s.d, /^M/);
    assert.doesNotMatch(s.d, /Z$/);
    assert.ok(s.width >= 10 && s.width <= 22);
    // ningún brochazo atraviesa el centro del buscador
    assert.ok(Math.abs(s.end.x) > 0 || Math.abs(s.end.y) > rect.height / 2);
  }
});

import { brushBand, bristleLines, flickLines, ringArc } from "../js/paint/shapes.js";

test("brushBand es una banda cerrada centrada con las dos puntas afiladas", () => {
  const band = brushBand({ length: 600, thickness: 80, rng: seeded(5) });
  assert.match(band.d, /^M-300,0C.*Z$/, "empieza en la punta izquierda, a grosor cero");
  assert.equal(band.x0, -300);
  assert.equal(band.x1, 300);
  const nums = band.d.match(/-?\d+(\.\d+)?/g).map(Number);
  const ys = nums.filter((_, i) => i % 2 === 1);
  assert.ok(Math.max(...ys.map(Math.abs)) <= 80 / 2 * 1.3, "no sobrepasa el grosor + jitter + control points");
  assert.ok(Math.max(...ys.map(Math.abs)) >= 80 / 2 * 0.8, "el cuerpo alcanza el grosor pedido");
  // la punta derecha (x = 300) también está a grosor ~0
  const rightYs = nums.filter((n, i) => i % 2 === 1 && Math.abs(nums[i - 1] - 300) < 0.01);
  assert.ok(rightYs.length >= 1 && rightYs.every((y) => Math.abs(y) < 1), "punta derecha afilada");
});

test("bristleLines quedan dentro de la banda y son más cortas que ella", () => {
  const lines = bristleLines({ length: 600, thickness: 80, count: 12, rng: seeded(2) });
  assert.equal(lines.length, 12);
  for (const l of lines) {
    const [x1, y1, x2] = l.d.match(/-?\d+(\.\d+)?/g).map(Number);
    assert.ok(x1 >= -300 && x2 <= 300 && x2 > x1);
    assert.ok(Math.abs(y1) <= 80 * 0.42);
    assert.ok(l.width >= 1 && l.width <= 3.5);
  }
});

test("flickLines salen hacia fuera desde el extremo indicado", () => {
  for (const f of flickLines({ x: 300, thickness: 80, count: 5, rng: seeded(9), dir: 1 })) {
    const [x1, , x2] = f.d.match(/-?\d+(\.\d+)?/g).map(Number);
    assert.ok(x2 > 300 && x1 < x2);
  }
});

test("ringArc rodea el centro con un arco abierto casi completo", () => {
  const ring = ringArc({ cx: 0, cy: -11, radius: 30, rng: seeded(4) });
  assert.match(ring.d, /^M/);
  assert.doesNotMatch(ring.d, /Z$/);
  assert.ok(ring.bottom.y > -11 + 30 * 0.8, "el punto más bajo está cerca del radio, bajo el centro");
});

import { chiselBand } from "../js/paint/shapes.js";

test("chiselBand tiene grosor constante y extremos cortados en ángulo", () => {
  const band = chiselBand({ length: 600, thickness: 40, rng: seeded(6), skew: 12, jitter: 0 });
  assert.match(band.d, /^M-300,-20L.*Z$/);
  // esquina superior derecha retrasada `skew` respecto a la inferior derecha
  assert.match(band.d, /L288,-20L300,20/);
  // esquina inferior izquierda adelantada `skew` respecto a la superior izquierda
  assert.match(band.d, /L-288,20Z$/);
  const ys = band.d.match(/-?\d+(\.\d+)?/g).map(Number).filter((_, i) => i % 2 === 1);
  assert.ok(ys.every((y) => Math.abs(y) === 20), "sin jitter los bordes son rectos");
});
