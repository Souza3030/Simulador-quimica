import { evaluate } from "./experiments.ts";
import type { Mode, Params } from "./experiments.ts";
import {
  gasProcess,
  materials,
  mixTemperature,
  unknownMetals,
  inferSpecificHeat,
  reactions,
} from "./physics.ts";

const f = (n: number, digits = 3) =>
  n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
export function parseAnswer(text: string): number | null {
  const clean = text.trim();
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(clean)) return null;
  const value = Number(clean.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}
export interface NumericChallenge {
  question: string;
  unit: string;
  answer: number;
  tolerance: number;
  hint: string;
  solution: string;
}
export function numericChallenge(mode: Mode, p: Params): NumericChallenge {
  const r = evaluate(mode, p, 1),
    v = r.values;
  const tasks: Record<Mode, () => [string, string, number, string]> = {
    boundaries: () => [
      "Qual será a temperatura do tanque após 600 s?",
      "°C",
      r.temperatures[0],
      "Use T = Tamb + (Ti − Tamb) exp[−(UA + ṁc)t/(mc)]. UA = 1,8 W/K e ṁ = 0,5 g/s no aberto; ṁ = 0 no fechado; ambos zero no isolado.",
    ],
    phase: () => [
      "Quanto calor é necessário para transformar todo o gelo a −20 °C em água líquida a 0 °C?",
      "kJ",
      p.mass * 0.376,
      "Some mcgeloΔT e mLf. Use cgelo = 2,1 J/(g·K), Lf = 334 J/g e converta J para kJ.",
    ],
    heat: () => [
      "Qual é a temperatura final da amostra selecionada após receber todo o calor?",
      "°C",
      r.temperatures[1],
      "Use Tf = 20 + Q/(mc). Converta a energia de kJ para J e use o calor específico do material selecionado.",
    ],
    mix: () => [
      "Qual é a temperatura de equilíbrio, incluindo a capacidade térmica do calorímetro?",
      "°C",
      v.eq,
      "Tf = [mqcTq + (mfc + C)Tf inicial]/[mqc + mfc + C], com c = 4,18 J/(g·K). O calorímetro começa na temperatura fria.",
    ],
    process: () => [
      "Qual será a pressão final do gás neste processo?",
      "kPa",
      v.pressure,
      "Use pV = nRT: n = 1 mol e R = 8,314462618 kPa·L/(mol·K). Primeiro determine T e V finais pela restrição do processo.",
    ],
    first: () => [
      "Qual é a variação total da energia interna?",
      "kJ",
      p.q + p.w,
      "Use ΔU = Q + W. Aqui W é o trabalho SOBRE o sistema: compressão positiva, expansão negativa.",
    ],
    second: () => [
      "Qual é o rendimento real da máquina em porcentagem?",
      "%",
      v.efficiency * 100,
      "η = (qualidade/100)(1 − Tfria/Tquente). Use temperaturas em kelvin e multiplique η por 100 para obter %.",
    ],
    enthalpy: () => [
      "Quanto calor o banho recebe ao final da reação? Inclua o sinal.",
      "kJ",
      -reactions[p.reaction].dh * p.amount,
      "Qbanho = −nΔHreação. Uma reação exotérmica aquece o banho; uma endotérmica retira calor dele.",
    ],
    gibbs: () => [
      "Qual é a energia livre de Gibbs molar nestas condições?",
      "kJ/mol",
      p.dh - (p.temperature * p.ds) / 1000,
      "ΔG = ΔH − TΔS. Divida ΔS por 1000 para compatibilizar J e kJ. T deve estar em kelvin.",
    ],
    identify: () => [
      `No equilíbrio ideal, Tf = ${f(v.eq, 6)} °C. Determine o calor específico do metal, incluindo o calorímetro.`,
      "J/(g·K)",
      unknownMetals[p.sample].c,
      "cmetal = (mágua·4,18 + C)(Tf − Tágua)/[mmetal(Tmetal − Tf)]. Use a temperatura de equilíbrio fornecida.",
    ],
    hess: () => [
      "Qual é a variação total de entalpia para a quantidade e o sentido selecionados?",
      "kJ",
      v.total,
      "Some as entalpias das etapas, multiplique pela quantidade em mol e inverta todos os sinais quando inverter a reação.",
    ],
  };
  const [question, unit, answer, hint] = tasks[mode]();
  const tolerance = mode === "identify" ? 0.002 : 0.05;
  return {
    question,
    unit,
    answer,
    tolerance,
    hint,
    solution: `${hint} Resultado: ${f(answer, 4)} ${unit}.`,
  };
}
export function acceptsAnswer(task: NumericChallenge, answer: number) {
  return (
    Number.isFinite(answer) && Math.abs(answer - task.answer) <= task.tolerance
  );
}

