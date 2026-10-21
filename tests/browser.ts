import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { numericChallenge } from "../investigation.ts";
import { experiments } from "../experiments.ts";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1512, height: 1100 },
    reducedMotion: "reduce",
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(process.env.TERMOLAB_URL || "http://127.0.0.1:5173");
  await expect(page.locator("#experiment-title")).toHaveText(
    "O encontro de duas temperaturas.",
  );
  await page.screenshot({
    path: "/tmp/termolab-senac-desktop.png",
    fullPage: true,
  });
  // Playback, pause and deterministic scrubbing.
  await page
    .getByRole("button", { name: "Iniciar experimento", exact: true })
    .click();
  await expect(page.locator("#progress")).not.toHaveValue("0");
  await page
    .getByRole("button", { name: "Pausar experimento", exact: true })
    .click();
  await page.locator("#progress").fill("1000");
  await expect(page.locator("#status")).toHaveText("EQUILÍBRIO TÉRMICO");
  let metrics = await page.locator(".metric strong").allTextContents();
  assert.equal(metrics[0], metrics[1]);
  assert.match(metrics[2], /45,7/);
  await page.locator("#progress").fill("0");
  assert.match(
    await page.locator(".metric strong").first().innerText(),
    /80,0/,
  );
  // Save and compare two configurations; restore exact input and progress.
  await page.locator("#progress").fill("1000");
  await page.locator("#save-run").click();
  await page.locator("#param-capacity").fill("300");
  await expect(page.locator("#progress")).toHaveValue("0");
  await page.locator("#progress").fill("1000");
  await page.locator("#save-run").click();
  await page.locator("#open-notebook").click();
  await expect(page.locator("#comparison table")).toBeVisible();
  await expect(page.locator(".saved-run")).toHaveCount(2);
  await page
    .locator("#note-see")
    .fill("A amostra quente cede energia. <b>Teste de texto</b>");
  await page.locator("#note-think").fill("O copo também absorve calor.");
  await page.locator("#note-ask").fill("E se eu dobrar a massa fria?");
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await downloadPromise;
  const path = await download.path();
  assert.ok(path);
  const exported = JSON.parse(await readFile(path, "utf8"));
  assert.equal(exported.snapshots.length, 2);
  assert.match(exported.notes.ask, /dobrar/);
  await page.locator("[data-restore]").first().click();
  await expect(page.locator("#param-capacity")).toHaveValue("0");
  await expect(page.locator("#progress")).toHaveValue("1000");
  await page.reload();
  await page.locator("#open-notebook").click();
  await expect(page.locator("#note-see")).toHaveValue(
    "A amostra quente cede energia. <b>Teste de texto</b>",
  );
  await expect(page.locator(".saved-run")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Fechar caderno", exact: true })
    .click();
  // Every chapter topic, every preset, every graph, every question.
  for (const e of experiments) {
    await page.locator(`[data-mode="${e.id}"]`).click();
    await expect(page.locator("#experiment-title")).toHaveText(e.title);
    for (let i = 0; i < e.presets.length; i++) {
      await page.locator(`[data-preset="${i}"]`).click();
      for (const [key, value] of Object.entries(e.presets[i].values))
        await expect(page.locator(`#param-${key}`)).toHaveValue(String(value));
    }
    if (e.id !== "gibbs") await page.locator("#progress").fill("1000");
    await page.locator("#view-chart").click();
    await expect(page.locator("#chart")).toBeVisible();
    assert.ok((await page.locator("#chart polyline").count()) > 0);
    assert.ok(!/NaN|Infinity/.test(await page.locator("#chart").innerHTML()));
    await page.locator("#view-bench").click();
    await expect(page.locator("#scene")).toBeVisible();
    await page.locator("#model").click();
    await expect(page.locator("#guide-content")).toContainText(e.model);
    await page
      .getByRole("button", { name: "Fechar explicação", exact: true })
      .click();
    await page.locator(`[data-answer="${(e.correct + 1) % 3}"]`).click();
    await expect(page.locator("#feedback")).toContainText("outra hipótese");
    await page.locator(`[data-answer="${e.correct}"]`).click();
    await expect(page.locator("#feedback")).toHaveText(e.explanation);
  }
  await expect(page.locator("#challenge-progress")).toHaveText(
    "11/11 descobertas",
  );
  await expect(page.locator("#visited-count")).toHaveText("11 / 11");
  await page.locator('[data-mode="gibbs"]').click();
  // Gibbs threshold and the engine's reversible limit.
  await page.locator("#param-dh").fill("40");
  await page.locator("#param-ds").fill("100");
  await page.locator("#param-temperature").fill("400");
  await expect(page.locator("#status")).toHaveText("EQUILÍBRIO");
  await page.locator('[data-mode="second"]').click();
  await page.locator("#param-quality").fill("100");
  await page.locator("#progress").fill("1000");
  assert.match(await page.locator(".metric strong").nth(2).innerText(), /0,0/);
  await page.locator('[data-mode="process"]').click();
  await page.locator("#param-process").selectOption("1");
  await expect(page.locator("#param-ratio")).toBeDisabled();
  await expect(page.locator("#param-temperature")).toBeEnabled();
  // Mobile has no page overflow; all topics remain reachable.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-mode="mix"]').click();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: "/tmp/termolab-senac-mobile.png",
    fullPage: true,
  });
  await page.locator('[data-mode="gibbs"]').click();
  await expect(page.locator("#experiment-title")).toHaveText(
    "A reação vai acontecer?",
  );
  await page.locator("#view-chart").click();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.locator("#motion").click();
  await expect(page.locator("#motion")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.locator("#help").click();
  await expect(page.locator("#guide")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#guide")).not.toBeVisible();
  // New investigation tools: sensor, guided protocol, measurements and piston.
  const toolsPage = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  toolsPage.on("pageerror", (e) => errors.push(e.message));
  await toolsPage.goto(process.env.TERMOLAB_URL || "http://127.0.0.1:5173");
  await expect(toolsPage.getByAltText("Senac")).toBeVisible();
  assert.ok(
    await toolsPage
      .getByAltText("Senac")
      .evaluate((img: HTMLImageElement) => img.naturalWidth > 100),
  );
  await expect(toolsPage.locator("#probe-reading")).toHaveText("80,0 °C");
  await toolsPage.locator("#probe-target").selectOption("1");
  await expect(toolsPage.locator("#probe-reading")).toHaveText("20,0 °C");
  const sensor = await toolsPage.locator("#probe").boundingBox(),
    stage = await toolsPage.locator("#scene").boundingBox();
  assert.ok(sensor && stage);
  await toolsPage.mouse.move(
    sensor.x + sensor.width / 2,
    sensor.y + sensor.height - 4,
  );
  await toolsPage.mouse.down();
  await toolsPage.mouse.move(
    stage.x + stage.width * 0.5,
    stage.y + stage.height * 0.58,
    { steps: 12 },
  );
  await toolsPage.mouse.up();
  await expect(toolsPage.locator("#probe-reading")).toHaveText("— °C");
  await toolsPage.locator("#probe").focus();
  await toolsPage.keyboard.press("ArrowLeft");
  await toolsPage.locator("#probe-target").selectOption("0");
  await expect(toolsPage.locator("#probe-reading")).toHaveText("80,0 °C");
  await toolsPage.locator("#probe-toggle").click();
  await expect(toolsPage.locator("#probe")).toBeHidden();
  await toolsPage.locator("#probe-toggle").click();
  await toolsPage.locator("#energy-toggle").click();
  await expect(toolsPage.locator("#energy-toggle")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await toolsPage.locator("#energy-toggle").click();
  await toolsPage.locator("#micro").click();
  await expect(toolsPage.locator("#micro")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await toolsPage.locator("#micro").click();
  await toolsPage.locator("#mode-guided").click();
  await expect(toolsPage.locator("#guided-number")).toHaveText("1/4");
  await toolsPage.locator("#guided-next").click();
  await toolsPage.locator("#guided-next").click();
  await expect(toolsPage.locator("#guided-number")).toHaveText("3/4");
  await expect(toolsPage.locator("#panel-calculations")).toBeVisible();
  await toolsPage.locator("#progress").fill("1000");
  await expect(toolsPage.locator("#live-calculations")).toContainText(
    "45,71 °C",
  );
  await expect(toolsPage.locator("#live-calculations")).toContainText(
    "0,0000 kJ",
  );
  await toolsPage.locator("#guided-next").click();
  await toolsPage.locator("#guided-next").click();
  await expect(toolsPage.locator("#notebook")).toBeVisible();
  await toolsPage
    .getByRole("button", { name: "Fechar caderno", exact: true })
    .click();
  await toolsPage.locator("#mode-free").click();
  await toolsPage.locator("#tab-data").click();
  await toolsPage.locator("#progress").fill("0");
  await toolsPage.locator("#record-reading").click();
  await toolsPage.locator("#progress").fill("1000");
  await toolsPage.locator("#record-reading").click();
  await expect(toolsPage.locator("#data-table tbody tr")).toHaveCount(2);
  const csvPromise = toolsPage.waitForEvent("download");
  await toolsPage.locator("#export-csv").click();
  const csv = await csvPromise;
  const csvPath = await csv.path();
  assert.ok(csvPath);
  const csvText = await readFile(csvPath, "utf8");
  assert.equal(csvText.trim().split(/\r?\n/).length, 3);
  assert.match(csvText, /avanco_percentual/);
  assert.match(csvText, /80/);
  assert.match(csvText, /45.714285/);
  await toolsPage.reload();
  await toolsPage.locator("#tab-data").click();
  await expect(toolsPage.locator("#data-table tbody tr")).toHaveCount(2);
  await toolsPage
    .getByRole("button", { name: "Excluir leitura 1", exact: true })
    .click();
  await expect(toolsPage.locator("#data-table tbody tr")).toHaveCount(1);
  await toolsPage.locator("#tab-data").focus();
  await toolsPage.keyboard.press("ArrowLeft");
  await expect(toolsPage.locator("#tab-calculations")).toBeFocused();
  await expect(toolsPage.locator("#panel-calculations")).toBeVisible();
  await toolsPage.locator('[data-mode="process"]').click();
  await toolsPage.locator("#piston-handle").focus();
  await toolsPage.keyboard.press("Home");
  await expect(toolsPage.locator("#param-ratio")).toHaveValue("0.5");
  assert.match(
    await toolsPage.locator(".metric strong").first().innerText(),
    /200,0/,
  );
  const handle = await toolsPage.locator("#piston-handle").boundingBox();
  assert.ok(handle);
  await toolsPage.mouse.move(handle.x + handle.width / 2, handle.y + 10);
  await toolsPage.mouse.down();
  await toolsPage.mouse.move(handle.x + handle.width / 2, handle.y - 35, {
    steps: 10,
  });
  await toolsPage.mouse.up();
  assert.ok(Number(await toolsPage.locator("#param-ratio").inputValue()) > 0.5);
  await toolsPage.locator("#param-process").selectOption("1");
  await expect(toolsPage.locator("#piston-handle")).toBeHidden();
  await toolsPage.locator('[data-mode="identify"]').click();
  await toolsPage.locator("#tab-calculations").click();
  await expect(toolsPage.locator("#live-calculations")).toContainText(
    "Aguarde o equilíbrio",
  );
  await toolsPage.locator("#progress").fill("1000");
  await expect(toolsPage.locator("#live-calculations")).toContainText("0,385");
  await expect(toolsPage.locator("#live-calculations")).toContainText("Cobre");
  await toolsPage.locator('[data-mode="hess"]').click();
  await toolsPage.locator("#progress").fill("500");
  assert.match(
    await toolsPage.locator(".metric strong").first().innerText(),
    /-110,5/,
  );
  await toolsPage.locator("#progress").fill("1000");
  await expect(toolsPage.locator("#live-calculations")).toContainText("-393,5");
  await toolsPage.locator("#focus").click();
  await expect(toolsPage.locator("body")).toHaveClass(/focus-mode/);
  await toolsPage.locator("#focus").click();
  await toolsPage.setViewportSize({ width: 390, height: 844 });
  await toolsPage.locator('[data-mode="mix"]').click();
  await toolsPage.locator("#mode-guided").click();
  assert.ok(
    await toolsPage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await toolsPage.locator("#tab-data").click();
  assert.ok(
    await toolsPage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  // Advanced numerical investigations share the current experimental conditions.
  await toolsPage.setViewportSize({ width: 1512, height: 1100 });
  await toolsPage.locator("#mode-free").click();
  for (const e of experiments) {
    await toolsPage.locator(`[data-mode="${e.id}"]`).click();
    await toolsPage.locator("#tab-advanced").click();
    await expect(toolsPage.locator("#advanced-analysis")).not.toContainText(
      /NaN|Infinity|undefined/,
    );
    await expect(toolsPage.locator("#numeric-solution")).toBeHidden();
    await toolsPage.locator("#numeric-answer").fill("abc");
    await toolsPage
      .getByRole("button", { name: "Conferir resposta", exact: true })
      .click();
    await expect(toolsPage.locator("#numeric-feedback")).toContainText(
      "número válido",
    );
    await toolsPage.locator("#numeric-answer").fill("999999");
    await toolsPage
      .getByRole("button", { name: "Conferir resposta", exact: true })
      .click();
    await expect(toolsPage.locator("#numeric-feedback")).toContainText(
      "Ainda não",
    );
    const task = numericChallenge(e.id, e.defaults);
    await toolsPage
      .locator("#numeric-answer")
      .fill(task.answer.toFixed(4).replace(".", ","));
    await toolsPage
      .getByRole("button", { name: "Conferir resposta", exact: true })
      .click();
    await expect(toolsPage.locator("#numeric-feedback")).toContainText(
      "Correto!",
    );
    await toolsPage.locator("#reveal-solution").click();
    await expect(toolsPage.locator("#numeric-solution")).toBeVisible();
    await toolsPage.locator("#reveal-solution").click();
    await expect(toolsPage.locator("#numeric-solution")).toBeHidden();
  }
  await expect(toolsPage.locator("#numeric-progress")).toHaveText(
    "11/11 temas resolvidos",
  );
  await toolsPage.reload();
  await toolsPage.locator("#tab-advanced").click();
  await expect(toolsPage.locator("#numeric-progress")).toHaveText(
    "11/11 temas resolvidos",
  );
  await toolsPage.locator('[data-mode="identify"]').click();
  await toolsPage.locator("#thermometer-resolution").selectOption("2");
  await expect(
    toolsPage.locator("#advanced-analysis tbody tr").last(),
  ).toContainText("Cobre, Ferro");
  await toolsPage.locator("#thermometer-resolution").selectOption("0.01");
  await expect(
    toolsPage.locator("#advanced-analysis tbody tr").last(),
  ).toContainText("Cobre");
  await expect(
    toolsPage.locator("#advanced-analysis tbody tr").last(),
  ).not.toContainText("Ferro");
  await toolsPage.locator("#numeric-answer").fill("0,385");
  await toolsPage.locator("#progress").fill("500");
  await expect(toolsPage.locator("#numeric-answer")).toHaveValue("0,385");
  await toolsPage.locator("#param-metalMass").fill("200");
  await expect(toolsPage.locator("#numeric-answer")).toHaveValue("");
  await toolsPage.locator('[data-mode="phase"]').click();
  for (const [i, phase] of [
    "Sólido",
    "Fusão",
    "Líquido",
    "Ebulição",
    "Gasoso",
  ].entries()) {
    await toolsPage.locator(`[data-stage="${i}"]`).click();
    await expect(toolsPage.locator("#status")).toContainText(
      phase.toUpperCase(),
    );
  }
  await toolsPage.locator("#tab-advanced").focus();
  await toolsPage.keyboard.press("ArrowRight");
  await expect(toolsPage.locator("#tab-protocol")).toBeFocused();
  await toolsPage.keyboard.press("End");
  await expect(toolsPage.locator("#tab-advanced")).toBeFocused();
  await toolsPage.locator('[data-mode="identify"]').click();
  await toolsPage.locator("#thermometer-resolution").selectOption("2");
  await toolsPage.screenshot({
    path: "/tmp/termolab-investigation-desktop.png",
    fullPage: true,
  });
  await toolsPage.setViewportSize({ width: 390, height: 844 });
  await toolsPage.screenshot({
    path: "/tmp/termolab-investigation-mobile.png",
    fullPage: true,
  });
  for (const id of ["identify", "process", "phase"]) {
    await toolsPage.locator(`[data-mode="${id}"]`).click();
    assert.ok(
      await toolsPage.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Advanced mobile overflow: ${id}`,
    );
  }
  await toolsPage.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 11 topics, 22 presets, 11 graphs, 11 challenges, playback, scrubbing, conservation display, snapshots, comparison, restore, persistence, JSON export, Gibbs equilibrium, Carnot limit, conditional controls, mobile, dialogs, reduced motion, Senac asset, thermometer drag/keyboard, piston drag/keyboard, guided steps, live calculations, measurements persistence and CSV export, 11 numerical challenges, uncertainty controls, phase shortcuts and advanced mobile layout; no browser errors.",
  );
} finally {
  await browser.close();
}
