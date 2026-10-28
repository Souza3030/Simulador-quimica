import type { Mode } from "./experiments.ts";
export interface PhetSimulation {
  slug: string;
  name: string;
  focus: string;
  limitation: string;
}
export const phetSimulations: readonly PhetSimulation[] = [
  {
    slug: "energy-forms-and-changes",
    name: "Formas e Transformações de Energia",
    focus:
      "Observe transferências de energia e compare o aquecimento de materiais.",
    limitation:
      "Não calcula o calorímetro, a entropia ou a energia livre deste laboratório.",
  },
  {
    slug: "states-of-matter-basics",
    name: "Estados da Matéria: Básico",
    focus:
      "Aqueça e resfrie partículas para relacionar temperatura e mudança de estado.",
    limitation:
      "Não fornece o balanço quantitativo de calor latente usado aqui.",
  },
  {
    slug: "gas-properties",
    name: "Propriedades dos Gases",
    focus:
      "Mude volume e temperatura para observar a pressão e o movimento das partículas.",
    limitation:
      "As trajetórias termodinâmicas e os trabalhos calculados aqui seguem um modelo próprio.",
  },
  {
    slug: "balancing-chemical-equations",
    name: "Balanceamento de Equações Químicas",
    focus:
      "Confira as proporções de átomos antes de usar uma equação termoquímica.",
    limitation: "O balanceamento não calcula entalpia, Hess ou espontaneidade.",
  },
  {
    slug: "reactants-products-and-leftovers",
    name: "Reagentes, Produtos e Excesso",
    focus:
      "Teste como a quantidade de reagentes limita a formação de produtos.",
    limitation: "A simulação de proporções não mede o calor da reação.",
  },
] as const;
const byMode: Record<Mode, { slug: string; connection: string }> = {
  boundaries: {
    slug: "energy-forms-and-changes",
    connection: "Compare a passagem de energia pela fronteira de um sistema.",
  },
  phase: {
    slug: "states-of-matter-basics",
    connection:
      "Relacione a escala de partículas aos patamares de fusão e ebulição.",
  },
  heat: {
    slug: "energy-forms-and-changes",
    connection:
      "Observe por que a mesma energia pode produzir aquecimentos diferentes.",
  },
  mix: {
    slug: "energy-forms-and-changes",
    connection: "Explore o sentido da transferência de energia entre corpos.",
  },
  process: {
    slug: "gas-properties",
    connection: "Explore como volume, temperatura e pressão se relacionam.",
  },
  first: {
    slug: "energy-forms-and-changes",
    connection:
      "Identifique transferências de energia antes de fechar o balanço Q + W.",
  },
  second: {
    slug: "energy-forms-and-changes",
    connection:
      "Observe transformações de energia; o limite de Carnot é calculado apenas no TermoLab.",
  },
  enthalpy: {
    slug: "reactants-products-and-leftovers",
    connection:
      "Use a proporção dos reagentes antes de calcular o calor da reação.",
  },
  gibbs: {
    slug: "balancing-chemical-equations",
    connection:
      "Revise a equação da reação; ΔG e espontaneidade são calculados apenas no TermoLab.",
  },
  identify: {
    slug: "energy-forms-and-changes",
    connection:
      "Compare o aquecimento de materiais antes de inferir o calor específico.",
  },
  hess: {
    slug: "balancing-chemical-equations",
    connection:
      "Balanceie as etapas antes de somar as entalpias e cancelar intermediários.",
  },
};
export function recommendedPhet(mode: Mode) {
  const recommendation = byMode[mode];
  return {
    ...recommendation,
    simulation: phetSimulations.find((s) => s.slug === recommendation.slug)!,
  };
}
export const phetPage = (slug: string) =>
  `https://phet.colorado.edu/pt_BR/simulations/${slug}`;
export const phetEmbed = (slug: string) =>
  `https://phet.colorado.edu/sims/html/${slug}/latest/${slug}_pt_BR.html`;
