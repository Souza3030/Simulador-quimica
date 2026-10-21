import type { Mode, Params, Result } from "./experiments.ts";
import { materials, unknownMetals, reactions, R, CV } from "./physics.ts";
export interface Lesson {
  objective: string;
  equipment: string[];
  variable: string;
  keep: string;
  steps: [string, string, string, string];
  observe: string;
  mistake: string;
  application: string;
  extend: string;
}
export const lessons: Record<Mode, Lesson> = {
  boundaries: {
    objective:
      "Distinguir troca de matéria de troca de energia e delimitar corretamente sistema, fronteira e vizinhança.",
    equipment: [
      "Tanque de água",
      "Fronteira ajustável",
      "Termômetro",
      "Reservatório externo",
    ],
    variable: "Tipo de fronteira: aberta, fechada ou isolada.",
    keep: "Massa interna e temperaturas iniciais iguais entre os ensaios.",
    steps: [
      "Antes de iniciar, escolha o tanque fechado e preveja se a temperatura pode mudar sem perder água.",
      "Registre massa e temperaturas. Coloque o termômetro dentro do tanque e inicie.",
      "Pause em 300 s e registre a leitura. Guarde o ensaio; repita com sistema aberto, depois isolado.",
      "Compare o calor transferido e a massa que atravessou a fronteira. Explique por que massa constante não significa sistema fechado.",
    ],
    observe:
      "No aberto, entram e saem massas iguais: a massa no tanque é constante, mas há transporte de energia. No fechado, apenas calor cruza a fronteira. No isolado, a temperatura não varia.",
    mistake:
      "Confundir “fechado” com “isolado”. Uma tampa impede matéria, mas não elimina a condução térmica.",
    application:
      "Conservação de alimentos em garrafas térmicas e balanço energético em reservatórios de água.",
    extend:
      "Iguale a temperatura inicial à externa. Mesmo sem diferença de temperatura, ainda pode atravessar matéria no sistema aberto?",
  },
  phase: {
    objective:
      "Separar calor sensível e calor latente, identificar os cinco trechos da curva e relacionar energia, massa e potência.",
    equipment: [
      "Água pura a −20 °C",
      "Aquecedor regulável",
      "Termômetro",
      "Gráfico temperatura × energia",
    ],
    variable: "Massa ou potência do aquecedor, uma por vez.",
    keep: "Pressão de 1 atm e mesma substância.",
    steps: [
      "Escolha 100 g e 1.500 W. Preveja em quais temperaturas haverá patamares.",
      "Inicie ou arraste a linha do tempo. Registre temperatura e energia no início e no final da fusão.",
      "Continue até a ebulição. Abra Gráfico e compare o tamanho dos dois patamares de energia.",
      "Dobre a massa e compare energia total e tempo físico. Depois, altere apenas a potência: qual grandeza muda?",
    ],
    observe:
      "A 1 atm, o gelo funde a 0 °C e a água ferve a 100 °C. Durante cada transição, a temperatura permanece constante; o calor altera a fase. Vapor pode passar de 100 °C depois que toda a água evaporou.",
    mistake:
      "Afirmar que receber calor sempre aumenta a temperatura. Também não confunda a representação de partículas com uma fotografia molecular.",
    application:
      "Dimensionamento de aquecedores, preparo de alimentos, refrigeração e produção de vapor.",
    extend:
      "Compare a energia de fusão com a de vaporização da mesma massa. Use Lf = 334 e Lv = 2.256 J/g.",
  },
  heat: {
    objective:
      "Diferenciar temperatura, calor transferido e capacidade térmica por meio de amostras de mesma massa.",
    equipment: [
      "Amostra de água",
      "Bloco de cobre ou alumínio",
      "Fontes de calor iguais",
      "Sonda de temperatura",
    ],
    variable: "Material da segunda amostra.",
    keep: "Massa, temperatura inicial de 20 °C e energia recebida por amostra.",
    steps: [
      "Selecione cobre e 200 g. Preveja qual amostra terá maior elevação de temperatura.",
      "Aplique 5 kJ a cada amostra. Use o termômetro nos dois alvos para verificar as leituras.",
      "Registre as temperaturas finais e calcule ΔT de cada material. Repita com alumínio.",
      "Calcule Q/(m·ΔT) e compare com o calor específico tabelado. Explique por que a água exige mais energia.",
    ],
    observe:
      "Quanto menor o calor específico, maior a elevação de temperatura sob mesmo Q e mesma massa. A quantidade de partículas desenhadas é ilustrativa, não uma medida da massa.",
    mistake:
      "Dizer que o metal recebeu “mais calor” só porque sua temperatura subiu mais. Aqui, os dois recebem exatamente a mesma energia.",
    application:
      "Escolha de materiais para panelas, trocadores de calor e sistemas de armazenamento térmico.",
    extend:
      "Dobre a massa mantendo o calor recebido. O que acontece com ΔT? Teste sua previsão.",
  },
  mix: {
    objective:
      "Prever o equilíbrio térmico e conferir a conservação da energia incluindo a capacidade térmica do recipiente.",
    equipment: [
      "Água quente e fria",
      "Calorímetro isolado",
      "Balança representada pelos controles",
      "Termômetro móvel",
    ],
    variable: "Razão entre massas ou capacidade térmica do calorímetro.",
    keep: "Temperaturas iniciais de cada amostra ao comparar apenas as massas.",
    steps: [
      "Comece com massas iguais de 200 g, água a 80 °C e 20 °C e capacidade do copo igual a zero. Preveja Tf.",
      "Registre as condições iniciais. Inicie e acompanhe a redução da diferença de temperaturas.",
      "No equilíbrio, registre as duas leituras e verifique se coincidem. Abra Cálculos e confira ΣQ = 0.",
      "Agora atribua 300 J/K ao calorímetro e repita. Compare Tf e explique onde foi parar a energia recebida pelo copo.",
    ],
    observe:
      "O calorímetro começa à temperatura fria. Ele também absorve calor quando sua capacidade é maior que zero. As duas câmaras desenhadas acompanham separadamente as parcelas quente e fria da mistura ideal.",
    mistake:
      "Usar a média simples das temperaturas para massas diferentes ou ignorar a capacidade do recipiente.",
    application:
      "Mistura de líquidos na gastronomia, controle de temperatura em processos e calibração de calorímetros.",
    extend:
      "Mantenha 150 g de água quente e aumente a massa fria. A temperatura final se aproxima de qual temperatura inicial?",
  },
  process: {
    objective:
      "Relacionar p, V e T e distinguir o trabalho e o calor nas quatro transformações de um gás ideal.",
    equipment: [
      "1 mol de gás ideal monoatômico",
      "Cilindro com pistão",
      "Manômetro",
      "Termômetro",
    ],
    variable:
      "Tipo de processo e volume final, ou temperatura final na isocórica.",
    keep: "Estado inicial: 300 K e 100 kPa.",
    steps: [
      "Escolha expansão isotérmica com volume final igual ao dobro do inicial. Preveja a pressão final.",
      "Inicie. Arraste o pistão, quando habilitado, ou use o controle de volume para escolher outra configuração.",
      "Compare a mesma razão de volumes em processo adiabático. Registre T, p, Q e W nos dois estados finais.",
      "Escolha isocórica: o pistão fica travado. Varie T final e explique por que o trabalho é zero.",
    ],
    observe:
      "Na isotérmica, Q compensa W e ΔU = 0. Na adiabática reversível, Q = 0 e o trabalho muda T. Isobárica mantém p; isocórica mantém V. Nos gráficos, o eixo horizontal da isocórica é T.",
    mistake:
      "Tratar calor e trabalho como propriedades armazenadas no gás. Ambos são formas de transferir energia e dependem do caminho.",
    application: "Compressores, motores, cilindros e ciclos de refrigeração.",
    extend:
      "Comprima para Vfinal/Vinicial = 0,5. Compare a temperatura na isotérmica e na adiabática.",
  },
  first: {
    objective:
      "Usar uma convenção de sinais consistente para calcular ΔU e distinguir trabalho realizado pelo sistema de trabalho recebido.",
    equipment: [
      "Sistema fechado ideal",
      "Entrada/saída de calor",
      "Entrada/saída de trabalho",
      "Balanço de energia",
    ],
    variable: "Calor Q e trabalho W, com sinal.",
    keep: "Convenção química: trabalho sobre o sistema positivo.",
    steps: [
      "Configure Q = 40 kJ e W = −15 kJ. Antes de executar, interprete cada sinal.",
      "Avance até o final e registre Q, W e ΔU. Confira a soma numérica.",
      "Teste Q = 40 kJ e W = −40 kJ. Explique como há transferências mesmo com ΔU = 0.",
      "Faça uma compressão sem calor: Q = 0 e W = +50 kJ. Compare com a expansão de mesmo módulo.",
    ],
    observe:
      "Q > 0 representa calor recebido. W > 0 representa trabalho realizado sobre o sistema. O valor de ΔU sozinho não fornece temperatura sem conhecer o material e a equação de estado.",
    mistake:
      "Usar ΔU = Q − W com W já definido como trabalho sobre o sistema: isso troca o sinal duas vezes.",
    application:
      "Balanços energéticos em equipamentos industriais e análise de compressão e expansão.",
    extend:
      "Encontre três pares diferentes de Q e W que produzam o mesmo ΔU = 25 kJ.",
  },
  second: {
    objective:
      "Determinar o limite de eficiência de uma máquina térmica e relacionar irreversibilidade com produção de entropia.",
    equipment: [
      "Reservatório quente",
      "Máquina cíclica",
      "Reservatório frio",
      "Medidor de trabalho",
    ],
    variable: "Temperaturas dos reservatórios e fração do limite de Carnot.",
    keep: "Calor recebido por ciclo ao comparar eficiência.",
    steps: [
      "Use 600 K e 300 K. Calcule o limite de Carnot antes de iniciar: ηmáx = 1 − Tfria/Tquente.",
      "Escolha 70% desse limite e Qquente = 10 kJ. Execute um ciclo e registre trabalho e calor rejeitado.",
      "Mude para 100% do limite e compare ΔS do universo. Identifique o caso reversível.",
      "Aumente só Tquente e compare a eficiência. Explique por que aumentar Q por ciclo não altera η.",
    ],
    observe:
      "A fração ajustada não é a eficiência absoluta: 70% de um limite de 50% corresponde a 35%. A máquina retorna ao seu estado após o ciclo; os reservatórios sofrem as trocas.",
    mistake:
      "Inserir temperaturas em °C na razão de Carnot ou confundir eficiência de Carnot com eficiência real.",
    application:
      "Motores térmicos, geração de energia e análise de eficiência energética.",
    extend:
      "Mantendo as fontes, dobre o calor recebido. Observe que o trabalho dobra, mas a eficiência permanece igual.",
  },
  enthalpy: {
    objective:
      "Relacionar ΔH molar, quantidade estequiométrica de reação e calor transferido ao banho calorimétrico.",
    equipment: [
      "Sistema químico ideal",
      "Banho de água a 25 °C",
      "Calorímetro a pressão constante",
      "Sonda térmica",
    ],
    variable: "Reação, quantidade de reação ou massa do banho.",
    keep: "Ao investigar a quantidade de reação, mantenha massa do banho constante.",
    steps: [
      "Selecione combustão de metano e 0,020 mol. Identifique o sinal de ΔH antes de executar.",
      "Avance a reação e registre o calor recebido pelo banho e sua temperatura final.",
      "Calcule qreação = n·ΔH e qbanho = −qreação. Confira ΔT = qbanho/(m·c).",
      "Compare com a decomposição do carbonato. Explique por que o banho esfria no balanço ideal.",
    ],
    observe:
      "ΔH é expresso por mol de reação na proporção estequiométrica escrita. Dobrar n dobra o calor total, mas não a entalpia molar. A temperatura do banho não é a temperatura da reação.",
    mistake:
      "Afirmar que a decomposição de CaCO₃ ocorre espontaneamente em água à temperatura ambiente. A experiência calcula um balanço ideal, não a execução real dessa reação.",
    application:
      "Comparação de combustíveis e determinação calorimétrica de energia liberada por transformações.",
    extend:
      "Dobre a massa do banho mantendo n. A elevação de temperatura deve cair pela metade, sem mudar o calor total.",
  },
  gibbs: {
    objective:
      "Analisar o sentido termodinamicamente favorecido e a temperatura de inversão usando ΔH, ΔS e T.",
    equipment: [
      "Transformação hipotética",
      "Controle de temperatura absoluta",
      "Balanço ΔH versus TΔS",
      "Mapa ΔG × T",
    ],
    variable: "Temperatura; depois, sinais de ΔH e ΔS.",
    keep: "ΔH e ΔS constantes ao investigar o efeito da temperatura.",
    steps: [
      "Use ΔH = 40 kJ/mol e ΔS = 100 J/(mol·K). Converta ΔS para kJ antes de calcular.",
      "Ajuste T = 300 K e determine o sinal de ΔG. Registre a previsão do sentido favorecido.",
      "Aumente T para 400 K e 600 K. Localize no gráfico a passagem por ΔG = 0.",
      "Teste as quatro combinações de sinais de ΔH e ΔS. Quais são favorecidas em qualquer temperatura positiva?",
    ],
    observe:
      "ΔG < 0 favorece a transformação direta sob as condições consideradas; ΔG = 0 indica equilíbrio. A interpretação supõe T e p constantes. Barreiras de ativação podem tornar uma transformação favorável muito lenta.",
    mistake:
      "Misturar joules e quilojoules ou confundir espontaneidade termodinâmica com velocidade de reação.",
    application:
      "Seleção de condições de processos e previsão de favorabilidade de transformações químicas.",
    extend:
      "Teste ΔH negativo e ΔS positivo. Explique por que ΔG permanece negativo para T > 0 neste modelo.",
  },
  identify: {
    objective:
      "Determinar experimentalmente o calor específico de um metal e comparar o resultado com uma tabela de referência.",
    equipment: [
      "Amostra metálica codificada",
      "Água fria",
      "Calorímetro",
      "Termômetro móvel",
    ],
    variable: "Código da amostra; depois, massa do metal.",
    keep: "Massas, temperaturas iniciais e capacidade do calorímetro ao comparar amostras.",
    steps: [
      "Escolha a amostra A. Anote massa e temperatura inicial do metal, massa e temperatura da água e capacidade do calorímetro.",
      "Execute o contato térmico. Meça o metal e a água com a sonda e aguarde leituras iguais.",
      "Registre Tf. Use o calor recebido pela água e pelo recipiente para calcular cmetal no painel de cálculos.",
      "Compare com cobre (0,385), ferro (0,449) e alumínio (0,897 J/g·K). Repita com outra massa e verifique se c se mantém.",
    ],
    observe:
      "Calor específico é uma propriedade intensiva: mudar a massa altera o equilíbrio, mas não o valor de c do mesmo material no modelo. A identificação é ideal, sem incerteza instrumental.",
    mistake:
      "Usar uma temperatura intermediária como se fosse o equilíbrio ou esquecer o calor absorvido pelo recipiente.",
    application:
      "Identificação de materiais e caracterização térmica em laboratórios de qualidade.",
    extend:
      "Faça o cálculo ignorando C e compare com o resultado correto. O erro aumenta ou diminui quando o recipiente absorve mais calor?",
  },
  hess: {
    objective:
      "Combinar equações termoquímicas, cancelar espécies intermediárias e verificar a independência do caminho para ΔH.",
    equipment: [
      "Reação direta C → CO₂",
      "Etapa C → CO",
      "Etapa CO → CO₂",
      "Diagrama de níveis de entalpia",
    ],
    variable: "Caminho, sentido e quantidade de reação.",
    keep: "Estados inicial e final e condições de referência.",
    steps: [
      "Escolha 1 mol e o caminho em etapas. Escreva as duas equações e identifique o intermediário CO.",
      "Avance até 50% do percurso: a primeira etapa foi concluída. Registre sua variação de entalpia.",
      "Conclua o percurso. Some −110,5 e −283,0 kJ e compare com a reação direta.",
      "Inverta o sentido ou multiplique n. Observe que inverter muda o sinal e multiplicar a equação multiplica ΔH.",
    ],
    observe:
      "O CO aparece como produto de uma etapa e reagente da seguinte, por isso é cancelado. A soma depende dos estados inicial e final; o progresso no diagrama não é uma escala de tempo de reação.",
    mistake:
      "Somar ΔH sem verificar o sentido, os coeficientes e os estados físicos de cada equação.",
    application:
      "Cálculo de entalpias de reações difíceis de medir diretamente e comparação de rotas químicas.",
    extend:
      "Use 2 mol e a reação inversa. Escreva as equações invertidas na ordem correta e confira ΔHtotal = +787,0 kJ.",
  },
};
const n = (x: number, d = 2) =>
  (Math.abs(x) < Math.pow(10, -d) / 2 ? 0 : x).toLocaleString("pt-BR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
export interface Calculation {
  label: string;
  expression: string;
  explanation: string;
}
export function calculations(
  mode: Mode,
  p: Params,
  r: Result,
  f: number,
): Calculation[] {
  const row = (
    label: string,
    expression: string,
    explanation: string,
  ): Calculation => ({ label, expression, explanation });
  if (mode === "mix")
    return [
      row(
        "1. Equilíbrio previsto",
        `Tf = [${n(p.hotMass, 0)} × 4,18 × ${n(p.hotT, 0)} + (${n(p.coldMass, 0)} × 4,18 + ${n(p.capacity, 0)}) × ${n(p.coldT, 0)}] / (${n(p.hotMass + p.coldMass, 0)} × 4,18 + ${n(p.capacity, 0)}) = ${n(r.values.eq)} °C`,
        "A capacidade térmica total pondera as temperaturas iniciais. O copo inicia à temperatura fria.",
      ),
      row(
        "2. Calor trocado neste instante",
        `Qquente = ${n(r.values.qHot / 1000)} kJ; Qfria = ${n(r.values.qCold / 1000)} kJ; Qcopo = ${n(r.values.qCup / 1000)} kJ`,
        "Cada Q é C·(T − Tinicial). O sinal negativo indica energia cedida.",
      ),
      row(
        "3. Conferência da energia",
        `ΣQ = ${n((r.values.qHot + r.values.qCold + r.values.qCup) / 1000, 4)} kJ`,
        "A soma permanece zero em todo o percurso do modelo, não apenas no estado final.",
      ),
    ];
  if (mode === "identify")
    return [
      row(
        "1. Energia recebida",
        `Qágua + Qcopo = ${n((r.values.qWater + r.values.qCup) / 1000, 3)} kJ`,
        "Essa energia foi cedida pelo metal. A identificação só usa a leitura final comum.",
      ),
      row(
        "2. Calor específico",
        f < 1
          ? "Aguarde o equilíbrio (100% do percurso)."
          : `c = (${n(p.waterMass, 0)} × 4,18 + ${n(p.capacity, 0)}) × (${n(r.values.eq, 4)} − ${n(p.waterT, 0)}) / [${n(p.metalMass, 0)} × (${n(p.metalT, 0)} − ${n(r.values.eq, 4)})] = ${n(r.values.c, 3)} J/(g·K)`,
        "O cálculo usa internamente a temperatura sem arredondamento; a expressão mostra valores arredondados.",
      ),
      row(
        "3. Identificação",
        f < 1
          ? "Compare as temperaturas do metal e da água."
          : `${n(r.values.c, 3)} J/(g·K) → ${unknownMetals[p.sample].name}`,
        "Referência: cobre 0,385; ferro 0,449; alumínio 0,897 J/(g·K).",
      ),
    ];
  if (mode === "phase")
    return [
      row(
        "1. Energia e tempo",
        `Q = ${n(r.values.energy)} kJ; t = ${n(r.values.energy * 1000, 0)} J / ${n(p.power, 0)} W = ${n(r.values.seconds)} s`,
        "1 W = 1 J/s. A potência muda o tempo físico, não a energia necessária à mudança.",
      ),
      row(
        "2. Energia de cada transição",
        `Qfusão = ${n(p.mass, 0)} × 334 = ${n((p.mass * 334) / 1000)} kJ; Qvaporização = ${n(p.mass, 0)} × 2.256 = ${n((p.mass * 2256) / 1000)} kJ`,
        "Nos patamares, use Q = mL. Nos trechos inclinados, Q = mcΔT.",
      ),
      row(
        "3. Estado atual",
        `${r.status}: T = ${n(r.temperatures[0])} °C`,
        "O percurso completo inclui aquecer gelo, fundir, aquecer líquido, vaporizar e aquecer vapor até 120 °C.",
      ),
    ];
  if (mode === "heat") {
    const c = materials[p.material].c;
    return [
      row(
        "1. Energia recebida por amostra",
        `Q = ${n(p.energy * f)} kJ = ${n(p.energy * f * 1000, 0)} J`,
        "As fontes fornecem o mesmo Q, e não a mesma temperatura.",
      ),
      row(
        "2. Água",
        `ΔT = ${n(p.energy * f * 1000, 0)} / (${n(p.mass, 0)} × 4,18) = ${n(r.temperatures[0] - 20)} K; T = ${n(r.temperatures[0])} °C`,
        "Uma variação de 1 K tem o mesmo tamanho de uma variação de 1 °C.",
      ),
      row(
        `3. ${materials[p.material].name}`,
        `ΔT = ${n(p.energy * f * 1000, 0)} / (${n(p.mass, 0)} × ${n(c, 3)}) = ${n(r.temperatures[1] - 20)} K; T = ${n(r.temperatures[1])} °C`,
        "Use calor específico em J/(g·K), massa em g e energia em J.",
      ),
    ];
  }
  if (mode === "boundaries")
    return [
      row(
        "1. Variação da energia do líquido",
        `ΔU ≈ m·c·ΔT = ${n(r.values.change / 1000, 3)} kJ`,
        "Aproximação de líquido incompressível: calor específico constante e trabalho de expansão desprezível.",
      ),
      row(
        "2. Trocas pela fronteira",
        `Q = ${n(r.values.q / 1000, 3)} kJ; energia líquida transportada = ${n(r.values.enthalpyFlow / 1000, 3)} kJ`,
        "No aberto, as vazões de entrada e saída têm igual massa, mas diferentes temperaturas.",
      ),
      row(
        "3. Balanço",
        `${n(r.values.q / 1000, 3)} + ${n(r.values.enthalpyFlow / 1000, 3)} = ${n(r.values.change / 1000, 3)} kJ`,
        "A soma das transferências corresponde à variação energética do tanque.",
      ),
    ];
  if (mode === "process")
    return [
      row(
        "1. Equação de estado",
        `p = nRT/V = 1 × ${n(R, 4)} × ${n(r.values.temperature)} / ${n(r.values.volume)} = ${n(r.values.pressure)} kPa`,
        "Nesta forma, 1 kPa·L = 1 J. O gráfico permite acompanhar os estados intermediários.",
      ),
      row(
        "2. Energia interna",
        `ΔU = 1 × ${n(CV, 4)} × (${n(r.values.temperature)} − 300) / 1.000 = ${n(r.values.du, 3)} kJ`,
        "Para gás ideal monoatômico, Cv = 3R/2 e U depende apenas de T.",
      ),
      row(
        "3. Calor e trabalho",
        `Q = ${n(r.values.q, 3)} kJ; W = ${n(r.values.w, 3)} kJ; Q + W = ${n(r.values.q + r.values.w, 3)} kJ`,
        "Na isotérmica, W = −nRT ln(Vf/Vi). Na isobárica, W = −pΔV. Na isocórica, W = 0. Na adiabática, Q = 0.",
      ),
    ];
  if (mode === "first")
    return [
      row(
        "1. Calor",
        `Q = ${n(r.values.q)} kJ`,
        p.q >= 0
          ? "Positivo: calor recebido pelo sistema."
          : "Negativo: calor cedido pelo sistema.",
      ),
      row(
        "2. Trabalho",
        `W = ${n(r.values.w)} kJ`,
        p.w >= 0
          ? "Positivo: trabalho realizado sobre o sistema."
          : "Negativo: o sistema realiza trabalho sobre o ambiente.",
      ),
      row(
        "3. Primeira lei",
        `ΔU = ${n(r.values.q)} + (${n(r.values.w)}) = ${n(r.values.u)} kJ`,
        "Trata-se de variação, não do valor absoluto da energia interna.",
      ),
    ];
  if (mode === "second")
    return [
      row(
        "1. Limite e eficiência efetiva",
        `ηCarnot = 1 − ${n(p.cold, 0)}/${n(p.hot, 0)} = ${n(r.values.carnot * 100)}%; η = ${n(p.quality, 0)}% × ηCarnot = ${n(r.values.efficiency * 100)}%`,
        "As temperaturas são absolutas, em kelvin.",
      ),
      row(
        "2. Trabalho e rejeição",
        `Wsaída = ${n(r.values.work)} kJ; Qfria = ${n(r.values.input)} − ${n(r.values.work)} = ${n(r.values.rejected)} kJ`,
        "A energia rejeitada completa o balanço de um ciclo. Este Wsaída é trabalho produzido, não o W sobre o sistema.",
      ),
      row(
        "3. Entropia total",
        `ΔSuniv = ${n(r.values.rejected * 1000)}/${n(p.cold, 0)} − ${n(r.values.input * 1000)}/${n(p.hot, 0)} = ${n(r.values.entropy, 3)} J/K`,
        "Ao final do ciclo reversível, ΔSuniv = 0; no irreversível, ΔSuniv > 0.",
      ),
    ];
  if (mode === "enthalpy")
    return [
      row(
        "1. Reação e quantidade",
        reactions[p.reaction].equation,
        `ΔH = ${n(r.values.dh, 1)} kJ/mol de reação; quantidade total = ${n(p.amount, 3)} mol.`,
      ),
      row(
        "2. Calor trocado até agora",
        `qreação = ${n(p.amount * f, 4)} × (${n(r.values.dh, 1)}) = ${n(-r.values.q, 3)} kJ; qbanho = ${n(r.values.q, 3)} kJ`,
        "Pressão constante, só trabalho pV, reação ideal. Os sinais do banho e do sistema químico são opostos.",
      ),
      row(
        "3. Temperatura do banho",
        `T = 25 + ${n(r.values.q * 1000, 1)}/(${n(p.water, 0)} × 4,18) = ${n(r.values.temperature)} °C`,
        "O banho pode aquecer ou esfriar. Isso não determina a temperatura necessária para a reação real.",
      ),
    ];
  if (mode === "hess")
    return [
      row(
        "1. Entalpias das etapas",
        `ΔH₁ = ${n(r.values.first, 1)} kJ; ΔH₂ = ${n(r.values.second, 1)} kJ`,
        p.reverse
          ? "As equações foram invertidas e suas etapas percorridas em ordem reversa."
          : "C + ½O₂ → CO; em seguida, CO + ½O₂ → CO₂. O intermediário CO se cancela.",
      ),
      row(
        "2. Soma de Hess",
        `${n(r.values.first, 1)} + (${n(r.values.second, 1)}) = ${n(r.values.total, 1)} kJ`,
        "Corresponde à mesma variação do caminho direto, para a quantidade de carbono escolhida.",
      ),
      row(
        "3. Percurso realizado",
        `Avanço = ${n(f * 100, 0)}%; ΔH acumulado = ${n(r.values.q, 1)} kJ`,
        "Na rota em etapas, 50% do percurso encerra a primeira equação. Esse eixo não representa tempo nem fração cinética de uma reação única.",
      ),
    ];
  const threshold = p.ds === 0 ? null : (p.dh * 1000) / p.ds;
  return [
    row(
      "1. Conversão de unidades",
      `ΔS = ${n(p.ds, 0)} J/(mol·K) = ${n(p.ds / 1000, 3)} kJ/(mol·K)`,
      "Antes de subtrair, ΔH e TΔS precisam estar na mesma unidade.",
    ),
    row(
      "2. Energia livre",
      `ΔG = ${n(p.dh)} − ${n(p.temperature, 0)} × (${n(p.ds / 1000, 3)}) = ${n(r.values.dg)} kJ/mol`,
      "Temperatura absoluta em K. O sinal indica o sentido favorecido nas condições consideradas.",
    ),
    row(
      "3. Temperatura de inversão",
      threshold === null
        ? "ΔS = 0: ΔG = ΔH, independente de T neste modelo."
        : threshold > 0
          ? `T* = ΔH/ΔS = ${n(threshold)} K`
          : "Não existe temperatura positiva de inversão para estes sinais.",
      "Uma temperatura calculada fora de 200–900 K não aparece na faixa do gráfico. Favorabilidade não é velocidade.",
    ),
  ];
}
