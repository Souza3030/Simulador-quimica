import { experiments, getExperiment } from "./experiments.ts";
import type { Mode, Params } from "./experiments.ts";
export const storageKey = "termolab-investigacoes-v2";
export interface Snapshot {
  id: string;
  mode: Mode;
  params: Params;
  progress: number;
  date: string;
}
export interface Notebook {
  notes: { see: string; think: string; ask: string };
  snapshots: Snapshot[];
  measurements: Snapshot[];
  solved: Mode[];
  numericSolved: Mode[];
  visited: Mode[];
  selected: Mode;
  updatedAt: number;
}
export const isMode = (id: unknown): id is Mode =>
  typeof id === "string" && experiments.some((e) => e.id === id);
export const emptyNotebook = (): Notebook => ({
  notes: { see: "", think: "", ask: "" },
  snapshots: [],
  measurements: [],
  solved: [],
  numericSolved: [],
  visited: [],
  selected: "mix",
  updatedAt: 0,
});
export function validParams(mode: Mode, data: unknown): data is Params {
  if (!data || typeof data !== "object") return false;
  const values = data as Params;
  return getExperiment(mode).controls.every(
    (c) =>
      Number.isFinite(values[c.key]) &&
      values[c.key] >= c.min &&
      values[c.key] <= c.max &&
      (!c.options || Number.isInteger(values[c.key])),
  );
}
export function sanitizeNotebook(value: unknown): Notebook {
  const out = emptyNotebook();
  if (!value || typeof value !== "object") return out;
  const raw = value as Record<string, unknown>;
  const notes = raw.notes as Record<string, unknown> | undefined;
  for (const key of ["see", "think", "ask"] as const)
    if (typeof notes?.[key] === "string")
      out.notes[key] = (notes[key] as string).slice(0, 3000);
  for (const key of ["solved", "numericSolved", "visited"] as const)
    if (Array.isArray(raw[key]))
      out[key] = (raw[key] as unknown[])
        .filter(isMode)
        .slice(0, experiments.length);
  if (isMode(raw.selected)) out.selected = raw.selected;
  const validSnapshot = (s: unknown): s is Snapshot => {
    if (!s || typeof s !== "object") return false;
    const v = s as Partial<Snapshot>;
    return (
      typeof v.id === "string" &&
      v.id.length < 100 &&
      isMode(v.mode) &&
      validParams(v.mode, v.params) &&
      typeof v.progress === "number" &&
      Number.isFinite(v.progress) &&
      v.progress >= 0 &&
      v.progress <= 1 &&
      typeof v.date === "string"
    );
  };
  if (Array.isArray(raw.snapshots))
    out.snapshots = raw.snapshots.filter(validSnapshot).slice(-12);
  if (Array.isArray(raw.measurements))
    out.measurements = raw.measurements.filter(validSnapshot).slice(-60);
  if (
    typeof raw.updatedAt === "number" &&
    Number.isFinite(raw.updatedAt) &&
    raw.updatedAt >= 0
  )
    out.updatedAt = raw.updatedAt;
  return out;
}
export function loadNotebook(): Notebook {
  try {
    return sanitizeNotebook(
      JSON.parse(localStorage.getItem(storageKey) || "null"),
    );
  } catch {
    return emptyNotebook();
  }
}
export function saveNotebook(data: Notebook): boolean {
  data.updatedAt = Math.max(Date.now(), data.updatedAt + 1);
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
export function importNotebook(data: Notebook): Notebook {
  const safe = sanitizeNotebook(data);
  localStorage.setItem(storageKey, JSON.stringify(safe));
  return safe;
}
export function exportNotebook(data: Notebook) {
  return JSON.stringify(
    { version: 4, title: "Caderno TermoLab", ...data },
    null,
    2,
  );
}
