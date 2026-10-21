import {
  boundaryTemperature,
  gasProcess,
  gibbs,
  heatEngine,
  internalEnergy,
  materials,
  mixing,
  reactions,
  sensibleTemperature,
  waterState,
  hessPath,
  unknownMetals,
  mixTemperature,
  inferSpecificHeat,
} from "./physics.ts";
import type { GasProcess } from "./physics.ts";
export type Mode =
  | "boundaries"
  | "phase"
  | "heat"
  | "mix"
  | "process"
  | "first"
  | "second"
  | "enthalpy"
  | "gibbs"
  | "hess"
  | "identify";
export type Params = Record<string, number>;
export interface Control {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  options?: readonly string[];
}
export interface Experiment {
  id: Mode;
  number: string;
  name: string;
  title: string;
  subtitle: string;
  icon: string;
  group: string;
  defaults: Params;
  controls: Control[];
  presets: { name: string; values: Params }[];
  formula: string;
  model: string;
  question: string;
  choices: string[];
  correct: number;
  explanation: string;
  duration: number;
}
const range = (
  key: string,
  label: string,
  min: number,
  max: number,
  step: number,
  unit: string,
): Control => ({ key, label, min, max, step, unit });
const select = (
  key: string,
  label: string,
  options: readonly string[],
): Control => ({
  key,
  label,
  min: 0,
  max: options.length - 1,
  step: 1,
  unit: "",
  options,
});
export const experiments: Experiment[] = [
  {
    id: "boundaries",
    number: "01",
    name: "Sistemas e fronteiras",
    title: "Onde termina o seu sistema?",
    subtitle: "Mude a fronteira. Descubra o que pode atravessá-la.",
    icon: "boundary",
    group: "OBSERVAR",
    defaults: { kind: 1, mass: 200, initial: 80, ambient: 20 },
    controls: [
      select("kind", "Tipo de sistema", ["Aberto", "Fechado", "Isolado"]),
      range("mass", "Massa no recipiente", 100, 500, 50, "g"),
      range("initial", "Temperatura inicial", 30, 90, 5, "°C"),
      range("ambient", "Temperatura externa", 10, 30, 5, "°C"),
    ],
    presets: [
      { name: "Copo aberto", values: { kind: 0 } },
      { name: "Garrafa ideal", values: { kind: 2 } },
    ],
    formula: "ΔU = Q + energia transportada",
    model:
      "Tanque de água bem misturado. Aberto: entram e saem 0,5 g/s à temperatura externa. Fechado: só há condução (1,8 W/K). Isolado: nenhuma troca. Volume constante, sem trabalho.",
    question: "Um sistema fechado pode trocar calor?",
    choices: [
      "Sim, mas não matéria.",
      "Não, nenhuma troca é possível.",
      "Só se perder massa.",
    ],
    correct: 0,
    explanation:
      "Fechado impede a passagem de matéria, mas permite energia. Isolado impede ambas.",
    duration: 600,
  },
  {
    id: "phase",
    number: "02",
    name: "Mudanças de estado",
    title: "A pausa que transforma tudo.",
    subtitle: "Por que a temperatura para de subir quando a água recebe calor?",
    icon: "drop",
    group: "OBSERVAR",
    defaults: { mass: 100, power: 1500 },
    controls: [
      range("mass", "Massa de água", 50, 300, 10, "g"),
      range("power", "Potência térmica", 500, 3000, 100, "W"),
    ],
    presets: [
      { name: "Pouca água", values: { mass: 50 } },
      { name: "Mais inércia", values: { mass: 300 } },
    ],
    formula: "Q = m · c · ΔT  ou  Q = m · L",
    model:
      "Água pura a 1 atm, de −20 °C até vapor a 120 °C. c(gelo)=2,1; c(água)=4,18; c(vapor)=2,0 J/(g·K). Lf=334 e Lv=2256 J/g. Sem perdas. Inverta o tempo para observar o caminho de resfriamento.",
    question: "Durante a ebulição a 1 atm, a energia recebida…",
    choices: [
      "Aumenta a temperatura acima de 100 °C.",
      "É usada na mudança de estado.",
      "Desaparece do sistema.",
    ],
    correct: 1,
    explanation:
      "Enquanto líquido e vapor coexistem a pressão constante, a energia é calor latente: altera a fase, sem elevar a temperatura.",
    duration: 1,
  },
  {
    id: "heat",
    number: "03",
    name: "Calor × temperatura",
    title: "Mesmo calor. Destinos diferentes.",
    subtitle: "Água e metal recebem a mesma energia. Quem se aquece mais?",
    icon: "thermo",
    group: "OBSERVAR",
    defaults: { material: 1, mass: 200, energy: 5 },
    controls: [
      select("material", "Material de comparação", [
        "Água",
        "Cobre",
        "Alumínio",
      ]),
      range("mass", "Massa de cada amostra", 100, 500, 50, "g"),
      range("energy", "Energia para cada amostra", 1, 10, 1, "kJ"),
    ],
    presets: [
      { name: "Água × cobre", values: { material: 1 } },
      { name: "Água × alumínio", values: { material: 2 } },
    ],
    formula: "ΔT = Q / (m · c)",
    model:
      "Duas amostras inicialmente a 20 °C, mesma massa e mesmo calor recebido. Calores específicos constantes. Sem mudança de estado ou perdas. Calor é energia em trânsito; temperatura caracteriza o estado térmico.",
    question: "À mesma temperatura, dois corpos têm a mesma energia interna?",
    choices: ["Sempre.", "Só se tiverem a mesma cor.", "Não necessariamente."],
    correct: 2,
    explanation:
      "A energia interna também depende da quantidade e composição da matéria. Temperatura não mede a energia total de um corpo.",
    duration: 10,
  },
  {
    id: "mix",
    number: "04",
    name: "Calorimetria",
    title: "O encontro de duas temperaturas.",
    subtitle:
      "Duas amostras. Uma troca invisível. Um equilíbrio que você pode prever.",
    icon: "mix",
    group: "EXPERIMENTAR",
    defaults: { hotMass: 150, hotT: 80, coldMass: 200, coldT: 20, capacity: 0 },
    controls: [
      range("hotT", "Água quente", 50, 90, 5, "°C"),
      range("coldT", "Água fria", 10, 40, 5, "°C"),
      range("hotMass", "Massa quente", 50, 400, 25, "g"),
      range("coldMass", "Massa fria", 50, 400, 25, "g"),
      range("capacity", "Capacidade do calorímetro", 0, 300, 50, "J/K"),
    ],
    presets: [
      {
        name: "Massas iguais",
        values: { hotMass: 200, coldMass: 200, capacity: 0 },
      },
      { name: "Copo absorve calor", values: { capacity: 300 } },
    ],
    formula: "Qquente + Qfria + Qcopo = 0",
    model:
      "Conjunto isolado, sem mudança de fase. Calorímetro inicialmente à temperatura fria. A evolução representa uma troca ideal ilustrativa; o equilíbrio e a conservação da energia são calculados. As câmaras representam parcelas da mistura.",
    question: "Com massas iguais a 80 °C e 20 °C e copo ideal, o equilíbrio é…",
    choices: ["50 °C.", "60 °C.", "100 °C."],
    correct: 0,
    explanation:
      "Com a mesma substância, massas iguais e copo sem capacidade térmica, o equilíbrio é a média: (80 + 20)/2 = 50 °C.",
    duration: 12,
  },
  {
    id: "process",
    number: "05",
    name: "Processos térmicos",
    title: "O caminho também importa.",
    subtitle:
      "Comprima um gás e compare quatro maneiras de transformar seu estado.",
    icon: "piston",
    group: "EXPERIMENTAR",
    defaults: { process: 0, ratio: 1.8, temperature: 450 },
    controls: [
      select("process", "Transformação", [
        "Isotérmica",
        "Isocórica",
        "Isobárica",
        "Adiabática",
      ]),
      range("ratio", "Volume final / inicial", 0.5, 2.5, 0.1, "×"),
      range("temperature", "T final (isocórica)", 200, 700, 25, "K"),
    ],
    presets: [
      { name: "Comprimir sem calor", values: { process: 3, ratio: 0.5 } },
      { name: "Expandir a T constante", values: { process: 0, ratio: 2 } },
    ],
    formula: "pV = nRT   ·   ΔU = nCvΔT",
    model:
      "1 mol de gás ideal monoatômico, inicialmente a 300 K e 100 kPa; Cv=3R/2. Processos quase estáticos reversíveis. Na isocórica só T final atua; nos outros casos atua a razão de volumes. W é trabalho sobre o gás.",
    question: "Na expansão isotérmica de um gás ideal, ΔU é…",
    choices: [
      "Positivo, pois entra calor.",
      "Zero, porque T é constante.",
      "Igual à pressão.",
    ],
    correct: 1,
    explanation:
      "A energia interna de um gás ideal depende da temperatura. Na isotérmica, Q = −W e ΔU = 0.",
    duration: 10,
  },
  {
    id: "first",
    number: "06",
    name: "Primeira lei",
    title: "A energia fecha a conta.",
    subtitle: "Siga cada joule entre calor, trabalho e energia interna.",
    icon: "energy",
    group: "EXPERIMENTAR",
    defaults: { q: 40, w: -15 },
    controls: [
      range("q", "Calor recebido pelo sistema", -100, 100, 5, "kJ"),
      range("w", "Trabalho sobre o sistema", -100, 100, 5, "kJ"),
    ],
    presets: [
      { name: "Só compressão", values: { q: 0, w: 50 } },
      { name: "Balanço zero", values: { q: 40, w: -40 } },
    ],
    formula: "ΔU = Q + W",
    model:
      "Sistema fechado. Q>0: calor entra. W>0: trabalho é realizado sobre o sistema; W<0: o sistema realiza trabalho. O balanço não define temperatura ou volume sem uma equação de estado.",
    question: "O sistema recebe 40 kJ e realiza 15 kJ de trabalho. ΔU vale…",
    choices: ["55 kJ.", "−25 kJ.", "25 kJ."],
    correct: 2,
    explanation:
      "O trabalho realizado pelo sistema é W = −15 kJ. Assim, ΔU = 40 − 15 = 25 kJ.",
    duration: 8,
  },
  {
    id: "second",
    number: "07",
    name: "Segunda lei",
    title: "Por que nem todo calor vira trabalho?",
    subtitle: "Construa uma máquina térmica e encontre o limite de Carnot.",
    icon: "engine",
    group: "CONECTAR",
    defaults: { hot: 600, cold: 300, quality: 70, input: 10 },
    controls: [
      range("hot", "Fonte quente", 450, 900, 25, "K"),
      range("cold", "Fonte fria", 200, 400, 25, "K"),
      range("quality", "Fração do limite de Carnot", 10, 100, 5, "%"),
      range("input", "Calor recebido por ciclo", 5, 30, 5, "kJ"),
    ],
    presets: [
      { name: "Máquina real", values: { quality: 70 } },
      { name: "Limite reversível", values: { quality: 100 } },
    ],
    formula: "η ≤ 1 − Tfria / Tquente",
    model:
      "Máquina cíclica entre reservatórios de temperatura constante em kelvin. Wsaída=Qquente−Qfria. ΔSmáquina=0 por ciclo; ΔSuniverso=Qfria/Tfria−Qquente/Tquente ≥ 0. Sem perdas adicionais além da irreversibilidade ajustada.",
    question:
      "Uma máquina entre 600 K e 300 K pode converter 100% do calor em trabalho?",
    choices: [
      "Não: o limite é 50%.",
      "Sim, se receber mais calor.",
      "Sim, com um ciclo mais rápido.",
    ],
    correct: 0,
    explanation:
      "O limite de Carnot é 1 − 300/600 = 0,5. Uma parte do calor necessariamente vai para a fonte fria.",
    duration: 8,
  },
  {
    id: "enthalpy",
    number: "08",
    name: "Entalpia e combustão",
    title: "A química deixa uma assinatura térmica.",
    subtitle: "Conecte a transformação química ao calor medido na água.",
    icon: "flame",
    group: "CONECTAR",
    defaults: { reaction: 0, amount: 0.02, water: 250 },
    controls: [
      select(
        "reaction",
        "Reação",
        reactions.map((r) => r.name),
      ),
      range("amount", "Quantidade de reação", 0.005, 0.03, 0.005, "mol"),
      range("water", "Água no calorímetro", 200, 600, 50, "g"),
    ],
    presets: [
      { name: "Queimar metano", values: { reaction: 0 } },
      { name: "Absorver energia", values: { reaction: 2 } },
    ],
    formula: "Qp = n · ΔH   ·   Qbanho = −Qp",
    model:
      "Balanço ideal a pressão constante. Banho inicia a 25 °C, sem perdas ou capacidade térmica do recipiente. ΔH constante. O avanço não representa cinética; CaCO₃ exige alta temperatura real. A temperatura do banho não é a da reação.",
    question: "Em uma combustão exotérmica, o sinal de ΔH é…",
    choices: ["Positivo.", "Negativo.", "Sempre zero."],
    correct: 1,
    explanation:
      "A entalpia dos produtos é menor que a dos reagentes. O sistema químico libera calor: ΔH < 0.",
    duration: 8,
  },
  {
    id: "gibbs",
    number: "09",
    name: "Energia livre de Gibbs",
    title: "A reação vai acontecer?",
    subtitle: "Explore a disputa entre entalpia, entropia e temperatura.",
    icon: "spark",
    group: "CONECTAR",
    defaults: { dh: 40, ds: 100, temperature: 300 },
    controls: [
      range("dh", "Variação de entalpia", -100, 100, 5, "kJ/mol"),
      range("ds", "Variação de entropia", -200, 200, 10, "J/(mol·K)"),
      range("temperature", "Temperatura", 200, 900, 10, "K"),
    ],
    presets: [
      { name: "Calor favorece", values: { dh: 40, ds: 100, temperature: 600 } },
      {
        name: "Frio favorece",
        values: { dh: -40, ds: -100, temperature: 250 },
      },
    ],
    formula: "ΔG = ΔH − T · ΔS",
    model:
      "Transformação hipotética a T e p constantes; ΔH e ΔS independentes de T nesta faixa. ΔG<0 favorece o sentido direto; ΔG=0 indica equilíbrio para as condições consideradas. Favorabilidade termodinâmica não determina velocidade.",
    question: "Se ΔG < 0, a transformação é necessariamente rápida?",
    choices: [
      "Sim, sempre instantânea.",
      "Só se ΔH também for negativo.",
      "Não: a cinética depende da barreira de ativação.",
    ],
    correct: 2,
    explanation:
      "Gibbs indica favorabilidade termodinâmica. A velocidade depende do mecanismo e da energia de ativação; uma transformação favorável pode ser muito lenta.",
    duration: 1,
  },
];
experiments.push(
  {
    id: "identify",
    number: "10",
    name: "Amostra desconhecida",
    title: "Que metal está na sua bancada?",
    subtitle:
      "Use a calorimetria para transformar uma temperatura em uma identificação.",
    icon: "thermo",
    group: "INVESTIGAR",
    defaults: {
      sample: 0,
      metalMass: 150,
      metalT: 80,
      waterMass: 200,
      waterT: 20,
      capacity: 50,
    },
    controls: [
      select("sample", "Amostra codificada", [
        "Amostra A",
        "Amostra B",
        "Amostra C",
      ]),
      range("metalMass", "Massa do metal", 50, 300, 25, "g"),
      range("metalT", "Temperatura inicial do metal", 60, 95, 5, "°C"),
      range("waterMass", "Massa da água", 100, 400, 25, "g"),
      range("waterT", "Temperatura inicial da água", 15, 30, 5, "°C"),
      range("capacity", "Capacidade do calorímetro", 0, 150, 25, "J/K"),
    ],
    presets: [
      { name: "Amostra A", values: { sample: 0 } },
      { name: "Amostra B", values: { sample: 1 } },
    ],
    formula:
      "cmetal = (mágua · cágua + C) · (Tf − Tágua) / [mmetal · (Tmetal − Tf)]",
    model:
      "Metal inicialmente quente em contato com água fria, em calorímetro isolado. Sem perdas, trabalho ou mudança de fase; calorímetro inicia na temperatura da água. c é constante. Amostras ideais: cobre 0,385, alumínio 0,897 e ferro 0,449 J/(g·K). A evolução é ilustrativa e conserva energia. A identificação usa o equilíbrio, não uma leitura intermediária.",
    question:
      "Para determinar o calor específico, em qual instante devemos usar a temperatura da mistura?",
    choices: [
      "Assim que o metal toca a água.",
      "Quando metal e água atingem equilíbrio térmico.",
      "Antes de colocar o metal.",
    ],
    correct: 1,
    explanation:
      "A equação usa uma única temperatura final para metal, água e calorímetro. Isso só é válido no equilíbrio.",
    duration: 12,
  },
  {
    id: "hess",
    number: "11",
    name: "Lei de Hess",
    title: "Dois caminhos. A mesma chegada.",
    subtitle:
      "Some etapas, inverta a reação e descubra por que a entalpia é função de estado.",
    icon: "energy",
    group: "INVESTIGAR",
    defaults: { amount: 1, path: 1, reverse: 0 },
    controls: [
      select("path", "Caminho da reação", [
        "Direto: carbono → CO₂",
        "Em etapas: carbono → CO → CO₂",
      ]),
      select("reverse", "Sentido", ["Formação de CO₂", "Reação inversa"]),
      range("amount", "Quantidade de carbono", 0.5, 3, 0.5, "mol"),
    ],
    presets: [
      { name: "Caminho direto", values: { path: 0, reverse: 0 } },
      { name: "Inverter as etapas", values: { path: 1, reverse: 1 } },
    ],
    formula: "ΔHtotal = Σ ΔHetapas",
    model:
      "Entalpias de referência: C(grafite) + ½O₂(g) → CO(g), ΔH = −110,5 kJ/mol; CO(g) + ½O₂(g) → CO₂(g), ΔH = −283,0 kJ/mol. Soma: C(grafite) + O₂(g) → CO₂(g), ΔH = −393,5 kJ/mol. Inverta também a ordem das etapas na reação inversa. O avanço é uma coordenada de percurso, não uma cinética nem uma previsão de espontaneidade.",
    question: "Ao inverter uma equação termoquímica, o que acontece com ΔH?",
    choices: ["Mantém o sinal.", "Vira zero.", "Inverte o sinal."],
    correct: 2,
    explanation:
      "A reação inversa liga os mesmos estados em sentido oposto. Por isso, ΔHinversa = −ΔHdireta; multiplicar a equação também multiplica sua entalpia.",
    duration: 10,
  },
);

