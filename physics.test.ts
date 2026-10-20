import test from "node:test";
import assert from "node:assert/strict";
import {
  waterState,
  mixing,
  mixTemperature,
  boundaryTemperature,
  gasProcess,
  heatEngine,
  gibbs,
  internalEnergy,
  reactions,
  sensibleTemperature,
  R,
} from "./physics.ts";
import { experiments, evaluate } from "./experiments.ts";
const near = (a: number, b: number, tol = 1e-8) =>
  assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);
test("water: sensible heat, two latent plateaus and superheated vapor", () => {
  near(waterState(100, 0).temperature, -20);
  near(waterState(100, 4.2).temperature, 0);
  assert.equal(waterState(100, 10).phase, "Fusão");
  near(waterState(100, 58.5).temperature, 50);
  assert.equal(waterState(100, 100).phase, "Ebulição");
  near(waterState(100, 100).temperature, 100);
  near(waterState(100, 309).temperature, 120);
  assert.deepEqual(waterState(100, 50), waterState(200, 100));
});
test("water remains continuous across all phase boundaries", () => {
  for (const e of [4.2, 37.6, 79.4, 305])
    near(
      waterState(100, e - 1e-9).temperature,
      waterState(100, e + 1e-9).temperature,
      1e-6,
    );
});
test("equal heat heats copper more than water at equal mass", () => {
  near(sensibleTemperature(100, 4.18, 4180), 30);
  assert.ok(
    sensibleTemperature(100, 0.385, 4180) >
      sensibleTemperature(100, 4.18, 4180),
  );
});
test("mixing: mass-weighted equilibrium and calorimeter influence", () => {
  near(mixTemperature(100, 4.18, 80, 100, 4.18, 20), 50);
  near(mixTemperature(100, 4.18, 80, 200, 4.18, 20), 40);
  assert.ok(mixTemperature(100, 4.18, 80, 100, 4.18, 20, 100) < 50);
});
test("mixing conserves energy throughout the trajectory, including the cup", () => {
  for (let i = 0; i <= 20; i++) {
    const r = mixing(150, 80, 200, 20, 200, i / 20);
    near(r.qHot + r.qCold + r.qCup, 0);
    assert.ok(r.hot >= r.cold - 1e-9);
  }
  const r = mixing(150, 80, 200, 20, 200, 1);
  near(r.hot, r.cold);
  near(r.hot, r.eq);
});
test("boundary types conserve the appropriate heat + flow balance", () => {
  const closed = boundaryTemperature(1, 200, 80, 20, 600),
    open = boundaryTemperature(0, 200, 80, 20, 600),
    isolated = boundaryTemperature(2, 200, 80, 20, 600);
  near(isolated.temperature, 80);
  near(isolated.q, 0);
  near(isolated.massPassed, 0);
  near(closed.massPassed, 0);
  assert.ok(open.temperature < closed.temperature);
  near(open.massPassed, 300);
  near(open.q + open.enthalpyFlow, open.change);
  near(closed.q, closed.change);
  assert.ok(open.temperature > 20);
});
test("isothermal expansion: ideal-gas state and Q = −W", () => {
  const r = gasProcess("isothermal", 2, 450);
  near(r.temperature, 300);
  near(r.pressure, 50);
  near(r.w, (-R * 300 * Math.log(2)) / 1000);
  near(r.q, -r.w);
  near(r.du, 0);
});
test("isochoric, isobaric and adiabatic paths obey the first law", () => {
  for (const process of ["isochoric", "isobaric", "adiabatic"] as const)
    for (const ratio of [0.5, 1, 2.5]) {
      const r = gasProcess(process, ratio, 450);
      near(r.q + r.w, r.du);
      near(r.pressure * r.volume, R * r.temperature);
      if (process === "adiabatic") near(r.q, 0);
      if (process === "isobaric") near(r.pressure, 100);
      if (process === "isochoric") near(r.volume, (R * 300) / 100);
    }
  assert.ok(gasProcess("adiabatic", 0.5, 300).temperature > 300);
});
test("first law: work-on-system sign convention", () => {
  near(internalEnergy(40, -15), 25);
  near(internalEnergy(40, -40), 0);
});
test("Carnot bound, energy conservation and universe entropy", () => {
  const reversible = heatEngine(600, 300, 1, 10);
  near(reversible.efficiency, 0.5);
  near(reversible.work, 5);
  near(reversible.entropy, 0);
  const real = heatEngine(600, 300, 0.7, 10);
  near(real.work + real.rejected, 10);
  assert.ok(real.entropy > 0);
  assert.ok(real.efficiency < real.carnot);
});
test("Gibbs converts J to kJ and includes the equilibrium threshold", () => {
  near(gibbs(40, 100, 300), 10);
  near(gibbs(40, 100, 400), 0);
  near(gibbs(40, 100, 600), -20);
  near(gibbs(-40, -100, 600), 20);
  near(gibbs(-40, 0, 300), -40);
});
test("enthalpy: stoichiometric amount changes bath heat, not molar enthalpy", () => {
  assert.ok(reactions[0].dh < 0);
  assert.ok(reactions[2].dh > 0);
  const e = experiments.find((e) => e.id === "enthalpy")!,
    a = evaluate(e.id, e.defaults, 1),
    b = evaluate(e.id, { ...e.defaults, amount: e.defaults.amount * 2 }, 1);
  near(b.values.q, a.values.q * 2);
  near(b.values.dh, a.values.dh);
  assert.ok(a.values.temperature > 25);
  assert.ok(
    evaluate(e.id, { ...e.defaults, reaction: 2 }, 1).values.temperature < 25,
  );
});
test("all nine experiments and presets return finite measurements, even at control limits", () => {
  assert.equal(experiments.length, 9);
  for (const e of experiments) {
    const cases = [
      e.defaults,
      ...e.presets.map((p) => ({ ...e.defaults, ...p.values })),
      ...e.controls.flatMap((c) => [
        { ...e.defaults, [c.key]: c.min },
        { ...e.defaults, [c.key]: c.max },
      ]),
    ];
    for (const p of cases)
      for (const t of [0, 0.2, 0.5, 0.8, 1]) {
        const r = evaluate(e.id, p, t);
        for (const m of r.metrics)
          assert.ok(Number.isFinite(m.value), `${e.id} ${m.label}`);
        assert.ok(Number.isFinite(r.plotValue));
      }
  }
});
test("invalid denominators and reservoir temperatures are rejected", () => {
  assert.throws(() => waterState(0, 1));
  assert.throws(() => heatEngine(300, 400, 0.5, 10));
  assert.throws(() => gibbs(1, 1, 0));
});