/** Only quantization of equilibrium T; all other inputs treated as exact. */
export function metalUncertainty(p: Params, resolution: number) {
  if (!Number.isFinite(resolution) || resolution <= 0)
    throw new RangeError("Resolução inválida.");
  const trueT = mixTemperature(
    p.metalMass,
    unknownMetals[p.sample].c,
    p.metalT,
    p.waterMass,
    4.18,
    p.waterT,
    p.capacity,
  );
  const measured = Math.round(trueT / resolution) * resolution;
  const loT = measured - resolution / 2,
    hiT = measured + resolution / 2;
  const infer = (t: number) =>
    inferSpecificHeat(
      p.metalMass,
      p.metalT,
      p.waterMass,
      p.waterT,
      t,
      p.capacity,
    );
  const low = loT <= p.waterT ? 0 : infer(loT);
  const high = hiT >= p.metalT ? null : infer(hiT);
  const estimate =
    measured > p.waterT && measured < p.metalT ? infer(measured) : null;
  const candidates = unknownMetals
    .filter((m) => m.c >= low - 1e-10 && (high === null || m.c <= high + 1e-10))
    .map((m) => m.name);
  return { trueT, measured, loT, hiT, low, high, estimate, candidates };
}
export function phaseStages(mass: number, power: number) {
  let accumulated = 0;
  return [
    "Aquecer gelo: −20 → 0 °C",
    "Fundir gelo: 0 °C",
    "Aquecer água: 0 → 100 °C",
    "Vaporizar água: 100 °C",
    "Aquecer vapor: 100 → 120 °C",
  ].map((name, i) => {
    const energy = mass * [0.042, 0.334, 0.418, 2.256, 0.04][i];
    const midpoint = (accumulated + energy / 2) / (mass * 3.09);
    accumulated += energy;
    return { name, energy, seconds: (energy * 1000) / power, midpoint };
  });
}
export interface Analysis {
  title: string;
  intro: string;
  headers: string[];
  rows: string[][];
  conclusion: string;
  prompt: string;
}
export function analysis(mode: Mode, p: Params, resolution = 0.1): Analysis {
  const v = evaluate(mode, p, 1).values;
  switch (mode) {
    case "boundaries": {
      const k = p.kind === 2 ? 0 : 1.8 + (p.kind === 0 ? 0.5 * 4.18 : 0);
      return {
        title: "A fronteira determina a velocidade da troca",
        intro:
          "Compare a taxa inicial com o tempo necessário para reduzir pela metade a diferença de temperatura em relação ao ambiente.",
        headers: ["Grandeza", "Previsão do modelo"],
        rows: [
          ["Capacidade térmica do conteúdo", `${f(p.mass * 4.18)} J/K`],
          ["Condutância térmica + transporte por fluxo", `${f(k)} W/K`],
          [
            "Constante de tempo τ = mc/(UA + ṁc)",
            k ? `${f((p.mass * 4.18) / k)} s` : "Sem relaxação térmica",
          ],
          [
            "Tempo de meia diferença: τ ln 2",
            k ? `${f(((p.mass * 4.18) / k) * Math.LN2)} s` : "Não atinge",
          ],
          [
            "Potência inicial de entrada líquida",
            `${f(k * (p.ambient - p.initial))} W`,
          ],
        ],
        conclusion:
          "O tanque aberto mantém a massa constante porque entrada e saída se compensam. A matéria que atravessa a fronteira transporta entalpia, além do calor transmitido pela parede. No isolado, ambas as trocas são nulas.",
        prompt:
          "Dobre a massa mantendo as temperaturas. O tempo de meia diferença dobra? Teste aberto e fechado.",
      };
    }
    case "phase":
      return {
        title: "Para onde vai cada joule?",
        intro:
          "Orçamento completo de energia para água pura a 1 atm, sem perdas. Os tempos são físicos; a animação usa reprodução acelerada.",
        headers: ["Etapa", "Energia (kJ)", "Tempo (s)"],
        rows: phaseStages(p.mass, p.power).map((s) => [
          s.name,
          f(s.energy),
          f(s.seconds),
        ]),
        conclusion:
          "Durante fusão e ebulição, a energia altera a proporção das fases, mantendo a temperatura constante. A vaporização exige muito mais energia que o aquecimento sensível da mesma massa.",
        prompt:
          "Dobre a potência: quais colunas mudam? Depois dobre a massa. Use os atalhos abaixo para observar o meio de cada etapa.",
      };
    case "heat":
      return {
        title: "Mesma energia, respostas diferentes",
        intro:
          "Todas as amostras abaixo têm a massa escolhida, começam a 20 °C e recebem a mesma quantidade de calor.",
        headers: [
          "Material",
          "Capacidade mc (J/K)",
          "ΔT (K)",
          "Q para +10 K (kJ)",
        ],
        rows: materials.map((m) => [
          m.name,
          f(p.mass * m.c),
          f((p.energy * 1000) / (p.mass * m.c)),
          f((p.mass * m.c * 10) / 1000),
        ]),
        conclusion:
          "Calor específico caracteriza o material; capacidade térmica depende também da massa. Uma temperatura mais alta não implica maior quantidade de energia transferida.",
        prompt:
          "Que massa de cobre teria a mesma capacidade térmica da amostra de água? Use mágua·cágua = mcobre·ccobre.",
      };
    case "mix": {
      const ideal = mixTemperature(
        p.hotMass,
        4.18,
        p.hotT,
        p.coldMass,
        4.18,
        p.coldT,
      );
      return {
        title: "O calorímetro também participa",
        intro:
          "Compare duas previsões para as mesmas porções de água. O recipiente começa na temperatura da porção fria.",
        headers: ["Hipótese", "Resultado"],
        rows: [
          ["Recipiente sem capacidade térmica", `${f(ideal)} °C`],
          ["Recipiente com a capacidade escolhida", `${f(v.eq)} °C`],
          ["Desvio ao ignorar o recipiente", `${f(ideal - v.eq)} °C`],
          [
            "Energia recebida pelo recipiente",
            `${f((p.capacity * (v.eq - p.coldT)) / 1000)} kJ`,
          ],
          [
            "Peso da porção quente no balanço",
            `${f(((p.hotMass * 4.18) / (4.18 * (p.hotMass + p.coldMass) + p.capacity)) * 100)} %`,
          ],
        ],
        conclusion:
          "A média aritmética só funciona quando as capacidades térmicas dos dois lados são iguais. O recipiente desloca o equilíbrio em direção à temperatura em que ele começou.",
        prompt:
          "Ajuste massas iguais e C = 0. Depois aumente somente C: explique a direção do deslocamento sem fazer contas.",
      };
    }
    case "process":
      return {
        title: "Quatro restrições, quatro trajetórias",
        intro:
          "Gás ideal monoatômico: 1 mol, inicialmente 300 K e 100 kPa. Comparação com a mesma razão de volumes; na isocórica, o volume fica fixo e vale a temperatura escolhida.",
        headers: [
          "Processo",
          "Tf (K)",
          "pf (kPa)",
          "Q (kJ)",
          "W sobre gás (kJ)",
          "ΔU (kJ)",
        ],
        rows: (
          ["isothermal", "isochoric", "isobaric", "adiabatic"] as const
        ).map((name, i) => {
          const g = gasProcess(name, p.ratio, p.temperature);
          return [
            ["Isotérmico", "Isocórico", "Isobárico", "Adiabático"][i],
            f(g.temperature),
            f(g.pressure),
            f(g.q),
            f(g.w),
            f(g.du),
          ];
        }),
        conclusion:
          "Os estados finais desta tabela podem diferir. Para comparar caminhos entre os mesmos estados, mantenha os dois extremos iguais: ΔU será igual, mas Q e W podem variar. Na expansão, W sobre o gás é negativo.",
        prompt:
          "Compare expansão isotérmica e adiabática. Por que uma recebe calor e a outra esfria?",
      };
    case "first": {
      const u = p.q + p.w;
      return {
        title: "A mesma variação interna pode ter diferentes balanços",
        intro:
          "Exercício de contabilidade energética: os pares abaixo satisfazem a primeira lei. Sua realização física depende do sistema e das restrições.",
        headers: ["Balanço", "Q (kJ)", "W sobre sistema (kJ)", "ΔU (kJ)"],
        rows: [
          ["Sua configuração", f(p.q), f(p.w), f(u)],
          ["Sem trabalho", f(u), "0", f(u)],
          ["Sem calor", "0", f(u), f(u)],
          ["Com 10 kJ de trabalho recebido", f(u - 10), "10", f(u)],
        ],
        conclusion:
          "Q e W são transferências durante um processo; U é propriedade do estado. A primeira lei conserva energia, mas sozinha não determina se um processo ocorrerá espontaneamente.",
        prompt:
          "Construa um balanço com Q positivo e ΔU negativo. Qual deve ser o sinal e o módulo de W?",
      };
    }
    case "second":
      return {
        title: "Entropia e trabalho que deixa de ser obtido",
        intro:
          "Um ciclo completo entre reservatórios a temperaturas constantes. A máquina volta ao estado inicial; sua variação de entropia no ciclo é zero.",
        headers: ["Grandeza por ciclo", "Valor"],
        rows: [
          [
            "ΔS da fonte quente = −Qq/Tq",
            `${f((-p.input * 1000) / p.hot)} J/K`,
          ],
          [
            "ΔS da fonte fria = Qf/Tf",
            `${f((v.rejected * 1000) / p.cold)} J/K`,
          ],
          ["ΔS do universo", `${f(v.entropy)} J/K`],
          ["Trabalho máximo de Carnot", `${f(p.input * v.carnot)} kJ`],
          [
            "Trabalho perdido = Tfria·ΔSuniverso",
            `${f((p.cold * v.entropy) / 1000)} kJ`,
          ],
        ],
        conclusion:
          "Com a mesma entrada de calor e os mesmos reservatórios, a irreversibilidade reduz o trabalho útil. Qualidade de 100% representa o limite reversível de Carnot, não conversão de todo calor em trabalho.",
        prompt:
          "Mantenha as fontes constantes e varie a qualidade. Confirme Wmáx − Wreal = Tfria·ΔSuniverso.",
      };
    case "enthalpy": {
      const rows =
        p.reaction === 0
          ? [
              ["CH₄ consumido", `${f(p.amount * 16.04)} g`],
              ["CO₂ produzido", `${f(p.amount * 44.01)} g`],
              ["Energia liberada por massa de CH₄", "55,505 kJ/g"],
            ]
          : p.reaction === 1
            ? [
                ["H⁺ consumido", `${f(p.amount)} mol`],
                ["OH⁻ consumido", `${f(p.amount)} mol`],
                ["H₂O formada", `${f(p.amount * 18.015)} g`],
              ]
            : [
                ["CaCO₃ consumido", `${f(p.amount * 100.09)} g`],
                ["CaO produzido", `${f(p.amount * 56.08)} g`],
                ["CO₂ produzido", `${f(p.amount * 44.01)} g`],
              ];
      return {
        title: "Da equação química à quantidade de calor",
        intro: reactions[p.reaction].equation,
        headers: ["Quantidade estequiométrica", "Valor"],
        rows: [
          ...rows,
          [
            "ΔH da transformação",
            `${f(reactions[p.reaction].dh * p.amount)} kJ`,
          ],
          [
            "Calor recebido pelo banho",
            `${f(-reactions[p.reaction].dh * p.amount)} kJ`,
          ],
        ],
        conclusion:
          "As quantidades pressupõem conversão completa e proporções estequiométricas. Na combustão, a água formada é líquida: trata-se do poder calorífico superior. O banho é ideal, sem perdas nem capacidade térmica do recipiente; a reação não modela cinética.",
        prompt:
          "Dobre a quantidade de reagente e a massa do banho ao mesmo tempo. A variação de temperatura muda? Justifique com Q = mcΔT.",
      };
    }
    case "gibbs":
      return {
        title: "Espontaneidade vista pelo universo",
        intro:
          "Temperatura e pressão constantes; apenas trabalho de expansão. ΔH e ΔS são tratados como constantes no intervalo explorado.",
        headers: ["Contribuição molar", "Valor"],
        rows: [
          ["ΔS do sistema", `${f(p.ds)} J/(mol·K)`],
          [
            "ΔS da vizinhança = −ΔH/T",
            `${f((-p.dh * 1000) / p.temperature)} J/(mol·K)`,
          ],
          [
            "ΔS do universo = −ΔG/T",
            `${f(p.ds - (p.dh * 1000) / p.temperature)} J/(mol·K)`,
          ],
          [
            "Temperatura de mudança de sinal",
            p.ds !== 0 && (p.dh * 1000) / p.ds > 0
              ? `${f((p.dh * 1000) / p.ds)} K`
              : "Sem cruzamento em T > 0",
          ],
        ],
        conclusion:
          "ΔG negativo corresponde a ΔS do universo positivo. Isso indica direção termodinâmica favorável, não velocidade: uma reação pode precisar superar uma barreira de ativação.",
        prompt:
          "Experimente as quatro combinações de sinais de ΔH e ΔS. Em quais a temperatura pode inverter a previsão?",
      };
    case "identify": {
      const u = metalUncertainty(p, resolution);
      return {
        title: "Seu termômetro consegue distinguir os metais?",
        intro:
          "Previsão para o equilíbrio final. Arredondamos apenas Tf à resolução escolhida; massas, temperaturas iniciais, calor específico da água e capacidade do recipiente são considerados exatos.",
        headers: ["Grandeza", "Resultado"],
        rows: [
          ["Temperatura ideal de equilíbrio", `${f(u.trueT, 6)} °C`],
          ["Leitura arredondada", `${f(u.measured)} °C`],
          ["Faixa de Tf por arredondamento", `${f(u.loT)} a ${f(u.hiT)} °C`],
          [
            "Calor específico estimado",
            u.estimate === null
              ? "Leitura insuficiente para estimar"
              : `${f(u.estimate, 5)} J/(g·K)`,
          ],
          [
            "Faixa compatível de calor específico",
            `${f(u.low, 5)} a ${u.high === null ? "sem limite superior" : f(u.high, 5)} J/(g·K)`,
          ],
          ["Metais compatíveis", u.candidates.join(", ")],
        ],
        conclusion:
          "A faixa usa ± metade da resolução e a transformação não linear c(Tf). Não é intervalo de confiança: não inclui perdas térmicas, erro de calibração ou incerteza das demais medidas. Dois metais compatíveis significam que esta leitura não basta para identificar a amostra.",
        prompt:
          "Comece com 2 °C e refine a resolução. Depois reduza a massa do metal: fica mais fácil ou mais difícil distinguir cobre e ferro?",
      };
    }
    case "hess":
      return {
        title: "Cancele intermediários, conserve a entalpia",
        intro: p.reverse
          ? "Reação inversa: a ordem das etapas e todos os sinais se invertem."
          : "Mesmo estado inicial e final, por um caminho direto ou por duas etapas.",
        headers: ["Etapa para a quantidade escolhida", "ΔH (kJ)"],
        rows: [
          [p.reverse ? "CO₂ → CO + ½ O₂" : "C + ½ O₂ → CO", f(v.first)],
          [p.reverse ? "CO → C + ½ O₂" : "CO + ½ O₂ → CO₂", f(v.second)],
          [p.reverse ? "Soma: CO₂ → C + O₂" : "Soma: C + O₂ → CO₂", f(v.total)],
        ],
        conclusion:
          "O CO é formado e consumido em quantidades iguais, por isso cancela ao somar as equações. As equações mostram proporções molares; as entalpias da tabela já estão escaladas pela quantidade selecionada. O avanço da animação não representa uma cinética real.",
        prompt:
          "Inverta a reação e dobre a quantidade. Preveja o sinal e o módulo de ΔH antes de executar.",
      };
  }
}
