import { experiments, evaluate, getExperiment } from "./experiments.ts";
import type { Mode, Params, Result } from "./experiments.ts";
import { gibbs } from "./physics.ts";
import { icon } from "./icons.ts";
import { drawScene } from "./scene.ts";
import { lessons, calculations } from "./lessons.ts";
import { sampleTargets, readProbe } from "./instruments.ts";
import { clamp, R } from "./physics.ts";
function $<T extends Element = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Elemento ausente: ${selector}`);
  return element;
}
const fmt = (value: number, d = 1) =>
  (Math.abs(value) < Math.pow(10, -d) / 2 ? 0 : value).toLocaleString("pt-BR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const isMode = (id: unknown): id is Mode =>
  typeof id === "string" && experiments.some((e) => e.id === id);
const storageKey = "termolab-investigacoes-v2";
interface Snapshot {
  id: string;
  mode: Mode;
  params: Params;
  progress: number;
  date: string;
}
interface Notebook {
  notes: { see: string; think: string; ask: string };
  snapshots: Snapshot[];
  measurements: Snapshot[];
  solved: Mode[];
  visited: Mode[];
  selected: Mode;
}
const emptyNotebook = (): Notebook => ({
  notes: { see: "", think: "", ask: "" },
  snapshots: [],
  measurements: [],
  solved: [],
  visited: [],
  selected: "mix",
});
function validParams(mode: Mode, data: unknown): data is Params {
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
function load(): Notebook {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (!raw) return emptyNotebook();
    const out = emptyNotebook();
    for (const key of ["see", "think", "ask"] as const)
      if (typeof raw.notes?.[key] === "string")
        out.notes[key] = raw.notes[key].slice(0, 3000);
    if (Array.isArray(raw.solved)) out.solved = raw.solved.filter(isMode);
    if (Array.isArray(raw.visited)) out.visited = raw.visited.filter(isMode);
    if (isMode(raw.selected)) out.selected = raw.selected;
    if (Array.isArray(raw.snapshots))
      out.snapshots = raw.snapshots
        .filter(
          (s: Snapshot) =>
            s &&
            typeof s.id === "string" &&
            s.id.length < 100 &&
            isMode(s.mode) &&
            validParams(s.mode, s.params) &&
            Number.isFinite(s.progress) &&
            s.progress >= 0 &&
            s.progress <= 1 &&
            typeof s.date === "string",
        )
        .slice(-12);
    if (Array.isArray(raw.measurements))
      out.measurements = raw.measurements
        .filter(
          (v: Snapshot) =>
            v &&
            typeof v.id === "string" &&
            v.id.length < 100 &&
            isMode(v.mode) &&
            validParams(v.mode, v.params) &&
            Number.isFinite(v.progress) &&
            v.progress >= 0 &&
            v.progress <= 1 &&
            typeof v.date === "string",
        )
        .slice(-60);
    return out;
  } catch {
    return emptyNotebook();
  }
}
let notebook = load(),
  mode: Mode = notebook.selected,
  params: Params = { ...getExperiment(mode).defaults },
  progress = 0,
  running = false,
  speed = 1,
  clock = 0,
  last = 0,
  lastRender = 0,
  showChart = false,
  micro = true,
  reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
type LearningTab = "protocol" | "calculations" | "data";
let guided = false,
  guidedStep = 0,
  learningTab: LearningTab = "protocol",
  probeEnabled = true,
  energyVisible = true,
  needsDraw = true;
let probePosition = { x: 222.5, y: 220 },
  probeBinding: number | null = 0;
let current: Result = evaluate(mode, params, progress),
  toastTimer: ReturnType<typeof setTimeout>;
function toast(message: string) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 3500);
}
function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(notebook));
    $("#storage-status").textContent = "Salvo neste navegador.";
    return true;
  } catch {
    $("#storage-status").textContent =
      "O navegador bloqueou o armazenamento. Exporte o caderno para guardar seus dados.";
    return false;
  }
}
function iconLabel(selector: string, name: string, text: string) {
  $(selector).innerHTML = icon(name) + text;
}
iconLabel("#help", "help", "Como explorar");
iconLabel("#model", "help", "Sobre este modelo");
iconLabel("#view-bench", "mix", "Bancada");
iconLabel("#view-chart", "chart", "Gráfico");
iconLabel("#micro", "eye", "Ver partículas");
iconLabel("#save-run", "pin", "Guardar este ensaio");
iconLabel("#export", "download", "Exportar caderno");
$("#reset").innerHTML = icon("reset");
$("#insight-icon").innerHTML = icon("spark");
$("#teaser-icon").innerHTML = icon("book");
$("#write-note").innerHTML = "Abrir meu caderno " + icon("arrow");
iconLabel("#probe-toggle", "thermo", "Termômetro");
iconLabel("#energy-toggle", "energy", "Energia");
$("#focus").innerHTML =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/></svg>';
function updateNotebookCount() {
  $("#open-notebook").innerHTML =
    icon("book") +
    `Meu caderno <span class="notebook-count">${notebook.snapshots.length}</span>`;
}
function nav() {
  let group = "";
  $("#topics").innerHTML = experiments
    .map((e) => {
      const heading =
        group === e.group
          ? ""
          : `<div class="nav-group">${(group = e.group)}</div>`;
      return `${heading}<button data-mode="${e.id}" class="${e.id === mode ? "active" : ""} ${notebook.visited.includes(e.id) ? "visited" : ""}" aria-current="${e.id === mode ? "page" : "false"}">${icon(e.icon)}<span>${e.name}</span><span class="topic-number">${e.number}</span></button>`;
    })
    .join("");
  document.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.dataset.mode;
        if (isMode(id)) selectExperiment(id);
      }),
  );
  $("#visited-count").textContent =
    `${new Set(notebook.visited).size} / ${experiments.length}`;
  $("#visited-bar").style.width =
    `${(new Set(notebook.visited).size / experiments.length) * 100}%`;
}
function controls() {
  const e = getExperiment(mode);
  $("#controls").innerHTML = e.controls
    .map(
      (c) =>
        `<div class="control" id="group-${c.key}"><label for="param-${c.key}">${c.label}${c.options ? "" : `<output id="output-${c.key}">${fmt(params[c.key], c.step < 0.01 ? 3 : c.step < 1 ? 1 : 0)} <small>${c.unit}</small></output>`}</label>${c.options ? `<select id="param-${c.key}" data-param="${c.key}">${c.options.map((option, i) => `<option value="${i}" ${params[c.key] === i ? "selected" : ""}>${option}</option>`).join("")}</select>` : `<input id="param-${c.key}" data-param="${c.key}" type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${params[c.key]}"><div class="range-ends"><span>${fmt(c.min, c.step < 0.01 ? 3 : c.step < 1 ? 1 : 0)} ${c.unit}</span><span>${fmt(c.max, c.step < 0.01 ? 3 : c.step < 1 ? 1 : 0)} ${c.unit}</span></div>`}</div>`,
    )
    .join("");
  $("#presets").innerHTML = e.presets
    .map(
      (preset, i) =>
        `<button data-preset="${i}">${preset.name} ${icon("arrow")}</button>`,
    )
    .join("");
  document
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-param]")
    .forEach(
      (input) =>
        (input.oninput = () => {
          const key = input.dataset.param!;
          params[key] = Number(input.value);
          running = false;
          progress = 0;
          clock = 0;
          const c = e.controls.find((c) => c.key === key)!;
          if (!c.options)
            $(`#output-${key}`).innerHTML =
              `${fmt(params[key], c.step < 0.01 ? 3 : c.step < 1 ? 1 : 0)} <small>${c.unit}</small>`;
          disableControls();
          render();
        }),
    );
  document.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach(
    (b) =>
      (b.onclick = () => {
        params = { ...params, ...e.presets[Number(b.dataset.preset)].values };
        progress = 0;
        running = false;
        clock = 0;
        controls();
        render();
        toast("Configuração aplicada. Inicie ou avance pela linha do tempo.");
      }),
  );
  disableControls();
}
function disableControls() {
  if (mode !== "process") return;
  for (const key of ["ratio", "temperature"]) {
    const disabled =
      key === "ratio" ? params.process === 1 : params.process !== 1;
    $<HTMLInputElement>(`#param-${key}`).disabled = disabled;
    $(`#group-${key}`).classList.toggle("disabled", disabled);
  }
}
function challenge() {
  const e = getExperiment(mode);
  $("#question").textContent = e.question;
  $("#challenge-progress").textContent =
    `${new Set(notebook.solved).size}/${experiments.length} descobertas`;
  $("#feedback").textContent = notebook.solved.includes(mode)
    ? e.explanation
    : "";
  $("#answers").innerHTML = e.choices
    .map(
      (choice, i) =>
        `<button data-answer="${i}" class="${notebook.solved.includes(mode) && i === e.correct ? "correct" : ""}"><b>${String.fromCharCode(65 + i)}</b>${choice}</button>`,
    )
    .join("");
  document.querySelectorAll<HTMLButtonElement>("[data-answer]").forEach(
    (b) =>
      (b.onclick = () => {
        const correct = Number(b.dataset.answer) === e.correct;
        if (correct) {
          if (!notebook.solved.includes(mode)) notebook.solved.push(mode);
          persist();
          challenge();
        } else {
          b.classList.add("incorrect");
          $("#feedback").textContent =
            "Vale testar outra hipótese. Observe o modelo e tente novamente.";
        }
      }),
  );
}
function selectExperiment(id: Mode, snapshot?: Snapshot) {
  mode = id;
  params = { ...(snapshot?.params ?? getExperiment(id).defaults) };
  progress = snapshot?.progress ?? 0;
  clock = 0;
  running = false;
  notebook.selected = id;
  if (!notebook.visited.includes(id)) notebook.visited.push(id);
  persist();
  const e = getExperiment(id);
  $("#experiment-number").textContent =
    `EXPERIÊNCIA ${e.number} / ${e.name.toUpperCase()}`;
  $("#experiment-title").textContent = e.title;
  $("#experiment-subtitle").textContent = e.subtitle;
  $("#control-icon").innerHTML = icon(e.icon);
  $("#formula").textContent = e.formula;
  $("#timeline").hidden = id === "gibbs";
  $("#static-caption").hidden = id !== "gibbs";
  $("#micro").hidden = ["first", "second", "gibbs", "hess"].includes(id);
  guidedStep = 0;
  probeBinding = 0;
  current = evaluate(mode, params, progress);
  setupProbe();
  renderLesson();
  renderGuided();
  nav();
  controls();
  challenge();
  render();
}
function render() {
  current = evaluate(mode, params, progress);
  $("#status").textContent = current.status;
  $("#insight").textContent = current.insight;
  $("#metrics").innerHTML = current.metrics
    .map(
      (m) =>
        `<div class="metric ${m.color ?? ""}"><span>${m.label}</span><strong>${fmt(m.value, 1)}<small>${m.unit}</small></strong></div>`,
    )
    .join("");
  $("#play").innerHTML = icon(running ? "pause" : "play");
  $("#play").setAttribute(
    "aria-label",
    running
      ? "Pausar experimento"
      : progress >= 1
        ? "Repetir experimento"
        : "Iniciar experimento",
  );
  $<HTMLInputElement>("#progress").value = String(Math.round(progress * 1000));
  $("#progress-label").textContent = `${fmt(progress * 100, 0)}%`;
  $("#time-label").textContent =
    mode === "phase"
      ? `${fmt(current.values.seconds, 1)} s físicos · reprodução 20×`
      : mode === "boundaries"
        ? `${fmt(progress * 600, 0)} s físicos · reprodução 40×`
        : progress === 0
          ? "ARRASTE PARA EXPLORAR O TEMPO"
          : progress === 1
            ? "ESTADO FINAL"
            : "AVANÇO ILUSTRATIVO";
  $("#stage-caption").textContent =
    mode === "process"
      ? "Gás ideal · processo reversível · dimensões ilustrativas"
      : mode === "gibbs"
        ? "Balanço de energia livre · transformação hipotética"
        : mode === "phase"
          ? "Água a 1 atm · partículas ilustrativas · fora de escala"
          : "Modelo didático · representação ilustrativa · veja as hipóteses em “Sobre este modelo”";
  $("#scene").setAttribute(
    "aria-label",
    `${getExperiment(mode).title} ${current.metrics.map((m) => `${m.label}: ${fmt(m.value)} ${m.unit}`).join(". ")}`,
  );
  needsDraw = true;
  updateProbe();
  updatePiston();
  if (learningTab === "calculations") renderCalculations();
  if (showChart) renderChart();
}
interface Point {
  x: number;
  y: number;
}
function graphData(id: Mode, p: Params, secondary = false): Point[] {
  return Array.from({ length: 81 }, (_, i) => {
    const t = i / 80,
      r = evaluate(id, p, t);
    return {
      x:
        id === "gibbs"
          ? 200 + t * 700
          : id === "phase"
            ? p.mass * 3.09 * t
            : id === "boundaries"
              ? t * 600
              : id === "process"
                ? p.process === 1
                  ? r.values.temperature
                  : r.values.volume
                : t * 100,
      y:
        id === "gibbs"
          ? gibbs(p.dh, p.ds, 200 + t * 700)
          : secondary
            ? r.temperatures[id === "heat" ? 0 : 1]
            : r.plotValue,
    };
  });
}
function renderChart() {
  const data = graphData(mode, params),
    second = ["mix", "heat", "identify"].includes(mode)
      ? graphData(mode, params, true)
      : [];
  const pinned = notebook.snapshots.filter((s) => s.mode === mode).at(-1);
  const previous =
    pinned &&
    (mode !== "process" ||
      (pinned.params.process === 1) === (params.process === 1))
      ? graphData(mode, pinned.params)
      : [];
  const all = [...data, ...second, ...previous];
  let xMin = Math.min(...all.map((v) => v.x)),
    xMax = Math.max(...all.map((v) => v.x)),
    yMin = Math.min(...all.map((v) => v.y)),
    yMax = Math.max(...all.map((v) => v.y));
  if (["gibbs", "first", "second", "hess"].includes(mode)) {
    yMin = Math.min(0, yMin);
    yMax = Math.max(0, yMax);
  }
  if (xMin === xMax) xMax = xMin + 1;
  const pad = (yMax - yMin) * 0.13 || 5;
  yMin -= pad;
  yMax += pad;
  const x = (v: number) => 70 + ((v - xMin) / (xMax - xMin)) * 660,
    y = (v: number) => 305 - ((v - yMin) / (yMax - yMin)) * 240;
  let svg = "";
  for (let i = 0; i <= 4; i++) {
    const gy = yMin + ((yMax - yMin) * i) / 4,
      gx = xMin + ((xMax - xMin) * i) / 4;
    svg += `<path d="M70 ${y(gy)}H730" stroke="#dce8f0"/><text x="57" y="${y(gy) + 4}" text-anchor="end" fill="#6f91aa" font-size="11">${fmt(gy, Math.abs(gy) < 10 ? 1 : 0)}</text><text x="${x(gx)}" y="331" text-anchor="middle" fill="#6f91aa" font-size="11">${fmt(gx, gx < 10 ? 1 : 0)}</text>`;
  }
  const path = (points: Point[], color: string, dashed = false) =>
    `<polyline points="${points.map((v) => `${x(v.x)},${y(v.y)}`).join(" ")}" stroke="${color}" stroke-width="2.5" ${dashed ? 'stroke-dasharray="5 6"' : ""} fill="none"/>`;
  if (yMin < 0 && yMax > 0)
    svg += `<path d="M70 ${y(0)}H730" stroke="#aac3d5" stroke-dasharray="4 5"/>`;
  if (previous.length) svg += path(previous, "#8ba9ba99", true);
  svg += path(data, "#ed8a20");
  if (second.length) svg += path(second, "#2088bf");
  const marker =
    mode === "gibbs"
      ? { x: params.temperature, y: current.values.dg }
      : {
          x:
            mode === "phase"
              ? current.values.energy
              : mode === "boundaries"
                ? progress * 600
                : mode === "process"
                  ? params.process === 1
                    ? current.values.temperature
                    : current.values.volume
                  : progress * 100,
          y: current.plotValue,
        };
  svg += `<circle cx="${x(marker.x)}" cy="${y(marker.y)}" r="5" fill="#00528a" stroke="#ffffff" stroke-width="2"/>`;
  const xLabel =
    mode === "gibbs"
      ? "Temperatura (K)"
      : mode === "phase"
        ? "Energia recebida (kJ)"
        : mode === "boundaries"
          ? "Tempo físico (s)"
          : mode === "process"
            ? params.process === 1
              ? "Temperatura (K)"
              : "Volume (L)"
            : "Avanço (%)";
  const yLabel =
    mode === "gibbs"
      ? "ΔG (kJ/mol)"
      : mode === "process"
        ? "Pressão (kPa)"
        : mode === "hess"
          ? "ΔH acumulado (kJ)"
          : mode === "first"
            ? "ΔU (kJ)"
            : mode === "second"
              ? "Trabalho (kJ)"
              : "Temperatura (°C)";
  svg += `<text x="70" y="36" fill="#305f80" font-size="12">${yLabel}</text><text x="730" y="363" text-anchor="end" fill="#7295ad" font-size="11">${xLabel}</text>`;
  $("#chart").innerHTML = svg;
  $("#chart-caption").textContent =
    `Laranja: ${mode === "mix" ? "água quente" : mode === "identify" ? "metal" : mode === "heat" ? "material escolhido" : "ensaio atual"}${second.length ? " · Azul: " + (mode === "mix" ? "água fria" : "água") : ""}${previous.length ? " · Tracejado: último ensaio guardado" : ""} · Ponto: estado atual`;
  $("#chart").setAttribute(
    "aria-label",
    `${yLabel} em função de ${xLabel}. ${current.status}. ${current.metrics.map((m) => `${m.label} ${fmt(m.value)} ${m.unit}`).join(". ")}`,
  );
}
function setView(chart: boolean) {
  showChart = chart;
  $("#apparatus").hidden = chart;
  needsDraw = true;
  updateProbe();
  $("#chart-view").hidden = !chart;
  for (const [id, active] of [
    ["#view-bench", !chart],
    ["#view-chart", chart],
  ] as const) {
    $(id).classList.toggle("active", active);
    $(id).setAttribute("aria-pressed", String(active));
  }
  if (chart) renderChart();
}
function showNotebook() {
  renderNotebook();
  $<HTMLDialogElement>("#notebook").showModal();
}
function renderNotebook() {
  updateNotebookCount();
  for (const key of ["see", "think", "ask"] as const)
    $<HTMLTextAreaElement>(`#note-${key}`).value = notebook.notes[key];
  $("#saved-runs").innerHTML = notebook.snapshots.length
    ? notebook.snapshots
        .map((s, i) => {
          const e = getExperiment(s.mode),
            r = evaluate(s.mode, s.params, s.progress);
          return `<article class="saved-run"><div><strong>Ensaio ${i + 1} · ${e.name} · ${fmt(s.progress * 100, 0)}%</strong><p>${r.metrics.map((m) => `${m.label}: ${fmt(m.value)} ${m.unit}`).join(" · ")}</p></div><button data-restore="${escape(s.id)}">Retomar ${icon("arrow")}</button><button class="delete-run" data-delete="${escape(s.id)}" aria-label="Excluir ensaio ${i + 1}">×</button></article>`;
        })
        .join("")
    : '<p class="empty">O caderno está aberto. Guarde seu primeiro ensaio na bancada.</p>';
  const selected = notebook.snapshots.filter((s) => s.mode === mode).slice(-2);
  $("#comparison").innerHTML =
    selected.length === 2
      ? `<h3 class="compare-heading">Lado a lado · ${getExperiment(mode).name}</h3><table><thead><tr><th>Variável</th><th>Ensaio A · ${fmt(selected[0].progress * 100, 0)}%</th><th>Ensaio B · ${fmt(selected[1].progress * 100, 0)}%</th></tr></thead><tbody>${getExperiment(
          mode,
        )
          .controls.map(
            (c) =>
              `<tr><td>${c.label}</td>${selected.map((s) => `<td>${c.options ? c.options[s.params[c.key]] : `${fmt(s.params[c.key], c.step < 0.01 ? 3 : 1)} ${c.unit}`}</td>`).join("")}</tr>`,
          )
          .join("")}${evaluate(mode, selected[0].params, selected[0].progress)
          .metrics.map(
            (metric, i) =>
              `<tr><td>Medição ${i + 1}</td>${selected
                .map((s) => {
                  const m = evaluate(mode, s.params, s.progress).metrics[i];
                  return `<td>${m.label}: ${fmt(m.value)} ${m.unit}</td>`;
                })
                .join("")}</tr>`,
          )
          .join("")}</tbody></table>`
      : `<p class="dialog-intro">Para comparar, guarde dois ensaios de “${getExperiment(mode).name}”. O gráfico também mostra a curva do último ensaio guardado.</p>`;
  document.querySelectorAll<HTMLButtonElement>("[data-restore]").forEach(
    (b) =>
      (b.onclick = () => {
        const s = notebook.snapshots.find((s) => s.id === b.dataset.restore);
        if (s) {
          selectExperiment(s.mode, s);
          $<HTMLDialogElement>("#notebook").close();
          toast("Configuração e instante do ensaio restaurados.");
        }
      }),
  );
  document.querySelectorAll<HTMLButtonElement>("[data-delete]").forEach(
    (b) =>
      (b.onclick = () => {
        notebook.snapshots = notebook.snapshots.filter(
          (s) => s.id !== b.dataset.delete,
        );
        persist();
        renderNotebook();
        if (showChart) renderChart();
      }),
  );
}
$("#save-run").onclick = () => {
  if (notebook.snapshots.length >= 12) {
    toast(
      "Seu caderno tem 12 ensaios. Exporte ou exclua um para guardar outro.",
    );
    return;
  }
  notebook.snapshots.push({
    id: crypto.randomUUID(),
    mode,
    params: { ...params },
    progress,
    date: new Date().toISOString(),
  });
  const saved = persist();
  updateNotebookCount();
  toast(
    saved
      ? "Ensaio guardado. Compare seus resultados no caderno."
      : "Ensaio guardado só nesta sessão. Exporte o caderno para preservá-lo.",
  );
  if (showChart) renderChart();
};
for (const key of ["see", "think", "ask"] as const)
  $<HTMLTextAreaElement>(`#note-${key}`).oninput = () => {
    notebook.notes[key] = $<HTMLTextAreaElement>(`#note-${key}`).value;
    persist();
  };
