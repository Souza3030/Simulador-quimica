import { experiments, evaluate, getExperiment } from "./experiments.ts";
import type { Mode, Params, Result } from "./experiments.ts";
import { gibbs } from "./physics.ts";
import { icon } from "./icons.ts";
import { drawScene } from "./scene.ts";
function $<T extends Element = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Elemento ausente: ${selector}`);
  return element;
}
const fmt = (value: number, d = 1) =>
  value.toLocaleString("pt-BR", {
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
  solved: Mode[];
  visited: Mode[];
  selected: Mode;
}
const emptyNotebook = (): Notebook => ({
  notes: { see: "", think: "", ask: "" },
  snapshots: [],
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
$(".chapter-stamp strong span").innerHTML = icon("arrow");
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
  $("#visited-count").textContent = `${new Set(notebook.visited).size} / 9`;
  $("#visited-bar").style.width =
    `${(new Set(notebook.visited).size / 9) * 100}%`;
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
    `${new Set(notebook.solved).size}/9 descobertas`;
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
  $("#micro").hidden = ["first", "second", "gibbs"].includes(id);
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
    second = ["mix", "heat"].includes(mode)
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
  if (["gibbs", "first", "second"].includes(mode)) {
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
    svg += `<path d="M70 ${y(gy)}H730" stroke="#ffffff0b"/><text x="57" y="${y(gy) + 4}" text-anchor="end" fill="#829ba9" font-size="11">${fmt(gy, Math.abs(gy) < 10 ? 1 : 0)}</text><text x="${x(gx)}" y="331" text-anchor="middle" fill="#829ba9" font-size="11">${fmt(gx, gx < 10 ? 1 : 0)}</text>`;
  }
  const path = (points: Point[], color: string, dashed = false) =>
    `<polyline points="${points.map((v) => `${x(v.x)},${y(v.y)}`).join(" ")}" stroke="${color}" stroke-width="2.5" ${dashed ? 'stroke-dasharray="5 6"' : ""} fill="none"/>`;
  if (yMin < 0 && yMax > 0)
    svg += `<path d="M70 ${y(0)}H730" stroke="#c6d7bc60" stroke-dasharray="4 5"/>`;
  if (previous.length) svg += path(previous, "#9ea99c60", true);
  svg += path(data, "#c5eaa4");
  if (second.length) svg += path(second, "#7ed8e7");
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
  svg += `<circle cx="${x(marker.x)}" cy="${y(marker.y)}" r="5" fill="#f1b08a" stroke="#172634" stroke-width="2"/>`;
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
        : mode === "first"
          ? "ΔU (kJ)"
          : mode === "second"
            ? "Trabalho (kJ)"
            : "Temperatura (°C)";
  svg += `<text x="70" y="36" fill="#c4d1d6" font-size="12">${yLabel}</text><text x="730" y="363" text-anchor="end" fill="#9aafb8" font-size="11">${xLabel}</text>`;
  $("#chart").innerHTML = svg;
  $("#chart-caption").textContent =
    `Verde: ${mode === "mix" ? "água quente" : mode === "heat" ? "material escolhido" : "ensaio atual"}${second.length ? " · Azul: " + (mode === "mix" ? "água fria" : "água") : ""}${previous.length ? " · Tracejado: último ensaio guardado" : ""} · Ponto: estado atual`;
  $("#chart").setAttribute(
    "aria-label",
    `${yLabel} em função de ${xLabel}. ${current.status}. ${current.metrics.map((m) => `${m.label} ${fmt(m.value)} ${m.unit}`).join(". ")}`,
  );
}
function setView(chart: boolean) {
  showChart = chart;
  $("#scene").hidden = chart;
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
      version: 2,
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
  $("#guide-title").textContent = "Uma bancada. Nove maneiras de perguntar.";
  $("#guide-content").innerHTML =
    "<h3>01 · Faça uma previsão</h3><p>Escolha um assunto e leia a pergunta de investigação. Registre sua hipótese no caderno.</p><h3>02 · Mude uma coisa por vez</h3><p>Use os controles ou uma ideia pronta. Inicie a simulação ou arraste a linha do tempo, inclusive para trás. Bancada e gráfico mostram o mesmo estado.</p><h3>03 · Compare e conecte</h3><p>Guarde um ensaio, altere uma variável e guarde outro. No caderno, compare os dois últimos ensaios do assunto atual. Registre o que viu, pensou e quer perguntar.</p><p>Ajustar parâmetros reinicia a evolução. O ritmo dos processos é ilustrativo, exceto os tempos físicos indicados em sistemas e mudanças de estado. Consulte as hipóteses em cada experiência.</p>";
  $<HTMLDialogElement>("#guide").showModal();
};
$("#view-bench").onclick = () => setView(false);
$("#view-chart").onclick = () => setView(true);
$("#micro").onclick = () => {
  micro = !micro;
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
  if (!showChart)
    drawScene(
      $<HTMLCanvasElement>("#scene"),
      mode,
      params,
      current,
      progress,
      clock,
      micro,
    );
  requestAnimationFrame(frame);
}
updateMotion();
updateNotebookCount();
selectExperiment(mode);
requestAnimationFrame(frame);
