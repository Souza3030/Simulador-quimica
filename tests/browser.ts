import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5173");
  await page.getByRole("heading", { name: "Da água ao vapor" }).waitFor();
  await page.getByRole("button", { name: "▶ Iniciar" }).click();
  await page.waitForTimeout(1200);
  assert.notEqual(await page.locator("#metric-b").innerText(), "0,0 kJ");
  await page.getByRole("button", { name: "Ⅱ Pausar" }).click();
  await page.getByRole("button", { name: "↺ Reiniciar" }).click();
  assert.match(await page.locator("#metric-a").innerText(), /−? ?-?20/);
  await page.getByRole("button", { name: "02 Entalpia das reações" }).click();
  await page.locator("#reaction").selectOption("decomposition");
  assert.match(await page.locator("#state-label").innerText(), /ENDOTÉRMICA/);
  await page.getByRole("button", { name: "▶ Iniciar" }).click();
  await page.waitForTimeout(500);
  assert.ok(
    Number(
      (await page.locator("#metric-a").innerText())
        .replace("°C", "")
        .replace(",", "."),
    ) < 25,
  );
  await page.getByRole("button", { name: "03 Primeira lei" }).click();
  assert.match(await page.locator("#metric-c").innerText(), /20/);
  await page.locator("#q").fill("-50");
  assert.match(await page.locator("#metric-c").innerText(), /-60/);
  await page.getByRole("button", { name: "? Guia rápido" }).click();
  assert.ok(await page.locator("dialog").isVisible());
  await page.getByRole("button", { name: "Vamos explorar" }).click();
  await page
    .getByRole("button", { name: "01 Calor e estados físicos" })
    .click();
  await page.screenshot({ path: "/tmp/termolab-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({ path: "/tmp/termolab-mobile.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    "Browser: heating, reset, endothermic reaction, first law, guide and mobile layout passed.",
  );
} finally {
  await browser.close();
}
