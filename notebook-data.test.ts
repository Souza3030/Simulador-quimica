import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyNotebook,
  sanitizeNotebook,
  exportNotebook,
} from "./notebook-data.ts";
import { experiments } from "./experiments.ts";
test("legacy local notebook data survives schema migration", () => {
  const old = {
    notes: { see: "Água aqueceu", think: "Calor", ask: "E a massa?" },
    snapshots: [
      {
        id: "a",
        mode: "mix",
        params: experiments.find((e) => e.id === "mix")!.defaults,
        progress: 0.5,
        date: "2026-01-01",
      },
    ],
    solved: ["mix"],
    visited: ["mix"],
    selected: "mix",
  };
  const next = sanitizeNotebook(old);
  assert.equal(next.notes.see, "Água aqueceu");
  assert.equal(next.snapshots.length, 1);
  assert.deepEqual(next.solved, ["mix"]);
  assert.equal(next.updatedAt, 0);
  assert.equal(JSON.parse(exportNotebook(next)).version, 4);
});
test("untrusted cloud notebook is bounded and invalid experiment states are discarded", () => {
  const base = emptyNotebook();
  const valid = {
    id: "ok",
    mode: "mix",
    params: experiments.find((e) => e.id === "mix")!.defaults,
    progress: 1,
    date: "today",
  };
  const data = sanitizeNotebook({
    ...base,
    notes: { see: "x".repeat(4000), think: 123, ask: "question" },
    snapshots: [
      { ...valid, mode: "unknown" },
      { ...valid, progress: 2 },
      { ...valid, params: { ...valid.params, hotMass: 0 } },
      ...Array.from({ length: 20 }, (_, i) => ({ ...valid, id: `v${i}` })),
    ],
    measurements: Array.from({ length: 70 }, (_, i) => ({
      ...valid,
      id: `m${i}`,
    })),
    solved: ["mix", "bad"],
    selected: "bad",
    updatedAt: NaN,
  });
  assert.equal(data.notes.see.length, 3000);
  assert.equal(data.notes.think, "");
  assert.equal(data.snapshots.length, 12);
  assert.equal(data.measurements.length, 60);
  assert.deepEqual(data.solved, ["mix"]);
  assert.equal(data.selected, "mix");
  assert.equal(data.updatedAt, 0);
});
