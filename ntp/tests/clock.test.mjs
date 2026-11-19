import { test } from "node:test";
import assert from "node:assert/strict";
import { formatTime, formatDate, msUntilNextMinute } from "../js/clock.js";

const date = new Date(2026, 8, 15, 22, 5, 30, 250); // 15 sep 2026, 22:05:30.250

test("formatTime usa 24h con dos dígitos", () => {
  assert.equal(formatTime(date, "es-ES"), "22:05");
  assert.equal(formatTime(new Date(2026, 0, 1, 0, 7), "es-ES"), "00:07");
});

test("formatDate incluye día de la semana, día y mes", () => {
  assert.equal(formatDate(date, "es-ES"), "martes, 15 de septiembre");
});

test("msUntilNextMinute cuenta hasta el siguiente minuto exacto", () => {
  assert.equal(msUntilNextMinute(date), 60_000 - 30_250);
  assert.equal(msUntilNextMinute(new Date(2026, 0, 1, 0, 0, 0, 0)), 60_000);
});
