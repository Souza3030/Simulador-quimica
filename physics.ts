// Units: mass in g, energy in kJ, temperature in °C. Water at 1 atm.
export type Phase = "Sólido" | "Fusão" | "Líquido" | "Ebulição" | "Gasoso";
export interface WaterState {
  temperature: number;
  phase: Phase;
  progress: number;
}
export function waterState(mass: number, energy: number): WaterState {
  const warmIce = (mass * 2.1 * 20) / 1000,
    melt = (mass * 334) / 1000,
    warmWater = (mass * 4.18 * 100) / 1000,
    boil = (mass * 2256) / 1000;
  if (energy < warmIce)
    return {
      temperature: -20 + (energy * 1000) / (mass * 2.1),
      phase: "Sólido",
      progress: 0,
    };
  if (energy < warmIce + melt)
    return {
      temperature: 0,
      phase: "Fusão",
      progress: (energy - warmIce) / melt,
    };
  if (energy < warmIce + melt + warmWater)
    return {
      temperature: ((energy - warmIce - melt) * 1000) / (mass * 4.18),
      phase: "Líquido",
      progress: 1,
    };
  if (energy < warmIce + melt + warmWater + boil)
    return {
      temperature: 100,
      phase: "Ebulição",
      progress: (energy - warmIce - melt - warmWater) / boil,
    };
  return {
    temperature:
      100 + ((energy - warmIce - melt - warmWater - boil) * 1000) / (mass * 2),
    phase: "Gasoso",
    progress: 1,
  };
}
export const reactions = {
  combustion: {
    name: "Combustão do metano",
    equation: "CH₄(g) + 2 O₂(g) → CO₂(g) + 2 H₂O(l)",
    dh: -890.3,
  },
  neutral: {
    name: "Neutralização ácido-base",
    equation: "H⁺(aq) + OH⁻(aq) → H₂O(l)",
    dh: -57.3,
  },
  decomposition: {
    name: "Decomposição do carbonato",
    equation: "CaCO₃(s) → CaO(s) + CO₂(g)",
    dh: 178.3,
  },
};
export const internalEnergy = (q: number, w: number): number =>
  Number(q) + Number(w);
