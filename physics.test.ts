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
test("all eleven experiments and presets return finite measurements, even at control limits", () => {
  assert.equal(experiments.length, 11);
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

import { hessPath, unknownMetals, inferSpecificHeat } from "./physics.ts";
import { lessons, calculations } from "./lessons.ts";
import { readProbe, sampleTargets } from "./instruments.ts";
test("Hess: both paths reach the same enthalpy, and reversing changes the sign", () => {
  for (const amount of [0.5, 1, 2, 3]) {
    const direct = hessPath(amount, false, false, 1),
      steps = hessPath(amount, false, true, 1),
      reverse = hessPath(amount, true, true, 1);
    near(direct.q, steps.q);
    near(steps.q, -393.5 * amount);
    near(reverse.q, 393.5 * amount);
    near(steps.first + steps.second, steps.total);
    near(reverse.first + reverse.second, reverse.total);
  }
});
test("Hess: the intermediate CO plateau uses the correct forward and reverse order", () => {
  near(hessPath(1, false, true, 0.5).q, -110.5);
  near(hessPath(1, true, true, 0.5).q, 283);
  near(hessPath(1, false, false, 0.5).q, -196.75);
});
test("unknown metal: equilibrium recovers its specific heat and energy is conserved", () => {
  const e = experiments.find((e) => e.id === "identify")!;
  for (let i = 0; i < 3; i++) {
    for (const mass of [50, 150, 300]) {
      const p = { ...e.defaults, sample: i, metalMass: mass };
      for (const f of [0, 0.2, 0.5, 1]) {
        const r = evaluate("identify", p, f);
        near(r.values.qMetal + r.values.qWater + r.values.qCup, 0);
        near(r.values.c, unknownMetals[i].c);
      }
      const final = evaluate("identify", p, 1);
      near(final.temperatures[0], final.temperatures[1]);
    }
  }
});
test("specific heat inference rejects an unequilibrated or impossible final temperature", () => {
  assert.throws(() => inferSpecificHeat(100, 80, 100, 20, 80, 0));
  assert.throws(() => inferSpecificHeat(100, 80, 100, 20, 20, 0));
});
test("thermometer measures the sample under its tip, not the nearest sample", () => {
  const e = experiments.find((e) => e.id === "mix")!,
    r = evaluate("mix", e.defaults, 0);
  near(readProbe("mix", e.defaults, r, 220, 220)!.temperature, 80);
  near(readProbe("mix", e.defaults, r, 570, 220)!.temperature, 20);
  assert.equal(readProbe("mix", e.defaults, r, 400, 220), null);
  assert.equal(sampleTargets("gibbs", {}, r).length, 0);
});
test("each experiment has a complete protocol and finite worked calculations at start and finish", () => {
  for (const e of experiments) {
    assert.equal(lessons[e.id].steps.length, 4);
    assert.ok(lessons[e.id].objective.length > 30);
    for (const f of [0, 0.5, 1]) {
      const rows = calculations(
        e.id,
        e.defaults,
        evaluate(e.id, e.defaults, f),
        f,
      );
      assert.equal(rows.length, 3);
      assert.ok(
        !/NaN|Infinity|undefined/.test(rows.map((r) => r.expression).join(" ")),
        e.id,
      );
    }
  }
  const e = experiments.find((e) => e.id === "identify")!;
  assert.match(
    calculations(e.id, e.defaults, evaluate(e.id, e.defaults, 0), 0)[1]
      .expression,
    /Aguarde/,
  );
});

import {
  analysis,
  numericChallenge,
  acceptsAnswer,
  parseAnswer,
  metalUncertainty,
  phaseStages,
} from "./investigation.ts";
test("numeric input accepts signed decimal comma and rejects ambiguous or non-finite input", () => {
  assert.equal(parseAnswer(" -12,5 "), -12.5);
  assert.equal(parseAnswer(".385"), 0.385);
  for (const input of [
    "",
    " ",
    "NaN",
    "Infinity",
    "1.000,5",
    "12 kg",
    "0x10",
    "--2",
  ])
    assert.equal(parseAnswer(input), null);
  const task = numericChallenge("first", { q: 40, w: -15 });
  assert.equal(task.answer, 25);
  assert.ok(acceptsAnswer(task, 25.04));
  assert.ok(!acceptsAnswer(task, 25.06));
  assert.ok(!acceptsAnswer(task, NaN));
});
test("numerical investigations have valid answers and content across presets and control extremes", () => {
  for (const e of experiments) {
    const configurations = [
      e.defaults,
      ...e.presets.map((s) => ({ ...e.defaults, ...s.values })),
      ...e.controls.flatMap((c) =>
        [c.min, c.max].map((value) => ({ ...e.defaults, [c.key]: value })),
      ),
    ];
    for (const p of configurations) {
      const task = numericChallenge(e.id, p);
      assert.ok(Number.isFinite(task.answer), `${e.id} ${JSON.stringify(p)}`);
      assert.ok(acceptsAnswer(task, task.answer));
      const report = analysis(e.id, p);
      assert.ok(report.rows.length >= 3);
      assert.ok(
        report.rows.every((row) => row.length === report.headers.length),
      );
      assert.doesNotMatch(JSON.stringify(report), /NaN|Infinity|undefined/);
    }
  }
  near(numericChallenge("phase", { mass: 100 }).answer, 37.6);
  near(
    numericChallenge("gibbs", { dh: 40, ds: 100, temperature: 300 }).answer,
    10,
  );
  near(
    numericChallenge("enthalpy", { reaction: 0, amount: 0.02, water: 250 })
      .answer,
    17.806,
  );
});
test("temperature quantization bounds contain true specific heat across samples and resolutions", () => {
  const base = experiments.find((e) => e.id === "identify")!.defaults;
  for (let sample = 0; sample < 3; sample++)
    for (const resolution of [0.01, 0.1, 0.5, 1, 2])
      for (const metalMass of [10, 50, 150, 400]) {
        const u = metalUncertainty({ ...base, sample, metalMass }, resolution);
        assert.ok(u.low <= unknownMetals[sample].c + 1e-10);
        assert.ok(u.high === null || u.high >= unknownMetals[sample].c - 1e-10);
        assert.ok(u.candidates.includes(unknownMetals[sample].name));
        assert.doesNotMatch(JSON.stringify(u), /NaN|Infinity/);
      }
  const coarse = metalUncertainty(base, 2),
    fine = metalUncertainty(base, 0.01);
  assert.ok(coarse.candidates.length > 1);
  assert.deepEqual(fine.candidates, ["Cobre"]);
  assert.ok(fine.high! - fine.low < coarse.high! - coarse.low);
  assert.throws(() => metalUncertainty(base, 0), RangeError);
  const unreadable = metalUncertainty({ ...base, metalMass: 0.01 }, 2);
  assert.equal(unreadable.estimate, null);
  assert.equal(unreadable.low, 0);
});
test("phase exploration budgets sum to full heat and each shortcut lands inside its phase", () => {
  const stages = phaseStages(100, 1500);
  near(
    stages.reduce((sum, s) => sum + s.energy, 0),
    309,
  );
  near(
    stages.reduce((sum, s) => sum + s.seconds, 0),
    206,
  );
  assert.deepEqual(
    stages.map((s) => waterState(100, 309 * s.midpoint).phase),
    ["Sólido", "Fusão", "Líquido", "Ebulição", "Gasoso"],
  );
  const doubled = phaseStages(100, 3000);
  stages.forEach((s, i) => {
    near(doubled[i].energy, s.energy);
    near(doubled[i].seconds, s.seconds / 2);
  });
});
test("lost work matches entropy generation for fixed reservoirs and Gibbs matches universe entropy", () => {
  for (const quality of [0, 0.25, 0.7, 1]) {
    const e = heatEngine(600, 300, quality, 10);
    near(10 * e.carnot - e.work, (300 * e.entropy) / 1000);
  }
  for (const dh of [-40, 0, 40])
    for (const ds of [-100, 0, 100])
      for (const T of [250, 400, 900])
        near(ds - (1000 * dh) / T, (-1000 * gibbs(dh, ds, T)) / T);
});
