import type { Mode, Params, Result } from "./experiments.ts";
import { materials } from "./physics.ts";
const warm = "#ffb184",
  cool = "#7fdce9",
  mint = "#c2efa3",
  muted = "#8b9ca8";
export function drawScene(
  canvas: HTMLCanvasElement,
  id: Mode,
  p: Params,
  r: Result,
  progress: number,
  clock: number,
  micro: boolean,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const c = ctx;
  const rect = canvas.getBoundingClientRect(),
    dpr = Math.min(devicePixelRatio || 1, 2);
  const width = Math.round(rect.width * dpr),
    height = Math.round(rect.height * dpr);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  c.setTransform(width / 800, 0, 0, height / 380, 0, 0);
  c.clearRect(0, 0, 800, 380);
  function box(
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string | CanvasGradient,
    radius = 12,
    stroke?: string,
  ) {
    c.beginPath();
    c.roundRect(x, y, w, h, radius);
    c.fillStyle = fill;
    c.fill();
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = 1.5;
      c.stroke();
    }
  }
  function text(
    value: string,
    x: number,
    y: number,
    size = 13,
    color = muted,
    align: CanvasTextAlign = "center",
  ) {
    c.fillStyle = color;
    c.font = `${size >= 24 ? 500 : 400} ${size}px Arial`;
    c.textAlign = align;
    c.fillText(value, x, y);
  }
  function line(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    width = 2,
    dashed = false,
  ) {
    c.beginPath();
    c.setLineDash(dashed ? [5, 6] : []);
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.strokeStyle = color;
    c.lineWidth = width;
    c.stroke();
    c.setLineDash([]);
  }
  function arrow(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
  ) {
    line(x1, y1, x2, y2, color, 2);
    const a = Math.atan2(y2 - y1, x2 - x1);
    line(
      x2,
      y2,
      x2 - 9 * Math.cos(a - 0.45),
      y2 - 9 * Math.sin(a - 0.45),
      color,
      2,
    );
    line(
      x2,
      y2,
      x2 - 9 * Math.cos(a + 0.45),
      y2 - 9 * Math.sin(a + 0.45),
      color,
      2,
    );
  }
  function particles(
    x: number,
    y: number,
    w: number,
    h: number,
    temp: number,
    color: string,
    solid = false,
    count = 34,
  ) {
    if (!micro) return;
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    for (let i = 0; i < count; i++) {
      const seed = (Math.sin((i + 1) * 127.1) * 43758.5453) % 1,
        speed = Math.sqrt(Math.max(20, temp + 273) / 293);
      const px = solid
        ? x + 12 + (i % 7) * 18 + Math.sin(clock * 4 + i) * 1.5
        : x +
          ((((seed * w + clock * speed * 11 * (i % 2 ? 1 : -1)) % w) + w) % w);
      const py = solid
        ? y + 15 + Math.floor(i / 7) * 17 + Math.cos(clock * 4 + i) * 1.5
        : y +
          ((((((Math.sin((i + 1) * 311.7) * 19642.349) % 1) * h +
            clock * speed * 7) %
            h) +
            h) %
            h);
      c.beginPath();
      c.arc(px, py, solid ? 3 : 2.8, 0, Math.PI * 2);
      c.fillStyle = color;
      c.globalAlpha = 0.45 + (i % 3) * 0.18;
      c.fill();
    }
    c.restore();
  }
  function tank(
    x: number,
    y: number,
    w: number,
    h: number,
    temp: number,
    color: string,
    label: string,
    solid = false,
    fill = 0.68,
  ) {
    const gradient = c.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, "#dff4ff0c");
    gradient.addColorStop(0.5, "#dff4ff02");
    gradient.addColorStop(1, "#dff4ff10");
    box(x, y, w, h, gradient, 14, "#6e899c");
    c.save();
    c.beginPath();
    c.roundRect(x + 3, y + 3, w - 6, h - 6, 12);
    c.clip();
    const waterY = y + h * (1 - fill);
    const g = c.createLinearGradient(0, waterY, 0, y + h);
    g.addColorStop(0, color + "30");
    g.addColorStop(1, color + "08");
    c.fillStyle = g;
    c.fillRect(x + 3, waterY, w - 6, h);
    line(x + 3, waterY, x + w - 3, waterY, color, 1.4);
    particles(x + 7, waterY + 4, w - 14, h * fill - 10, temp, color, solid);
    c.restore();
    line(x + 9, y + 12, x + 9, y + h - 20, "#d9f3ff16", 3);
    for (let i = 1; i <= 4; i++) {
      line(
        x + w - 20,
        y + (i * h) / 5,
        x + w - 5,
        y + (i * h) / 5,
        "#6c8697",
        1,
      );
    }
    text(label, x + w / 2, y - 25, 12, muted);
    text(
      `${temp.toFixed(1).replace(".", ",")} °C`,
      x + w / 2,
      y + h + 35,
      24,
      color,
    );
    text("H₂O", x + 24, y + h - 18, 13, "#adc9d2", "left");
  }
  // Technical stage grid and platform.
  c.strokeStyle = "#ffffff04";
  c.lineWidth = 1;
  for (let x = 0; x < 800; x += 32) {
    line(x, 0, x, 380, "#ffffff04", 1);
  }
  for (let y = 0; y < 380; y += 32) line(0, y, 800, y, "#ffffff04", 1);
  const glow = c.createRadialGradient(400, 210, 20, 400, 210, 310);
  glow.addColorStop(0, "#5f879a12");
  glow.addColorStop(1, "#5f879a00");
  c.fillStyle = glow;
  c.fillRect(0, 0, 800, 380);
  if (["mix", "heat"].includes(id)) {
    const second = id === "heat" ? materials[p.material].name : "AMOSTRA FRIA";
    tank(
      145,
      85,
      155,
      190,
      r.temperatures[0],
      id === "mix" ? warm : cool,
      id === "mix" ? "AMOSTRA QUENTE" : "ÁGUA",
    );
    if (id === "heat" && p.material !== 0) {
      box(505, 142, 145, 130, "#89634d", 9, "#e4b391");
      box(516, 152, 123, 110, "#b2826350", 6);
      particles(516, 157, 125, 100, r.temperatures[1], warm, true);
      text(second.toUpperCase(), 578, 60, 12);
      text(
        `${r.temperatures[1].toFixed(1).replace(".", ",")} °C`,
        578,
        310,
        24,
        warm,
      );
      text("AMOSTRA SÓLIDA", 578, 245, 10, "#f1ceae");
    } else tank(500, 85, 155, 190, r.temperatures[1], cool, second);
    if (id === "mix") {
      line(300, 220, 500, 220, "#ffffff0b", 14);
      arrow(320, 220, 478, 220, mint);
      text("CALOR", 400, 195, 11, mint);
      text("Q →", 400, 248, 14, mint);
      if (progress > 0 && progress < 1) {
        const shift = (clock * 50) % 150;
        c.beginPath();
        c.arc(325 + shift, 220, 4, 0, Math.PI * 2);
        c.fillStyle = mint;
        c.fill();
      }
      text(`${p.hotMass} g`, 222, 340, 12);
      text(`${p.coldMass} g`, 578, 340, 12);
    } else {
      arrow(222, 350, 222, 322, mint);
      arrow(578, 350, 578, 322, mint);
      text("MESMO CALOR RECEBIDO", 400, 350, 11, mint);
      text(`${p.mass} g`, 222, 40, 11);
      text(`${p.mass} g`, 578, 40, 11);
    }
  } else if (id === "phase" || id === "enthalpy") {
    const t = r.temperatures[0],
      color = id === "enthalpy" && r.values.dh < 0 ? warm : cool,
      phase = id === "phase" ? r.status : "";
    tank(
      300,
      65,
      185,
      215,
      t,
      color,
      id === "phase" ? "ÁGUA PURA · 1 atm" : "BANHO DO CALORÍMETRO",
      phase === "SÓLIDO",
      phase === "GASOSO" ? 0.15 : 0.66,
    );
    if (phase === "GASOSO" || phase === "EBULIÇÃO") {
      particles(315, 30, 155, 110, 100, cool, false, 24);
      text("VAPOR", 560, 90, 11, cool);
    }
    box(275, 288, 235, 28, "#32414c", 6, "#4e6371");
    box(290, 289, 205, 4, progress > 0 ? warm : "#59707b", 2);
    text(
      id === "phase" ? `${p.power} W` : "TROCA DE CALOR",
      393,
      338,
      13,
      warm,
    );
    box(550, 90, 18, 190, "#ffffff08", 9, "#657d8c");
    const height = Math.max(6, Math.min(175, ((t + 20) / 145) * 175));
    box(555, 275 - height, 8, height, color, 4);
    text("°C", 559, 70, 12);
    text(id === "phase" ? `${p.mass} g` : `${p.water} g de água`, 200, 170, 13);
    arrow(235, 180, 280, 180, muted);
  } else if (id === "boundaries") {
    c.setLineDash([6, 8]);
    box(240, 36, 320, 295, "#ffffff02", 22, p.kind === 2 ? mint : "#637d91");
    c.setLineDash([]);
    tank(315, 85, 170, 190, r.temperatures[0], cool, "SISTEMA");
    if (p.kind !== 0) box(310, 80, 180, 9, p.kind === 2 ? mint : "#98aab8", 3);
    text(`AMBIENTE: ${p.ambient} °C`, 650, 64, 13);
    if (p.kind !== 2) {
      const out = r.temperatures[0] >= p.ambient;
      arrow(out ? 540 : 710, 145, out ? 710 : 540, 145, warm);
      text("CALOR", 630, 125, 11, warm);
    } else text("SEM TROCAS", 650, 170, 13, mint);
    if (p.kind === 0) {
      arrow(95, 170, 310, 170, cool);
      arrow(490, 235, 720, 235, cool);
      text("ENTRADA: 0,5 g/s", 160, 148, 11, cool);
      text("SAÍDA: 0,5 g/s", 645, 264, 11, cool);
    }
    text("FRONTEIRA DO SISTEMA", 400, 357, 11, mint);
  } else if (id === "process") {
    const h = 95 + (r.values.volume / 62.36) * 115,
      y = 294 - h;
    box(285, 60, 230, 240, "#ffffff03", 8, "#768b99");
    box(290, y, 220, h, "#64c7e512", 4);
    particles(295, y + 12, 210, h - 20, r.values.temperature - 273.15, cool);
    box(275, y - 10, 250, 17, "#a3b5c2", 4);
    box(391, 28, 18, Math.max(5, y - 28), "#7b91a0", 3);
    box(348, 20, 105, 12, "#b5c4ce", 3);
    text(`${r.values.volume.toFixed(1)} L`, 400, 333, 22, cool);
    text("PISTÃO MÓVEL", 630, 100, 11);
    arrow(560, 113, 520, y, muted);
    text(`Q = ${r.values.q.toFixed(2)} kJ`, 160, 190, 14, warm);
    text(`W = ${r.values.w.toFixed(2)} kJ`, 650, 240, 14, mint);
    text("1 mol · gás ideal", 400, 358, 12);
  } else if (id === "first") {
    box(290, 110, 220, 160, "#c2efa309", 18, "#8ba77f");
    text("ENERGIA INTERNA", 400, 150, 12, mint);
    text(
      `${r.values.u >= 0 ? "+" : ""}${r.values.u.toFixed(1)} kJ`,
      400,
      202,
      32,
      "#edf4e9",
    );
    text("ΔU", 400, 241, 16, mint);
    arrow(p.q >= 0 ? 100 : 275, 190, p.q >= 0 ? 275 : 100, 190, warm);
    text("CALOR · Q", 165, 153, 12, warm);
    text(`${r.values.q.toFixed(1)} kJ`, 165, 225, 18, warm);
    arrow(p.w >= 0 ? 700 : 525, 190, p.w >= 0 ? 525 : 700, 190, cool);
    text("TRABALHO · W", 638, 153, 12, cool);
    text(`${r.values.w.toFixed(1)} kJ`, 638, 225, 18, cool);
    text("ENTRADAS POSITIVAS · SAÍDAS NEGATIVAS", 400, 329, 11);
  } else if (id === "second") {
    box(66, 104, 160, 155, "#ffb18412", 14, "#ffb18450");
    text("FONTE QUENTE", 146, 144, 11, warm);
    text(`${p.hot} K`, 146, 192, 30, warm);
    text(`${r.values.input.toFixed(1)} kJ`, 146, 228, 16, warm);
    box(575, 104, 160, 155, "#7fdce912", 14, "#7fdce950");
    text("FONTE FRIA", 655, 144, 11, cool);
    text(`${p.cold} K`, 655, 192, 30, cool);
    text(`${r.values.rejected.toFixed(1)} kJ`, 655, 228, 16, cool);
    arrow(240, 181, 335, 181, warm);
    arrow(465, 181, 560, 181, cool);
    c.save();
    c.translate(400, 181);
    c.rotate(clock * 0.3);
    for (let i = 0; i < 8; i++) {
      c.rotate(Math.PI / 4);
      box(-5, -63, 10, 19, "#9db39b", 3);
    }
    c.restore();
    c.beginPath();
    c.arc(400, 181, 48, 0, Math.PI * 2);
    c.fillStyle = "#24382f";
    c.fill();
    c.strokeStyle = mint;
    c.lineWidth = 2;
    c.stroke();
    text("η", 400, 174, 16, mint);
    text(`${(r.values.efficiency * 100).toFixed(0)}%`, 400, 200, 23, mint);
    arrow(400, 250, 400, 303, mint);
    text(`TRABALHO: ${r.values.work.toFixed(2)} kJ`, 400, 333, 15, mint);
  } else {
    const a = p.dh,
      b = (-p.temperature * p.ds) / 1000,
      max = Math.max(100, Math.abs(a), Math.abs(b), Math.abs(r.values.dg));
    line(120, 185, 680, 185, "#657786", 1, true);
    [a, b, r.values.dg].forEach((v, i) => {
      const x = 165 + i * 210,
        h = (Math.abs(v) / max) * 110,
        color = i === 2 ? mint : i === 0 ? warm : cool;
      box(
        x - 50,
        v >= 0 ? 185 - h : 185,
        100,
        Math.max(2, h),
        color + "30",
        6,
        color,
      );
      text(["ΔH", "−TΔS", "ΔG"][i], x, 342, 15, color);
      text(`${v.toFixed(1)} kJ/mol`, x, v >= 0 ? 165 - h : 212 + h, 15, color);
    });
    text("GANHO DE ENERGIA LIVRE", 400, 35, 11);
    text("0", 100, 190, 12);
    text("PERDA DE ENERGIA LIVRE", 400, 365, 10);
  }
}
