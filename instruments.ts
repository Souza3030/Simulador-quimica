import type { Mode, Params, Result } from "./experiments.ts";
export interface SampleTarget {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  temperature: number;
}
export function sampleTargets(
  mode: Mode,
  p: Params,
  r: Result,
): SampleTarget[] {
  if (mode === "mix" || mode === "heat" || mode === "identify")
    return [
      {
        label:
          mode === "mix"
            ? "Água quente"
            : mode === "identify"
              ? "Metal"
              : "Água",
        x: 145,
        y: 142,
        width: 155,
        height: 133,
        temperature: r.temperatures[0],
      },
      {
        label:
          mode === "mix" || mode === "identify"
            ? "Água fria"
            : p.material === 0
              ? "Segunda amostra de água"
              : "Metal",
        x: 500,
        y: 142,
        width: 155,
        height: 133,
        temperature: r.temperatures[1],
      },
    ];
  if (mode === "phase" || mode === "enthalpy")
    return [
      {
        label: mode === "phase" ? "Amostra de H₂O" : "Banho de água",
        x: 300,
        y: mode === "phase" && r.status === "GASOSO" ? 65 : 142,
        width: 185,
        height: mode === "phase" && r.status === "GASOSO" ? 215 : 138,
        temperature: r.temperatures[0],
      },
    ];
  if (mode === "boundaries")
    return [
      {
        label: "Água no tanque",
        x: 315,
        y: 142,
        width: 170,
        height: 133,
        temperature: r.temperatures[0],
      },
    ];
  if (mode === "process") {
    const h = 95 + (r.values.volume / 62.36) * 115;
    return [
      {
        label: "Gás no cilindro",
        x: 290,
        y: 294 - h,
        width: 220,
        height: h,
        temperature: r.temperatures[0],
      },
    ];
  }
  return [];
}
export function readProbe(
  mode: Mode,
  p: Params,
  r: Result,
  x: number,
  y: number,
) {
  return (
    sampleTargets(mode, p, r).find(
      (s) => x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height,
    ) ?? null
  );
}
