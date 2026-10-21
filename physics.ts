/** Models use g, °C, J and seconds unless a function documents otherwise. */
export type Phase = "Sólido" | "Fusão" | "Líquido" | "Ebulição" | "Gasoso";
export interface WaterState {
  temperature: number;
  phase: Phase;
  progress: number;
}
export const clamp = (x: number, min: number, max: number) =>
  Math.max(min, Math.min(max, x));
function positive(...values: number[]) {
  if (values.some((v) => !Number.isFinite(v) || v <= 0))
    throw new RangeError("Esperado um valor positivo e finito.");
}
/** Energy in kJ relative to ice at −20 °C. Constant pressure: 1 atm. */
export function waterState(mass: number, energy: number): WaterState {
  positive(mass);
  const a = (mass * 2.1 * 20) / 1000,
    b = (mass * 334) / 1000,
    c = (mass * 4.18 * 100) / 1000,
    d = (mass * 2256) / 1000;
  if (energy < a)
    return {
      temperature: -20 + (energy * 1000) / (mass * 2.1),
      phase: "Sólido",
      progress: 0,
    };
  if (energy < a + b)
    return { temperature: 0, phase: "Fusão", progress: (energy - a) / b };
  if (energy < a + b + c)
    return {
      temperature: ((energy - a - b) * 1000) / (mass * 4.18),
      phase: "Líquido",
      progress: 1,
    };
  if (energy < a + b + c + d)
    return {
      temperature: 100,
      phase: "Ebulição",
      progress: (energy - a - b - c) / d,
    };
  return {
    temperature: 100 + ((energy - a - b - c - d) * 1000) / (mass * 2),
    phase: "Gasoso",
    progress: 1,
  };
}
export const materials = [
  { name: "Água", c: 4.18, color: "#53c8e8" },
  { name: "Cobre", c: 0.385, color: "#f3a978" },
  { name: "Alumínio", c: 0.897, color: "#b4c7dd" },
] as const;
export function sensibleTemperature(
  mass: number,
  c: number,
  q: number,
  initial = 20,
) {
  positive(mass, c);
  return initial + q / (mass * c);
}
/** Two bodies + calorimeter initially at the cold-body temperature. */
export function mixTemperature(
  m1: number,
  c1: number,
  t1: number,
  m2: number,
  c2: number,
  t2: number,
  capacity = 0,
) {
  positive(m1, c1, m2, c2);
  if (capacity < 0) throw new RangeError("Capacidade negativa.");
  return (
    (m1 * c1 * t1 + (m2 * c2 + capacity) * t2) / (m1 * c1 + m2 * c2 + capacity)
  );
}
export function mixing(
  mHot: number,
  tHot: number,
  mCold: number,
  tCold: number,
  capacity: number,
  progress: number,
) {
  const eq = mixTemperature(mHot, 4.18, tHot, mCold, 4.18, tCold, capacity);
  // A monotonic energy-conserving path; progress is an illustrative relaxation coordinate.
  const p = clamp(progress, 0, 1),
    hot = tHot + (eq - tHot) * p,
    cold = tCold + (eq - tCold) * p;
  return {
    hot,
    cold,
    eq,
    qHot: mHot * 4.18 * (hot - tHot),
    qCold: mCold * 4.18 * (cold - tCold),
    qCup: capacity * (cold - tCold),
  };
}
/** Lumped tank: heat conduction + balanced inflow/outflow at ambient T. */
export function boundaryTemperature(
  kind: number,
  mass: number,
  initial: number,
  ambient: number,
  time: number,
) {
  positive(mass);
  const conductance = kind === 2 ? 0 : 1.8,
    flow = kind === 0 ? 0.5 : 0;
  const temperature =
    ambient +
    (initial - ambient) *
      Math.exp(
        (-(conductance + flow * 4.18) * Math.max(time, 0)) / (mass * 4.18),
      );
  const change = mass * 4.18 * (temperature - initial);
  const total = conductance + flow * 4.18;
  return {
    temperature,
    q: total ? (change * conductance) / total : 0,
    enthalpyFlow: total ? (change * flow * 4.18) / total : 0,
    massPassed: flow * Math.max(time, 0),
    change,
  };
}
export const internalEnergy = (q: number, w: number) => q + w;
export type GasProcess = "isothermal" | "isochoric" | "isobaric" | "adiabatic";
export const R = 8.314462618,
  CV = 1.5 * R;
