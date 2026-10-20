# TermoLab · A energia conta uma história

Um laboratório de investigação em **TypeScript estrito + Vite**, em português. Nove experiências conectam os assuntos do capítulo 14 de termoquímica: de sistemas e fronteiras à energia livre de Gibbs.

![Bancada de calorimetria do TermoLab](docs/termolab.png)

## Explorar

- **Bancada e gráfico:** duas representações do mesmo estado, com partículas, recipientes, pistão, máquina térmica e balanços de energia.
- **Linha do tempo reversível:** pause, avance ou retorne a qualquer ponto da experiência. Mudar um parâmetro reinicia a evolução.
- **18 ideias prontas:** configurações para investigar contrastes, como um copo aberto e uma garrafa ideal, ou uma máquina real e o limite reversível.
- **Caderno Ver–Pensar–Perguntar:** anotações, até 12 ensaios, retomada de configurações e exportação em JSON. Armazenamento local no navegador, sem conta.
- **Comparação:** os dois últimos ensaios do assunto atual aparecem lado a lado no caderno. No gráfico, uma curva tracejada mostra o último ensaio guardado; processos com eixos incompatíveis não são sobrepostos.
- **Nove hipóteses:** perguntas com feedback explicativo e progresso salvo.
- Layout adaptado a celular, navegação por teclado, ajuda, descrição dos modelos e opção de reduzir movimento.

## Experiências do capítulo

| Tema                                | Investigação                                     | Modelo                                                                       |
| ----------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------- |
| Sistemas térmicos e fronteiras      | O que pode atravessar a fronteira?               | Tanque aberto, fechado ou isolado; calor e transporte de energia por matéria |
| Mudanças de estado                  | Por que a temperatura para de subir?             | Água a 1 atm: gelo, fusão, líquido, ebulição e vapor                         |
| Calor e temperatura                 | Mesmo calor produz a mesma temperatura?          | Água, cobre e alumínio; Q = mcΔT                                             |
| Calorimetria                        | Qual será a temperatura de equilíbrio?           | Duas massas de água e capacidade térmica do calorímetro                      |
| Formas de estudar sistemas térmicos | Como o caminho altera a transformação?           | Gás ideal em processos isotérmico, isocórico, isobárico e adiabático         |
| Primeira lei                        | Como fechar o balanço energético?                | ΔU = Q + W, trabalho sobre o sistema positivo                                |
| Segunda lei                         | Quanto calor pode virar trabalho?                | Máquina térmica, limite de Carnot e entropia do universo                     |
| Entalpia e aplicação à química      | Qual é a assinatura térmica de uma reação?       | Combustão do metano, neutralização e decomposição de CaCO₃                   |
| Energia livre de Gibbs              | Em quais condições a transformação é favorecida? | ΔG = ΔH − TΔS e temperatura de inversão                                      |

## Executar

Requer **Node.js 22.12+**, validado com Node 24. No GitHub, use **Code → Download ZIP**, extraia e abra um terminal na pasta:

```sh
npm ci
npm start -- --port 5173
```

Para gerar os arquivos do site:

```sh
npm run build
```

O resultado fica em `dist/`. O projeto usa apenas arquivos locais: não exige banco, chaves de API, fontes externas ou serviços de IA. O envio do código ao GitHub não publica automaticamente um site.

## Verificar

```sh
npm test             # 14 testes científicos e casos de fronteira
npm run check        # TypeScript estrito
npm run build        # checagem de tipos + compilação
npm run test:browser # servidor na porta 5173 deve estar ativo
```

O teste de interface usa Chromium em `/usr/bin/chromium`. Para outro sistema, configure `CHROMIUM_PATH` com o caminho de um Chromium/Chrome instalado. `TERMOLAB_URL` altera o endereço do servidor de teste.

O teste de navegador cobre os nove assuntos, 18 presets, nove gráficos, hipóteses, reprodução, controle do tempo, comparação, restauração, persistência, exportação JSON, condições de Gibbs e Carnot, controles condicionais, celular e diálogos. As capturas de validação ficam em `/tmp/termolab-v2-desktop.png` e `/tmp/termolab-v2-mobile.png` no ambiente da nuvem.

## Organização

- `physics.ts`: funções puras, unidades e modelos físicos.
- `experiments.ts`: currículo, controles, configurações, perguntas e medições.
- `scene.ts`: desenho dos aparatos e partículas em Canvas.
- `app.ts`: reprodução, gráficos SVG, caderno e persistência.
- `icons.ts`, `style.css`, `index.html`: identidade visual e interface.
- `physics.test.ts`, `tests/browser.ts`: validação científica e funcional.

## Hipóteses e limites

A opção **Sobre este modelo** descreve as condições de cada experiência. Os desenhos e as partículas são ilustrativos, sem escala molecular real.

- Água: c(gelo) = 2,1, c(líquido) = 4,18 e c(vapor) = 2,0 J/(g·K); Lf = 334 e Lv = 2256 J/g, a 1 atm. A potência determina o tempo físico; reprodução acelerada 20× antes do multiplicador selecionado.
- Sistemas: água líquida em tanque bem misturado; condução de 1,8 W/K. No sistema aberto, entram e saem 0,5 g/s e a massa interna se mantém. A variação térmica usa a aproximação de líquido incompressível, sem trabalho de expansão. Reprodução física 40×.
- Calorimetria: conjunto isolado e calorímetro inicialmente à temperatura fria. A trajetória interpola a troca conservando energia em cada instante; não pretende prever a cinética real da mistura.
- Gás: 1 mol ideal monoatômico, R = 8,314462618 J/(mol·K), Cv = 3R/2, estado inicial 300 K e 100 kPa; processos quase estáticos reversíveis.
- Máquina: reservatórios em kelvin, ciclo completo com ΔU = 0. A eficiência ajustada é uma fração do limite de Carnot e ΔS é a variação total por ciclo.
- Reações: ΔH constante, banho inicialmente a 25 °C e recipiente ideal. O avanço é ilustrativo. A decomposição de CaCO₃ requer altas temperaturas na prática; a temperatura calculada é a do banho, não a da reação.
- Gibbs: transformação hipotética a T e p constantes, ΔH e ΔS independentes da temperatura. ΔS em J/(mol·K) é convertido para kJ antes do balanço. Favorabilidade não determina velocidade.

Projeto independente, inspirado na aprendizagem por exploração; sem vínculo com o PhET.