export interface Metric {
  label: string;
  value: number;
  unit: string;
  color?: string;
}
export interface Result {
  metrics: [Metric, Metric, Metric];
  status: string;
  insight: string;
  temperatures: number[];
  values: Record<string, number>;
  plotValue: number;
}
const metric = (
  label: string,
  value: number,
  unit: string,
  color?: string,
): Metric => ({ label, value, unit, color });
export function evaluate(id: Mode, p: Params, t: number): Result {
  const f = Math.max(0, Math.min(1, t));
  let metrics: Result["metrics"],
    status = "",
    insight = "",
    temperatures: number[] = [],
    values: Record<string, number> = {},
    plotValue = 0;
  if (id === "identify") {
    const metal = unknownMetals[p.sample],
      eq = mixTemperature(
        p.metalMass,
        metal.c,
        p.metalT,
        p.waterMass,
        4.18,
        p.waterT,
        p.capacity,
      ),
      hot = p.metalT + (eq - p.metalT) * f,
      cold = p.waterT + (eq - p.waterT) * f,
      qWater = p.waterMass * 4.18 * (cold - p.waterT),
      qCup = p.capacity * (cold - p.waterT),
      qMetal = p.metalMass * metal.c * (hot - p.metalT);
    temperatures = [hot, cold];
    values = {
      eq,
      hot,
      cold,
      qWater,
      qCup,
      qMetal,
      c: inferSpecificHeat(
        p.metalMass,
        p.metalT,
        p.waterMass,
        p.waterT,
        eq,
        p.capacity,
      ),
    };
    metrics = [
      metric("Temperatura do metal", hot, "°C", "warm"),
      metric("Temperatura da água", cold, "°C", "cool"),
      metric("Calor recebido pela água", qWater / 1000, "kJ"),
    ];
    status =
      f === 1 ? "EQUILÍBRIO · AMOSTRA IDENTIFICADA" : "AGUARDANDO EQUILÍBRIO";
    insight =
      f === 1
        ? `O calor específico calculado é ${values.c.toFixed(3)} J/(g·K), compatível com ${metal.name.toLowerCase()} na tabela de referência.`
        : "Meça as massas e temperaturas iniciais. Depois, espere as duas temperaturas coincidirem para calcular o calor específico do metal.";
    plotValue = hot;
  } else if (id === "hess") {
    const r = hessPath(p.amount, !!p.reverse, !!p.path, f);
    values = { ...r };
    metrics = [
      metric("ΔH do percurso realizado", r.q, "kJ"),
      metric("ΔH total previsto", r.total, "kJ"),
      metric("Quantidade de reação", p.amount, "mol"),
    ];
    status = p.reverse
      ? "REAÇÃO INVERSA"
      : p.path
        ? "SOMA DAS ETAPAS"
        : "CAMINHO DIRETO";
    insight = `${p.reverse ? "Ao inverter o sentido, o sinal da entalpia muda." : "A soma das duas etapas é igual ao caminho direto."} Para ${p.amount} mol, ΔH total = ${r.total.toFixed(1)} kJ. O valor depende dos estados inicial e final.`;
    plotValue = r.q;
  } else if (id === "boundaries") {
    const r = boundaryTemperature(
      p.kind,
      p.mass,
      p.initial,
      p.ambient,
      f * 600,
    );
    temperatures = [r.temperature, p.ambient];
    values = { ...r };
    metrics = [
      metric("Temperatura interna", r.temperature, "°C"),
      metric("Calor trocado", r.q / 1000, "kJ"),
      metric("Massa que atravessou", r.massPassed, "g"),
    ];
    status = ["ABERTO", "FECHADO", "ISOLADO"][p.kind];
    insight =
      p.kind === 2
        ? "A fronteira bloqueia calor e matéria. A temperatura permanece constante."
        : p.kind === 0
          ? "A água de entrada transporta energia. A massa total permanece constante porque a vazão de saída é igual à de entrada."
          : "A matéria fica no recipiente. Mesmo assim, a energia cruza a fronteira como calor.";
    plotValue = r.temperature;
  } else if (id === "phase") {
    const energy = p.mass * 3.09 * f,
      r = waterState(p.mass, energy);
    temperatures = [r.temperature];
    values = {
      energy,
      phaseProgress: r.progress,
      seconds: (energy * 1000) / p.power,
    };
    metrics = [
      metric("Temperatura", r.temperature, "°C"),
      metric("Energia recebida", energy, "kJ"),
      metric("Tempo físico", values.seconds, "s"),
    ];
    status = r.phase.toUpperCase();
    insight =
      r.phase === "Fusão" || r.phase === "Ebulição"
        ? `A temperatura fica em ${r.temperature} °C. A energia transforma a fase; ${Math.round(r.progress * 100)}% desta mudança já ocorreu.`
        : "Fora dos patamares, a energia aumenta a agitação térmica. Massa maior exige mais energia para a mesma variação de temperatura.";
    plotValue = r.temperature;
  } else if (id === "heat") {
    const material = materials[p.material],
      qa = p.energy * 1000 * f,
      a = sensibleTemperature(p.mass, 4.18, qa),
      b = sensibleTemperature(p.mass, material.c, qa);
    temperatures = [a, b];
    metrics = [
      metric("Temperatura da água", a, "°C"),
      metric(`Temperatura: ${material.name.toLowerCase()}`, b, "°C"),
      metric("Calor para cada amostra", qa / 1000, "kJ"),
    ];
    status = "MESMA ENERGIA";
    insight = `O calor específico ${p.material === 0 ? "é igual nas duas amostras" : "do " + material.name.toLowerCase() + " é menor que o da água"}. Mesma massa e mesmo calor ${p.material === 0 ? "produzem a mesma" : "não significam a mesma"} temperatura.`;
    plotValue = b;
    values = { energy: qa };
  } else if (id === "mix") {
    const r = mixing(p.hotMass, p.hotT, p.coldMass, p.coldT, p.capacity, f);
    temperatures = [r.hot, r.cold];
    values = { ...r };
    metrics = [
      metric("Amostra quente", r.hot, "°C", "warm"),
      metric("Amostra fria", r.cold, "°C", "cool"),
      metric("Equilíbrio previsto", r.eq, "°C"),
    ];
    status = f === 1 ? "EQUILÍBRIO TÉRMICO" : "ENERGIA EM TRÂNSITO";
    insight =
      f === 1
        ? `As temperaturas se igualaram. A amostra quente cedeu ${(-r.qHot / 1000).toFixed(2)} kJ, distribuídos entre a água fria e o recipiente.`
        : p.capacity
          ? "O calorímetro também absorve energia. Por isso, a temperatura final fica menor que a de um recipiente ideal."
          : "O calor flui da amostra mais quente para a mais fria. A energia total do conjunto isolado se conserva.";
    plotValue = r.hot;
  } else if (id === "process") {
    const names: GasProcess[] = [
      "isothermal",
      "isochoric",
      "isobaric",
      "adiabatic",
    ];
    const r = gasProcess(
      names[p.process],
      1 + (p.ratio - 1) * f,
      300 + (p.temperature - 300) * f,
    );
    values = { ...r };
    temperatures = [r.temperature - 273.15];
    metrics = [
      metric("Pressão", r.pressure, "kPa"),
      metric("Temperatura", r.temperature, "K"),
      metric("Volume", r.volume, "L"),
    ];
    status = ["T CONSTANTE", "V CONSTANTE", "p CONSTANTE", "Q = 0"][p.process];
    insight = `Q = ${r.q.toFixed(2)} kJ; W sobre o gás = ${r.w.toFixed(2)} kJ; ΔU = ${r.du.toFixed(2)} kJ. ${p.process === 3 ? "Sem calor atravessando a fronteira, o trabalho altera a temperatura." : p.process === 0 ? "O calor compensa o trabalho e mantém a temperatura." : "A trajetória determina como a energia é transferida."}`;
    plotValue = r.pressure;
  } else if (id === "first") {
    const q = p.q * f,
      w = p.w * f,
      u = internalEnergy(q, w);
    values = { q, w, u };
    metrics = [
      metric("Calor Q", q, "kJ"),
      metric("Trabalho W", w, "kJ"),
      metric("Variação ΔU", u, "kJ"),
    ];
    status =
      Math.abs(u) < 0.001
        ? "BALANÇO ZERO"
        : u > 0
          ? "ENERGIA INTERNA AUMENTA"
          : "ENERGIA INTERNA DIMINUI";
    insight =
      "Cada transferência tem um sinal. O sistema ganha energia quando recebe calor ou quando o ambiente realiza trabalho sobre ele.";
    plotValue = u;
  } else if (id === "second") {
    const r = heatEngine(p.hot, p.cold, p.quality / 100, p.input);
    values = {
      ...r,
      input: p.input * f,
      work: r.work * f,
      rejected: r.rejected * f,
      entropy: r.entropy * f,
    };
    metrics = [
      metric("Eficiência", r.efficiency * 100, "%"),
      metric("Trabalho produzido", r.work * f, "kJ"),
      metric("ΔS do universo", r.entropy * f, "J/K"),
    ];
    status = p.quality === 100 ? "LIMITE REVERSÍVEL" : "PROCESSO IRREVERSÍVEL";
    insight = `O limite de Carnot é ${(r.carnot * 100).toFixed(1)}%. ${p.quality === 100 ? "No limite reversível, a entropia total não aumenta." : "Na máquina irreversível, a entropia total aumenta."} O calor rejeitado não pode ser eliminado.`;
    plotValue = r.work * f;
  } else if (id === "enthalpy") {
    const r = reactions[p.reaction],
      q = -r.dh * p.amount * f,
      temp = 25 + (q * 1000) / (p.water * 4.18);
    values = { q, dh: r.dh, temperature: temp };
    temperatures = [temp];
    metrics = [
      metric("ΔH molar", r.dh, "kJ/mol"),
      metric("Calor no banho", q, "kJ"),
      metric("Temperatura do banho", temp, "°C"),
    ];
    status = r.dh < 0 ? "EXOTÉRMICA" : "ENDOTÉRMICA";
    insight = `${r.equation}. ${r.dh < 0 ? "A entalpia liberada pela reação aquece a água do calorímetro." : "A reação absorve energia; no balanço ideal, o banho cede calor."}`;
    plotValue = temp;
  } else {
    const dg = gibbs(p.dh, p.ds, p.temperature);
    values = { dg, threshold: p.ds === 0 ? NaN : (p.dh * 1000) / p.ds };
    metrics = [
      metric("ΔH", p.dh, "kJ/mol"),
      metric("T · ΔS", (p.temperature * p.ds) / 1000, "kJ/mol"),
      metric("ΔG", dg, "kJ/mol"),
    ];
    status =
      Math.abs(dg) < 0.001
        ? "EQUILÍBRIO"
        : dg < 0
          ? "SENTIDO DIRETO FAVORECIDO"
          : "SENTIDO INVERSO FAVORECIDO";
    insight =
      Math.abs(dg) < 0.001
        ? "As contribuições se compensam: ΔG = 0. A transformação está no limiar entre os sentidos favorecidos."
        : `${dg < 0 ? "A transformação direta é termodinamicamente favorável" : "A transformação direta não é favorecida"} nestas condições. Isso não informa se ela acontece rapidamente.`;
    plotValue = dg;
  }
  return { metrics, status, insight, temperatures, values, plotValue };
}
export function getExperiment(id: Mode) {
  return experiments.find((e) => e.id === id)!;
}