/** One mol of ideal monatomic gas, initially 300 K, 100 kPa. Work ON gas, kJ. */
export function gasProcess(
  process: GasProcess,
  ratio: number,
  targetT: number,
) {
  positive(ratio, targetT);
  const t0 = 300,
    v0 = (R * t0) / 100;
  let temperature = t0,
    volume = v0 * ratio,
    w = 0,
    q = 0;
  if (process === "isochoric") {
    volume = v0;
    temperature = targetT;
  }
  if (process === "isobaric") {
    temperature = t0 * ratio;
    w = (-R * (temperature - t0)) / 1000;
  }
  if (process === "isothermal") {
    w = (-R * t0 * Math.log(ratio)) / 1000;
  }
  if (process === "adiabatic") {
    temperature = t0 * Math.pow(ratio, -2 / 3);
    w = (CV * (temperature - t0)) / 1000;
  }
  const du = (CV * (temperature - t0)) / 1000;
  q = du - w;
  return {
    temperature,
    volume,
    pressure: (R * temperature) / volume,
    w,
    q,
    du,
  };
}
/** Heat engine between fixed Kelvin reservoirs; quality is fraction of Carnot efficiency. */
export function heatEngine(
  hot: number,
  cold: number,
  quality: number,
  input: number,
) {
  positive(hot, cold, input);
  if (hot <= cold) throw new RangeError("A fonte quente deve ser mais quente.");
  const carnot = 1 - cold / hot,
    efficiency = carnot * clamp(quality, 0, 1),
    work = input * efficiency,
    rejected = input - work;
  return {
    carnot,
    efficiency,
    work,
    rejected,
    entropy: (rejected * 1000) / cold - (input * 1000) / hot,
  };
}
export const reactions = [
  {
    name: "Combustão do metano",
    equation: "CH₄(g) + 2 O₂(g) → CO₂(g) + 2 H₂O(l)",
    dh: -890.3,
  },
  { name: "Neutralização", equation: "H⁺(aq) + OH⁻(aq) → H₂O(l)", dh: -57.3 },
  {
    name: "Decomposição do carbonato",
    equation: "CaCO₃(s) → CaO(s) + CO₂(g)",
    dh: 178.3,
  },
] as const;
/** ΔH in kJ/mol, ΔS in J/(mol K), temperature in kelvin. */
export function gibbs(dh: number, ds: number, temperature: number) {
  positive(temperature);
  return dh - (temperature * ds) / 1000;
}

/** Carbon combustion at standard reference conditions. Values in kJ per mol C. */
export function hessPath(
  amount: number,
  reverse: boolean,
  steps: boolean,
  progress: number,
) {
  positive(amount);
  const f = clamp(progress, 0, 1),
    sign = reverse ? -1 : 1;
  // Reverse the order as well as the signs for the reverse reaction.
  const first = reverse ? -283 : -110.5,
    second = reverse ? -110.5 : -283;
  const q = steps
    ? f <= 0.5
      ? first * f * 2
      : first + second * (f - 0.5) * 2
    : -393.5 * f;
  return {
    q: q * amount * sign,
    total: -393.5 * amount * sign,
    first: first * amount * sign,
    second: second * amount * sign,
  };
}
export const unknownMetals = [
  { name: "Cobre", c: 0.385 },
  { name: "Alumínio", c: 0.897 },
  { name: "Ferro", c: 0.449 },
] as const;
/** Infer c (J/g K) from a metal + water equilibrium, with a calorimeter at water initial T. */
export function inferSpecificHeat(
  metalMass: number,
  metalT: number,
  waterMass: number,
  waterT: number,
  equilibrium: number,
  capacity: number,
) {
  positive(metalMass, waterMass);
  if (capacity < 0 || equilibrium <= waterT || equilibrium >= metalT)
    throw new RangeError(
      "Equilíbrio deve ficar entre as temperaturas iniciais.",
    );
  return (
    ((waterMass * 4.18 + capacity) * (equilibrium - waterT)) /
    (metalMass * (metalT - equilibrium))
  );
}
