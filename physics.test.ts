import test from "node:test";
import assert from "node:assert/strict";
import { waterState, internalEnergy, reactions } from "./physics.ts";
test("water heating includes melting and boiling plateaus", () => {
  assert.equal(waterState(100, 0).temperature, -20);
  assert.equal(waterState(100, 10).phase, "Fusão");
  assert.equal(waterState(100, 10).temperature, 0);
  assert.equal(waterState(100, 58.5).temperature, 50);
  assert.equal(waterState(100, 100).phase, "Ebulição");
  assert.equal(waterState(100, 100).temperature, 100);
  assert.equal(waterState(100, 310).phase, "Gasoso");
});
test("doubling mass doubles energy for the same state", () => {
  assert.deepEqual(waterState(100, 50), waterState(200, 100));
});
test("first law follows work-on-system convention", () => {
  assert.equal(internalEnergy(30, -10), 20);
  assert.equal(internalEnergy(-30, 10), -20);
  assert.equal(internalEnergy(20, -20), 0);
});
test("reaction signs reflect exothermic and endothermic processes", () => {
  assert.ok(reactions.combustion.dh < 0);
  assert.ok(reactions.decomposition.dh > 0);
});