$("#export").onclick = () => {
  const content = JSON.stringify(
    {
      version: 3,
      title: "Caderno TermoLab",
      ...notebook,
      results: notebook.snapshots.map((s) => ({
        ...s,
        result: evaluate(s.mode, s.params, s.progress),
      })),
    },
    null,
    2,
  );
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "meu-caderno-termolab.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Exportação do caderno solicitada ao navegador.");
};
$("#open-notebook").onclick = showNotebook;
$("#write-note").onclick = showNotebook;
document
  .querySelectorAll<HTMLButtonElement>("[data-close]")
  .forEach(
    (b) =>
      (b.onclick = () => $<HTMLDialogElement>(`#${b.dataset.close}`).close()),
  );
$("#model").onclick = () => {
  $("#guide-title").textContent = `O modelo: ${getExperiment(mode).name}`;
  $("#guide-content").innerHTML =
    `<p>${getExperiment(mode).model}</p><div class="formula">${getExperiment(mode).formula}</div><p>O desenho representa o fenômeno; dimensões e partículas não estão em escala. Os valores numéricos seguem as hipóteses acima.</p>`;
  $<HTMLDialogElement>("#guide").showModal();
};
$("#help").onclick = () => {
  $("#guide-title").textContent = "Uma bancada. Onze maneiras de descobrir.";
  $("#guide-content").innerHTML =
    "<h3>01 · Faça uma previsão</h3><p>Escolha um assunto e leia a pergunta de investigação. Registre sua hipótese no caderno.</p><h3>02 · Mude uma coisa por vez</h3><p>Use os controles ou uma ideia pronta. Inicie a simulação ou arraste a linha do tempo, inclusive para trás. Bancada e gráfico mostram o mesmo estado.</p><h3>03 · Compare e conecte</h3><p>Guarde um ensaio, altere uma variável e guarde outro. No caderno, compare os dois últimos ensaios do assunto atual. Registre o que viu, pensou e quer perguntar.</p><p>Ajustar parâmetros reinicia a evolução. O ritmo dos processos é ilustrativo, exceto os tempos físicos indicados em sistemas e mudanças de estado. Consulte as hipóteses em cada experiência.</p>";
  $<HTMLDialogElement>("#guide").showModal();
};
$("#view-bench").onclick = () => setView(false);
$("#view-chart").onclick = () => setView(true);
$("#micro").onclick = () => {
  micro = !micro;
  needsDraw = true;
  $("#micro").setAttribute("aria-pressed", String(micro));
  $("#micro").innerHTML =
    icon("eye") + (micro ? "Ver partículas" : "Partículas ocultas");
};
$("#play").onclick = () => {
  if (progress >= 1) progress = 0;
  running = !running;
  render();
};
$("#reset").onclick = () => {
  progress = 0;
  clock = 0;
  running = false;
  render();
};
$<HTMLInputElement>("#progress").oninput = () => {
  progress = Number($<HTMLInputElement>("#progress").value) / 1000;
  running = false;
  clock = progress * 10;
  render();
};
$<HTMLSelectElement>("#speed").onchange = () => {
  speed = Number($<HTMLSelectElement>("#speed").value);
};
function updateMotion() {
  document.body.classList.toggle("reduced", reduced);
  $("#motion").setAttribute("aria-pressed", String(reduced));
  $("#motion").textContent = reduced
    ? "Movimento reduzido"
    : "Reduzir movimento";
}
$("#motion").onclick = () => {
  reduced = !reduced;
  updateMotion();
};
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    running = false;
    render();
  }
});
function frame(timestamp: number) {
  const dt = last ? Math.min((timestamp - last) / 1000, 0.08) : 0;
  last = timestamp;
  if (running) {
    const duration =
      mode === "phase"
        ? (params.mass * 3.09 * 1000) / params.power / 20
        : mode === "boundaries"
          ? 15
          : getExperiment(mode).duration;
    progress = Math.min(1, progress + (dt * speed) / duration);
    if (!reduced) clock += dt * speed;
    if (progress >= 1) running = false;
    current = evaluate(mode, params, progress);
    if (timestamp - lastRender > 65 || !running) {
      render();
      lastRender = timestamp;
    }
  }
  if (!showChart && (running || needsDraw)) {
    drawScene(
      $<HTMLCanvasElement>("#scene"),
      mode,
      params,
      current,
      progress,
      clock,
      micro,
      energyVisible,
    );
    needsDraw = false;
  }
  requestAnimationFrame(frame);
}

