import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
    path: "/tmp/termolab-v2-desktop.png",
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
    "9/9 descobertas",
  );
  await expect(page.locator("#visited-count")).toHaveText("9 / 9");
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
    path: "/tmp/termolab-v2-mobile.png",
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
  assert.deepEqual(errors, []);
  console.log(
    "PASS: nine topics, 18 presets, nine graphs, nine challenges, playback, scrubbing, conservation display, snapshots, comparison, restore, persistence, JSON export, Gibbs equilibrium, Carnot limit, conditional controls, mobile, dialogs, reduced motion; no browser errors.",
  );
} finally {
  await browser.close();
}
