import { waterState, reactions, internalEnergy } from "./physics.ts";
type Mode = "heat" | "reaction" | "law";
type ReactionId = keyof typeof reactions;
function $<T extends Element = HTMLElement>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Elemento ausente: ${selector}`);
  return element;
}
let mode: Mode = "heat";
let reaction: ReactionId = "neutral";
let history: number[] = [];
let energy = 0,
  elapsed = 0,
  running = false,
  last = 0,
  mass = 100,
  power = 1000,
  amount = 0.1,
  q = 30,
  w = -10;
const fmt = (v: number, d = 1) =>
  v.toLocaleString("pt-BR", {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  });
const slider = (
  id: string,
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
  unit: string,
) =>
  `<div class="control"><label for="${id}">${label}<output id="${id}-out">${fmt(value, step < 1 ? 2 : 0)} ${unit}</output></label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><div class="range-ends"><span>${min} ${unit}</span><span>${max} ${unit}</span></div></div>`;
function setup() {
  running = false;
  energy = 0;
  elapsed = 0;
  history = [];
  $(".scene").style.opacity = "1";
  $("#play").hidden = mode === "law";
  $("#play").textContent = "▶ Iniciar";
  document.querySelectorAll<HTMLButtonElement>(".tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.mode === mode);
    b.setAttribute("aria-pressed", String(b.dataset.mode === mode));
  });
  const info = {
    heat: [
      "01",
      "Da água ao vapor",
      "Curva de aquecimento",
      "Amostra de água pura a 1 atm, inicialmente a −20 °C. Tempo acelerado 20×.",
    ],
    reaction: [
      "02",
      "Para onde vai a energia?",
      "Perfil de entalpia",
      "Calorímetro ideal com 1 kg de água a 25 °C; sem perdas e capacidade do recipiente desprezada.",
    ],
    law: [
      "03",
      "O balanço da energia",
      "Balanço energético",
      "Convenção: Q > 0 entra como calor; W > 0 é trabalho realizado sobre o sistema.",
    ],
  }[mode];
  $("#experiment-number").textContent = `EXPERIMENTO ${info[0]}`;
  $("#experiment-title").textContent = info[1];
  $("#chart-title").textContent = info[2];
  $("#control-hint").textContent = info[3];
  $("#controls").innerHTML =
    mode === "heat"
      ? slider("mass", "Massa de água", 50, 300, 10, mass, "g") +
        slider("power", "Potência do aquecedor", 500, 3000, 100, power, "W")
      : mode === "reaction"
        ? `<div class="control"><label for="reaction">Escolha uma reação</label><select id="reaction">${Object.entries(
            reactions,
          )
            .map(
              ([key, r]) =>
                `<option value="${key}" ${key === reaction ? "selected" : ""}>${r.name}</option>`,
            )
            .join("")}</select></div>` +
          slider(
            "amount",
            "Quantidade de reação",
            0.01,
            0.5,
            0.01,
            amount,
            "mol",
          )
        : slider("q", "Calor recebido (Q)", -100, 100, 5, q, "kJ") +
          slider("w", "Trabalho sobre o sistema (W)", -100, 100, 5, w, "kJ");
  $("#controls")
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>("input,select")
    .forEach((el) =>
      el.addEventListener("input", () => {
        if (el.id === "reaction") {
          if (el.value in reactions) reaction = el.value as ReactionId;
        } else {
          const v = Number(el.value);
          if (el.id === "mass") mass = v;
          if (el.id === "power") power = v;
          if (el.id === "amount") amount = v;
          if (el.id === "q") q = v;
          if (el.id === "w") w = v;
          const unit = (
            {
              mass: "g",
              power: "W",
              amount: "mol",
              q: "kJ",
              w: "kJ",
            } as Record<string, string>
          )[el.id];
          $(`#${el.id}-out`).textContent =
            `${fmt(v, el.id === "amount" ? 2 : 0)} ${unit}`;
        }
        if (mode !== "law") {
          running = false;
          energy = 0;
          elapsed = 0;
          history = [];
          $("#play").textContent = "▶ Iniciar";
        }
        render();
      }),
    );
  render();
}
function metrics(
  labels: [string, string, string],
  values: [string, string, string],
) {
  ["a", "b", "c"].forEach((k, i) => {
    $(`#metric-${k}-label`).textContent = labels[i];
    $(`#metric-${k}`).innerHTML = values[i];
  });
}
function insight(title: string, text: string, formula: string) {
  $("#insight-title").textContent = title;
  $("#insight-text").textContent = text;
  $("#formula").textContent = formula;
}
function axes(xLabel: string, yLabel: string) {
  return `<g stroke="#e6ece3" stroke-width="1"><path d="M40 20V145H380" fill="none"/>${[35, 65, 95, 125].map((y) => `<path d="M40 ${y}H380"/>`).join("")}</g><g fill="#89968a" font-size="9" font-family="sans-serif"><text x="43" y="13">${yLabel}</text><text x="260" y="171">${xLabel}</text></g>`;
}
function render() {
  let state;
  if (mode === "heat") {
    state = waterState(mass, energy);
    metrics(
      ["Temperatura", "Energia fornecida", "Estado físico"],
      [
        `${fmt(state.temperature)} <small>°C</small>`,
        `${fmt(energy)} <small>kJ</small>`,
        state.phase,
      ],
    );
    $("#state-label").textContent = state.phase.toUpperCase();
    $("#energy-flow").textContent = "↑ ENERGIA TÉRMICA";
    $("#liquid").style.background =
      state.phase === "Sólido"
        ? "#a1d8e160"
        : state.phase === "Gasoso"
          ? "#c6dfdf18"
          : "#71c5d150";
    const plateau = ["Fusão", "Ebulição"].includes(state.phase);
    insight(
      plateau
        ? "A temperatura parou. A energia, não."
        : "Mais energia, maior agitação.",
      plateau
        ? "Durante a mudança de estado, o calor recebido altera as interações entre partículas. A temperatura permanece constante até completar a transformação."
        : "Fora das mudanças de estado, o calor aumenta a temperatura. Uma amostra maior precisa de mais energia para a mesma variação de temperatura.",
      plateau ? "Q = m · L" : "Q = m · c · ΔT",
    );
    const maxE = mass * 3.1;
    let svg = axes("Energia fornecida (kJ)", "Temperatura (°C)");
    svg +=
      '<g fill="#89968a" font-size="9"><text x="13" y="143">−20</text><text x="22" y="126">0</text><text x="10" y="43">100</text></g>';
    const points = Array.from({ length: 151 }, (_, i) => {
      const e = (i / 150) * maxE;
      return `${40 + (e / maxE) * 330},${140 - ((waterState(mass, e).temperature + 20) / 150) * 120}`;
    }).join(" ");
    svg += `<polyline points="${points}" fill="none" stroke="#cddbcf" stroke-width="2"/>`;
    if (history.length)
      svg += `<polyline points="${history.map((e) => `${40 + (e / maxE) * 330},${140 - ((waterState(mass, e).temperature + 20) / 150) * 120}`).join(" ")}" fill="none" stroke="#238368" stroke-width="3"/>`;
    svg += `<circle cx="${40 + (energy / maxE) * 330}" cy="${140 - ((state.temperature + 20) / 150) * 120}" r="4" fill="#df9e4d"/><text x="348" y="157" fill="#89968a" font-size="9">${fmt(maxE, 0)}</text>`;
    $("#chart").innerHTML = svg;
    $("#chart-caption").textContent =
      "Cinza: curva prevista · Verde: energia já fornecida.";
  } else if (mode === "reaction") {
    const r = reactions[reaction],
      progress = Math.min(elapsed / 8, 1),
      heat = -r.dh * amount * progress,
      t = 25 + heat / 4.18;
    metrics(
      ["Temperatura do banho", "ΔH da reação", "Calor no banho"],
      [
        `${fmt(t)} <small>°C</small>`,
        `${fmt(r.dh)} <small>kJ/mol</small>`,
        `${fmt(heat)} <small>kJ</small>`,
      ],
    );
    $("#state-label").textContent = r.dh < 0 ? "EXOTÉRMICA" : "ENDOTÉRMICA";
    $("#energy-flow").textContent =
      r.dh < 0 ? "↑ CALOR PARA O BANHO" : "↓ CALOR PARA A REAÇÃO";
    $("#liquid").style.background = r.dh < 0 ? "#f2b37855" : "#7dbedc55";
    insight(
      r.dh < 0 ? "O sistema libera energia." : "O sistema absorve energia.",
      `${r.equation}. ${r.dh < 0 ? "Os produtos têm menor entalpia que os reagentes. A energia liberada aquece o banho." : "Os produtos têm maior entalpia. Neste modelo ideal, o calor é retirado do banho. A reação real exige aquecimento intenso."}`,
      "qbanho = −n · ΔH",
    );
    const y0 = r.dh < 0 ? 65 : 125,
      y1 = r.dh < 0 ? 125 : 65;
    $("#chart").innerHTML =
      axes("Progresso da reação", "Entalpia relativa") +
      `<path d="M45 ${y0} H100 C155 ${y0} 150 18 205 28 S250 ${y1} 310 ${y1} H375" fill="none" stroke="#25866b" stroke-width="3"/><g fill="#617c6b" font-size="10"><text x="48" y="${y0 - 8}">Reagentes</text><text x="307" y="${y1 - 8}">Produtos</text><text x="235" y="50">ΔH ${r.dh < 0 ? "＜" : "＞"} 0</text></g>`;
    $("#chart-caption").textContent =
      `Avanço: ${fmt(progress * 100, 0)}%. Perfil qualitativo; barreira de ativação ilustrativa.`;
  } else {
    const u = internalEnergy(q, w);
    metrics(
      ["Calor (Q)", "Trabalho (W)", "Variação interna"],
      [
        `${q > 0 ? "+" : ""}${q} <small>kJ</small>`,
        `${w > 0 ? "+" : ""}${w} <small>kJ</small>`,
        `${u > 0 ? "+" : ""}${u} <small>kJ</small>`,
      ],
    );
    $("#state-label").textContent = "SISTEMA FECHADO";
    $("#energy-flow").textContent = q >= 0 ? "↓ CALOR ENTRA" : "↑ CALOR SAI";
    $("#liquid").style.background = "#a3cabd44";
    insight(
      u === 0
        ? "As transferências se compensam."
        : u > 0
          ? "O sistema ganha energia interna."
          : "O sistema perde energia interna.",
      "A energia se conserva. Somamos o calor e o trabalho trocados com o ambiente. Trabalho sobre o sistema é positivo; trabalho feito pelo sistema é negativo.",
      "ΔU = Q + W",
    );
    $("#chart").innerHTML =
      axes("Transferências de energia", "Energia (kJ)") +
      `<path d="M40 83H380" stroke="#9eafa0"/>` +
      [q, w, u]
        .map((v, i) => {
          const h = Math.abs(v) * 0.28,
            x = 90 + i * 105;
          return `<rect x="${x}" y="${v >= 0 ? 83 - h : 83}" width="42" height="${Math.max(h, 1)}" rx="3" fill="${i === 2 ? "#d5a14f" : "#398b73"}"/><text x="${x + 21}" y="${v >= 0 ? 73 - h : 99 + h}" text-anchor="middle" fill="#547160" font-size="10">${v}</text><text x="${x + 21}" y="151" text-anchor="middle" fill="#547160" font-size="10">${["Q", "W", "ΔU"][i]}</text>`;
        })
        .join("");
    $("#chart-caption").textContent =
      "Barras acima de zero: entrada ou ganho de energia.";
  }
  $("#time").textContent =
    mode === "law" ? "Balanço instantâneo" : `${fmt(elapsed)} s simulados`;
  $("#heater-light").classList.toggle("on", running);
  $("#play").textContent = running
    ? "Ⅱ Pausar"
    : elapsed > 0
      ? "▶ Continuar"
      : "▶ Iniciar";
}
const canvas = $<HTMLCanvasElement>("#particles");
function getContext(): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D indisponível.");
  return context;
}
const ctx = getContext();
const dots = Array.from({ length: 54 }, () => ({
  x: Math.random(),
  y: Math.random(),
  phase: Math.random() * 6.28,
}));
let animationTime = 0;
function frame(timestamp: number) {
  const dt = last ? Math.min((timestamp - last) / 1000, 0.1) : 0;
  last = timestamp;
  animationTime += dt;
  if (running) {
    elapsed += dt * (mode === "heat" ? 20 : 1);
    if (mode === "heat") {
      energy = Math.min(mass * 3.1, energy + (power * dt * 20) / 1000);
      history.push(energy);
      if (energy >= mass * 3.1) running = false;
    } else if (elapsed >= 8) {
      elapsed = 8;
      running = false;
    }
    render();
  }
  const rect = canvas.getBoundingClientRect(),
    dpr = devicePixelRatio || 1;
  if (
    canvas.width !== Math.round(rect.width * dpr) ||
    canvas.height !== Math.round(rect.height * dpr)
  ) {
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  const s = waterState(mass, energy),
    gas = mode === "heat" && s.phase === "Gasoso",
    solid = mode === "heat" && s.phase === "Sólido";
  dots.forEach((p, i) => {
    const speed = solid ? 0.3 : gas ? 2 : 1;
    const x =
      rect.width / 2 -
      78 +
      (solid
        ? (i % 9) * 18 + 3 * Math.sin(animationTime * 5 + p.phase)
        : ((p.x + animationTime * 0.04 * speed) % 1) * 154);
    const y = solid
      ? 130 + Math.floor(i / 9) * 20 + 2 * Math.cos(animationTime * 5 + p.phase)
      : gas
        ? 75 + ((p.y + animationTime * 0.1) % 1) * 170
        : 130 + ((p.y + animationTime * 0.04) % 1) * 117;
    ctx.beginPath();
    ctx.arc(x, y, solid ? 4 : 3.6, 0, Math.PI * 2);
    ctx.fillStyle =
      mode === "reaction" && reactions[reaction].dh < 0
        ? "#c18a50aa"
        : "#338b9aaa";
    ctx.fill();
  });
  requestAnimationFrame(frame);
}
document.querySelectorAll<HTMLButtonElement>(".tab").forEach(
  (el) =>
    (el.onclick = () => {
      const selected = el.dataset.mode;
      if (
        selected === "heat" ||
        selected === "reaction" ||
        selected === "law"
      ) {
        mode = selected;
        setup();
      }
    }),
);
$("#play").onclick = () => {
  if (
    (mode === "heat" && energy >= mass * 3.1) ||
    (mode === "reaction" && elapsed >= 8)
  ) {
    energy = 0;
    elapsed = 0;
    history = [];
  }
  running = !running;
  render();
};
$("#reset").onclick = setup;
$("#help").onclick = () => $<HTMLDialogElement>("#guide").showModal();
$("#close-guide").onclick = () => $<HTMLDialogElement>("#guide").close();
setup();
requestAnimationFrame(frame);