function renderLesson() {
  const lesson = lessons[mode];
  $("#lesson-topic").textContent = getExperiment(mode).name;
  $("#panel-protocol").innerHTML =
    `<div class="protocol-top"><div><span class="eyebrow">O QUE VAMOS INVESTIGAR</span><h3>${escape(lesson.objective)}</h3><div class="equipment">${lesson.equipment.map((item) => `<span>${escape(item)}</span>`).join("")}</div><p>${escape(lesson.observe)}</p></div><div class="variable-card"><div><strong>VARIÁVEL INVESTIGADA</strong><p>${escape(lesson.variable)}</p></div><div><strong>MANTENHA CONSTANTE</strong><p>${escape(lesson.keep)}</p></div></div></div><ol class="protocol-steps">${lesson.steps.map((step, i) => `<li><b><span>0${i + 1}</span>${["Preveja e prepare", "Execute e observe", "Meça e calcule", "Compare e explique"][i]}</b><p>${escape(step)}</p></li>`).join("")}</ol><div class="protocol-bottom"><div><h4>Conexão com a prática</h4><p>${escape(lesson.application)}</p></div><div><h4>Um cuidado na interpretação</h4><p>${escape(lesson.mistake)}</p></div></div><p class="extend-question"><strong>VÁ ALÉM</strong>${escape(lesson.extend)}</p>`;
  renderCalculations();
  renderData();
}
function renderCalculations() {
  $("#live-calculations").innerHTML = calculations(
    mode,
    params,
    current,
    progress,
  )
    .map(
      (c) =>
        `<article class="calculation-row"><h3>${escape(c.label)}</h3><code>${escape(c.expression)}</code><p>${escape(c.explanation)}</p></article>`,
    )
    .join("");
}
function setLearningTab(tab: LearningTab) {
  learningTab = tab;
  for (const key of ["protocol", "calculations", "data"] as const) {
    $(`#panel-${key}`).hidden = key !== tab;
    $(`#tab-${key}`).setAttribute("aria-selected", String(key === tab));
    $(`#tab-${key}`).setAttribute("tabindex", key === tab ? "0" : "-1");
  }
  if (tab === "calculations") renderCalculations();
  if (tab === "data") renderData();
}
function renderGuided() {
  $("#guided-strip").hidden = !guided;
  for (const [key, selected] of [
    ["free", !guided],
    ["guided", guided],
  ] as const) {
    $(`#mode-${key}`).classList.toggle("active", selected);
    $(`#mode-${key}`).setAttribute("aria-pressed", String(selected));
  }
  $("#guided-number").textContent = `${guidedStep + 1}/4`;
  $("#guided-title").textContent = [
    "Preveja e prepare",
    "Execute e observe",
    "Meça e calcule",
    "Compare e explique",
  ][guidedStep];
  $("#guided-instruction").textContent = lessons[mode].steps[guidedStep];
  $<HTMLButtonElement>("#guided-prev").disabled = guidedStep === 0;
  $("#guided-next").textContent =
    guidedStep === 3 ? "Concluir roteiro" : "Próxima etapa →";
}
function downloadContent(content: string, name: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function renderData() {
  const records = notebook.measurements.filter((s) => s.mode === mode);
  $<HTMLButtonElement>("#export-csv").disabled = records.length === 0;
  $("#data-table").innerHTML = records.length
    ? `<div class="table-scroll"><table><thead><tr><th>Leitura / avanço</th><th>Medição 1</th><th>Medição 2</th><th>Medição 3</th><th><span class="sr-only">Excluir</span></th></tr></thead><tbody>${records
        .map((s, i) => {
          const result = evaluate(s.mode, s.params, s.progress);
          return `<tr><td><strong>${i + 1} / ${fmt(s.progress * 100, 0)}%</strong><details><summary>Condições</summary>${getExperiment(
            mode,
          )
            .controls.map(
              (c) =>
                `${c.label}: ${c.options ? c.options[s.params[c.key]] : fmt(s.params[c.key], c.step < 0.01 ? 3 : 1) + " " + c.unit}`,
            )
            .join(
              "<br>",
            )}</details></td>${result.metrics.map((m) => `<td><small>${m.label}</small><br>${fmt(m.value, mode === "identify" ? 3 : 2)} ${m.unit}</td>`).join("")}<td><button class="data-remove" data-delete-reading="${escape(s.id)}" aria-label="Excluir leitura ${i + 1}">×</button></td></tr>`;
        })
        .join("")}</tbody></table></div>`
    : '<p class="empty">Sua primeira leitura começa aqui. Ajuste a bancada ou escolha um instante e clique em “Registrar leitura”.</p>';
  document.querySelectorAll<HTMLButtonElement>("[data-delete-reading]").forEach(
    (b) =>
      (b.onclick = () => {
        notebook.measurements = notebook.measurements.filter(
          (s) => s.id !== b.dataset.deleteReading,
        );
        persist();
        renderData();
      }),
  );
}
$("#record-reading").onclick = () => {
  if (notebook.measurements.length >= 60) {
    toast(
      "Limite de 60 leituras atingido. Exporte e exclua leituras para continuar.",
    );
    return;
  }
  notebook.measurements.push({
    id: crypto.randomUUID(),
    mode,
    params: { ...params },
    progress,
    date: new Date().toISOString(),
  });
  const saved = persist();
  renderData();
  toast(
    saved
      ? "Leitura registrada na tabela e salva no navegador."
      : "Leitura registrada nesta sessão. Exporte uma cópia para guardar.",
  );
};
$("#export-csv").onclick = () => {
  const records = notebook.measurements.filter((s) => s.mode === mode);
  if (!records.length) return;
  const controls = getExperiment(mode).controls;
  const header = [
    "experimento",
    "avanco_percentual",
    ...controls.map((c) => `${c.label}${c.unit ? " (" + c.unit + ")" : ""}`),
    ...Array.from({ length: 3 }, (_, i) => [
      `medicao_${i + 1}`,
      `valor_${i + 1}`,
      `unidade_${i + 1}`,
    ]).flat(),
  ];
  const quote = (value: string | number) =>
    '"' + String(value).replaceAll('"', '""') + '"';
  const rows = records.map((s) => [
    getExperiment(mode).name,
    s.progress * 100,
    ...controls.map((c) =>
      c.options ? c.options[s.params[c.key]] : s.params[c.key],
    ),
    ...evaluate(s.mode, s.params, s.progress).metrics.flatMap((m) => [
      m.label,
      m.value,
      m.unit,
    ]),
  ]);
  downloadContent(
    "\uFEFF" +
      [header, ...rows].map((row) => row.map(quote).join(";")).join("\r\n"),
    `termolab-${mode}-medicoes.csv`,
    "text/csv;charset=utf-8",
  );
};
$("#mode-free").onclick = () => {
  guided = false;
  renderGuided();
};
$("#mode-guided").onclick = () => {
  guided = true;
  renderGuided();
};
$("#guided-prev").onclick = () => {
  guidedStep = Math.max(0, guidedStep - 1);
  renderGuided();
};
$("#guided-next").onclick = () => {
  if (guidedStep === 3) {
    toast("Roteiro percorrido. Registre sua explicação no caderno.");
    showNotebook();
  } else {
    guidedStep++;
    renderGuided();
    if (guidedStep === 2) setLearningTab("calculations");
  }
};
const tabs = ["protocol", "calculations", "data"] as const;
for (const tab of tabs) {
  const button = $<HTMLButtonElement>(`#tab-${tab}`);
  button.onclick = () => setLearningTab(tab);
  button.onkeydown = (e) => {
    let target: number | undefined;
    const i = tabs.indexOf(tab);
    if (e.key === "ArrowRight") target = (i + 1) % 3;
    if (e.key === "ArrowLeft") target = (i + 2) % 3;
    if (e.key === "Home") target = 0;
    if (e.key === "End") target = 2;
    if (target !== undefined) {
      e.preventDefault();
      setLearningTab(tabs[target]);
      $<HTMLButtonElement>(`#tab-${tabs[target]}`).focus();
    }
  };
}
let probeOptionKey = "";
function setupProbe() {
  probeOptionKey = "";
  probeBinding = 0;
  updateProbe();
}
function updateProbe() {
  const targets = sampleTargets(mode, params, current);
  const available = targets.length > 0;
  $("#probe-toggle").hidden = !available;
  $("#probe").hidden = !available || !probeEnabled || showChart;
  $("#probe-tools").hidden = !available || !probeEnabled || showChart;
  if (!available) return;
  const key = targets.map((t) => t.label).join("|");
  if (key !== probeOptionKey) {
    $<HTMLSelectElement>("#probe-target").innerHTML =
      '<option value="-1">Posição livre</option>' +
      targets
        .map((t, i) => `<option value="${i}">${t.label}</option>`)
        .join("");
    probeOptionKey = key;
  }
  if (probeBinding !== null && targets[probeBinding]) {
    const target = targets[probeBinding];
    probePosition = {
      x: target.x + target.width * (mode === "process" ? 0.82 : 0.48),
      y: target.y + target.height * 0.6,
    };
  }
  $<HTMLSelectElement>("#probe-target").value = String(probeBinding ?? -1);
  $("#probe").style.left = `${probePosition.x / 8}%`;
  $("#probe").style.top = `${probePosition.y / 3.8}%`;
  const sample = readProbe(
    mode,
    params,
    current,
    probePosition.x,
    probePosition.y,
  );
  $("#probe-sample").textContent = sample?.label ?? "Fora da amostra";
  $("#probe-reading").textContent = sample
    ? `${fmt(sample.temperature)} °C`
    : "— °C";
  $("#probe").setAttribute(
    "aria-label",
    `Termômetro: ${sample ? sample.label + ", " + fmt(sample.temperature) + " graus Celsius" : "fora da amostra"}. Arraste ou use as setas do teclado.`,
  );
}
$("#probe-toggle").onclick = () => {
  probeEnabled = !probeEnabled;
  $("#probe-toggle").setAttribute("aria-pressed", String(probeEnabled));
  updateProbe();
};
$<HTMLSelectElement>("#probe-target").onchange = () => {
  const n = Number($<HTMLSelectElement>("#probe-target").value);
  probeBinding = n < 0 ? null : n;
  updateProbe();
};
function moveProbe(x: number, y: number) {
  probeBinding = null;
  probePosition = { x: clamp(x, 25, 775), y: clamp(y, 95, 350) };
  updateProbe();
}
function scenePoint(event: PointerEvent) {
  const rect = $("#scene").getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 800,
    y: ((event.clientY - rect.top) / rect.height) * 380,
  };
}
let probeDrag: { pointer: number; x: number; y: number } | null = null;
const probe = $<HTMLButtonElement>("#probe");
probe.onpointerdown = (e) => {
  if (e.button !== 0) return;
  e.preventDefault();
  const point = scenePoint(e);
  probeDrag = {
    pointer: e.pointerId,
    x: point.x - probePosition.x,
    y: point.y - probePosition.y,
  };
  probe.setPointerCapture(e.pointerId);
  probe.focus();
};
probe.onpointermove = (e) => {
  if (probeDrag?.pointer !== e.pointerId) return;
  const point = scenePoint(e);
  moveProbe(point.x - probeDrag.x, point.y - probeDrag.y);
};
const releaseProbe = (e: PointerEvent) => {
  if (probeDrag?.pointer !== e.pointerId) return;
  if (probe.hasPointerCapture(e.pointerId))
    probe.releasePointerCapture(e.pointerId);
  probeDrag = null;
};
probe.onpointerup = releaseProbe;
probe.onpointercancel = releaseProbe;
probe.onkeydown = (e) => {
  const d = e.shiftKey ? 30 : 12;
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
    e.preventDefault();
    moveProbe(
      probePosition.x +
        (e.key === "ArrowLeft" ? -d : e.key === "ArrowRight" ? d : 0),
      probePosition.y +
        (e.key === "ArrowUp" ? -d : e.key === "ArrowDown" ? d : 0),
    );
  }
};
function updatePiston() {
  const handle = $("#piston-handle");
  handle.hidden = mode !== "process" || params.process === 1 || showChart;
  if (mode !== "process") return;
  const h = 95 + (current.values.volume / 62.36) * 115;
  handle.style.top = `${(294 - h - 10) / 3.8}%`;
  handle.setAttribute("aria-valuenow", String(params.ratio));
  handle.setAttribute(
    "aria-valuetext",
    `${fmt(params.ratio)} vezes o volume inicial`,
  );
}
function changePiston(ratio: number) {
  params.ratio = Math.round(clamp(ratio, 0.5, 2.5) * 10) / 10;
  progress = 1;
  running = false;
  $<HTMLInputElement>("#param-ratio").value = String(params.ratio);
  $("#output-ratio").innerHTML = `${fmt(params.ratio)} <small>×</small>`;
  render();
}
const piston = $<HTMLButtonElement>("#piston-handle");
let pistonPointer: number | null = null,
  pistonOffset = 0;
