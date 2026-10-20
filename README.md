# TermoLab

Laboratório virtual de termoquímica em **TypeScript**, com Vite, em português, inspirado na aprendizagem por exploração do PhET. Projeto independente, sem vínculo com o PhET.

## Executar

Requer Node.js 22.12+ (validado com Node 24).

Para baixar, use **Code → Download ZIP** no GitHub e extraia a pasta. Abra um terminal nessa pasta e execute:

```sh
npm ci
npm start -- --port 5173
```

## Código

- `app.ts`: interface, animação e controles com tipos explícitos.
- `physics.ts`: estados da água, entalpias e balanço energético.
- `physics.test.ts`: testes dos modelos físicos.
- `tests/browser.ts`: validação das interações com Playwright.
- `tsconfig.json`: verificação TypeScript em modo estrito.

`npm run check` verifica os tipos. A compilação também executa essa verificação antes de gerar `dist/`.

## Experiências

- **Calor e estados físicos:** água a 1 atm, inicialmente a −20 °C. Ajuste massa e potência; observe Q = mcΔT e os patamares de calor latente Q = mL. O tempo simulado corre 20 vezes mais rápido.
- **Entalpia das reações:** combustão do metano, neutralização e decomposição do carbonato de cálcio. Compare sinais de ΔH e calor transferido a um banho ideal de 1 kg de água, inicialmente a 25 °C.
- **Primeira lei:** varie calor e trabalho para explorar ΔU = Q + W; trabalho sobre o sistema tem sinal positivo.

Modelos didáticos sem perdas térmicas. Partículas e barreiras de ativação são ilustrativas. Reações não modelam cinética real: a decomposição do carbonato exige altas temperaturas na prática. O calorímetro representa um balanço energético idealizado.

## Validação

```sh
npm test
npm run build
npm run test:browser
```

O teste de navegador requer o servidor na porta 5173 e Chromium em `/usr/bin/chromium`. Verifica aquecimento, reinicialização, reação endotérmica, primeira lei, guia e largura de tela móvel. A interface não depende de fontes, imagens ou serviços externos.

## Próximas ideias

- Lei de Hess: combinar reações e somar entalpias.
- Desafios com previsão de temperatura antes de executar.
- Comparar calor específico de diferentes materiais.
- Sistemas abertos, fechados e isolados com trocas de matéria.