piston.onpointerdown = (e) => {
  if (e.button !== 0 || mode !== "process" || params.process === 1) return;
  e.preventDefault();
  pistonPointer = e.pointerId;
  pistonOffset =
    scenePoint(e).y - (294 - (95 + (current.values.volume / 62.36) * 115));
  piston.setPointerCapture(e.pointerId);
};
piston.onpointermove = (e) => {
  if (pistonPointer !== e.pointerId) return;
  const y = scenePoint(e).y - pistonOffset;
  const volume = ((294 - y - 95) / 115) * 62.36;
  changePiston(volume / ((R * 300) / 100));
};
const releasePiston = (e: PointerEvent) => {
  if (e.pointerId !== pistonPointer) return;
  if (piston.hasPointerCapture(e.pointerId))
    piston.releasePointerCapture(e.pointerId);
  pistonPointer = null;
};
piston.onpointerup = releasePiston;
piston.onpointercancel = releasePiston;
piston.onkeydown = (e) => {
  if (
    ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft", "Home", "End"].includes(
      e.key,
    )
  ) {
    e.preventDefault();
    changePiston(
      e.key === "Home"
        ? 0.5
        : e.key === "End"
          ? 2.5
          : params.ratio +
            (["ArrowUp", "ArrowRight"].includes(e.key) ? 0.1 : -0.1),
    );
  }
};
$("#step-forward").onclick = () => {
  running = false;
  progress = Math.min(1, progress + 0.01);
  clock = progress * 10;
  render();
};
$("#energy-toggle").onclick = () => {
  energyVisible = !energyVisible;
  $("#energy-toggle").setAttribute("aria-pressed", String(energyVisible));
  needsDraw = true;
};
$("#focus").onclick = () => {
  const enabled = document.body.classList.toggle("focus-mode");
  $("#focus").setAttribute("aria-pressed", String(enabled));
  $("#focus").setAttribute(
    "aria-label",
    enabled ? "Reduzir bancada" : "Ampliar bancada",
  );
  needsDraw = true;
};
window.addEventListener("resize", () => {
  needsDraw = true;
  updateProbe();
});

updateMotion();
updateNotebookCount();
selectExperiment(mode);
requestAnimationFrame(frame);
