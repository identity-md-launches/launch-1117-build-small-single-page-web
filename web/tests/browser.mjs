import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve, extname, sep, join } from "node:path";
import { chromium } from "playwright";
const require = createRequire(import.meta.url);
const root = resolve(process.argv[2]);
const out = join(root, "artifacts");
await mkdir(out, { recursive: true });
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    let file;
    if (path === "/frame.html") {
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(
        '<!doctype html><html lang="en"><title>Iframe test</title><style>body{margin:0}iframe{display:block;width:100%;height:2400px;border:0}</style><iframe title="Poolside lab" sandbox="allow-scripts" src="/preview/"></iframe></html>',
      );
    }
    if (path === "/preview/axe.min.js")
      file = require.resolve("axe-core/axe.min.js");
    else {
      if (!path.startsWith("/preview/")) throw new Error("Outside preview");
      file = resolve(root, "dist", path.slice(9) || "index.html");
      if (!file.startsWith(join(root, "dist") + sep))
        throw new Error("Invalid path");
    }
    const data = await readFile(file);
    res.writeHead(200, {
      "Content-Type": mime[extname(file)] || "application/octet-stream",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
const report = {
  checkedAt: new Date().toISOString(),
  browser: "",
  checks: [],
  widths: [],
  errors: [],
  failedRequests: [],
  externalRequests: [],
  resources: [],
  axe: [],
  contrast: [],
};
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.POOLSIDE_CHROMIUM
      ? { executablePath: process.env.POOLSIDE_CHROMIUM }
      : {}),
    args: ["--no-sandbox"],
  });
  report.browser = browser.version();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") report.errors.push(m.text());
  });
  page.on("requestfailed", (r) =>
    report.failedRequests.push({
      url: r.url().replace(origin, ""),
      error: r.failure()?.errorText,
    }),
  );
  page.on("response", (r) => {
    if (r.status() >= 400)
      report.failedRequests.push({
        url: r.url().replace(origin, ""),
        status: r.status(),
      });
  });
  page.on("request", (r) => {
    if (!r.url().startsWith(origin)) report.externalRequests.push(r.url());
    else report.resources.push(r.url().replace(origin, ""));
  });
  await page.goto(origin + "/preview/");
  await page
    .getByRole("heading", { name: "Small trade. Big ripple." })
    .waitFor();
  await page.getByRole("region", { name: "Swap estimate", exact: true }).waitFor();
  const output = () => page.getByTestId("output").innerText();
  assert.equal(await output(), "47,482.97");
  assert.equal(await page.getByTestId("impact").innerText(), "4.75%");
  report.checks.push(
    "Default estimate matches the independent calculation: 47,482.97 TOKEN; 4.75% impact.",
  );
  await page.screenshot({
    path: join(out, "desktop-1200.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Shallow 10 ETH", exact: true })
    .click();
  assert.equal(await output(), "33,266.6");
  await page
    .getByRole("button", { name: "Deep 1,000 ETH", exact: true })
    .click();
  assert.equal(await output(), "49,602.73");
  await page.getByRole("button", { name: "Compare depths" }).click();
  assert.equal(await page.locator(".comparison-row").count(), 3);
  assert.match(
    await page.locator(".comparison-row").first().innerText(),
    /33,266.6/,
  );
  await page.screenshot({
    path: join(out, "comparison-1200.png"),
    fullPage: true,
  });
  report.checks.push(
    "Shallow, Deep, and comparison return matching results for the same trade.",
  );
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByLabel("You put in", { exact: true }).fill("0");
  assert.equal(await output(), "0");
  assert.match(
    await page.locator(".takeaway").innerText(),
    /Start with a small swap/,
  );
  assert.match(await page.locator(".metrics").innerText(), /—/);
  await page.getByRole("button", { name: "Compare depths" }).click();
  assert.deepEqual(await page.locator(".bar").evaluateAll(elements => elements.map(e => e.style.width)), ["0%", "0%", "0%"]);
  await page.getByLabel("You put in", { exact: true }).fill("");
  await page
    .getByRole("heading", { name: "A little input goes a long way." })
    .waitFor();
  assert.equal(
    await page.locator("#trade").getAttribute("aria-invalid"),
    "true",
  );
  await page.getByRole("button", { name: "Reset the experiment" }).click();
  assert.equal(await output(), "47,482.97");
  report.checks.push(
    "Zero trade, empty input, associated error state, and reset recovery work.",
  );
  await page.getByLabel("Pool fee", { exact: true }).selectOption("0");
  assert.equal(await output(), "47,619.05");
  await page.getByText("Set custom reserves", { exact: true }).click();
  await page.getByLabel("ETH reserve", { exact: true }).fill("200");
  await page.getByLabel("TOKEN reserve", { exact: true }).fill("2000000");
  assert.equal(await output(), "48,780.49");
  await page.getByLabel("ETH reserve", { exact: true }).fill("0");
  assert.equal(
    await page.locator("#reserve-eth").getAttribute("aria-invalid"),
    "true",
  );
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByLabel("ETH reserve", { exact: true }).fill("1000000000");
  await page.getByLabel("TOKEN reserve", { exact: true }).fill("0.000001");
  await page.getByRole("button", { name: "Compare depths" }).click();
  assert.equal(
    await page.getByText("Outside model limits", { exact: true }).count(),
    3,
  );
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByText("Set custom reserves", { exact: true }).click();
  report.checks.push(
    "Fee selection, custom pool, invalid reserve, and extreme comparison bounds work.",
  );
  await page.locator("#trade-range").focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.locator("#trade").inputValue(), "5.1");
  await page.keyboard.press("Home");
  assert.equal(await page.locator("#trade").inputValue(), "0");
  await page.keyboard.press("End");
  assert.equal(await page.locator("#trade").inputValue(), "25");
  report.checks.push(
    "Native range responds to ArrowRight, Home, and End and synchronizes the amount.",
  );
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.keyboard.press("Tab");
  assert.match(
    await page.evaluate(() => document.activeElement.textContent),
    /Shallow/,
  );
  await page.keyboard.press("Space");
  assert.equal(
    await page
      .getByRole("button", { name: "Shallow 10 ETH", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.screenshot({
    path: join(out, "keyboard-focus.png"),
    fullPage: false,
  });
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  report.checks.push(
    "Tab order from reset to presets and Space activation work; focus screenshot recorded.",
  );
  await page.locator(".method summary").click();
  assert.equal(await page.locator(".method").getAttribute("open"), "");
  assert.match(await page.locator(".method-content").innerText(), /tokens out/);
  await page.locator(".method summary").focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator(".method").getAttribute("open"), null);
  report.checks.push(
    "Model disclosure opens by pointer and closes using Enter.",
  );
  for (const width of [1200, 768, 360, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const sizes = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    assert.ok(
      sizes.scrollWidth <= width && sizes.bodyWidth <= width,
      `Overflow at ${width}: ${JSON.stringify(sizes)}`,
    );
    report.widths.push(sizes);
    await page.locator("#page-title").click();
    if (width === 360 || width === 320)
      await page.screenshot({
        path: join(out, `mobile-${width}.png`),
        fullPage: true,
      });
    await page.addScriptTag({ url: origin + "/preview/axe.min.js" });
    const audit = await page.evaluate(async () => {
      const r = await window.axe.run(document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
        },
      });
      return {
        violations: r.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
        incomplete: r.incomplete.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
      };
    });
    report.axe.push({ width, ...audit });
  }
  await page.setViewportSize({ width: 360, height: 900 });
  await page.getByLabel("You put in", { exact: true }).fill("1000000");
  await page.getByText("Set custom reserves", { exact: true }).click();
  await page.getByLabel("TOKEN reserve", { exact: true }).fill("1000000000000");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.getByRole("button", { name: "Compare depths" }).click();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  report.checks.push(
    "Maximum trade and token values fit at 360px in both visualizations.",
  );
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await page.getByText("Set custom reserves", { exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".reset-button")
      .evaluate((e) => getComputedStyle(e).transitionDuration),
    "0s",
  );
  report.checks.push("Reduced motion disables button transitions.");
  await page.emulateMedia({ forcedColors: "active" });
  await page.locator("#trade").focus();
  await page.keyboard.press("Tab");
  assert.equal(
    await page
      .locator("#trade-range")
      .evaluate((e) => e.matches(":focus-visible")),
    true,
  );
  await page.screenshot({
    path: join(out, "forced-colors-360.png"),
    fullPage: false,
  });
  await page.emulateMedia({
    forcedColors: "none",
    reducedMotion: "no-preference",
  });
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.waitForTimeout(150);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: join(out, "text-resize-200.png"),
    fullPage: true,
  });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  report.checks.push(
    "200% root text size has no horizontal document overflow at 1200px (not native browser zoom).",
  );
  await page.locator(".method summary").hover();
  report.contrast = await page.evaluate(() => {
    function luminance(color) {
      const rgb = color
        .match(/[\d.]+/g)
        .slice(0, 3)
        .map(Number)
        .map((v) => {
          v /= 255;
          return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
      return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    }
    const ratio = (a, b) => {
      const x = luminance(a),
        y = luminance(b);
      return +((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)).toFixed(2);
    };
    return [
      ".intro-copy",
      ".result-label",
      ".field-hint",
      ".takeaway",
      ".big-output",
      ".preset.active",
      ".chart-label",
      ".preset:not(.active)",
      ".amount-box",
      ".method-subtitle",
      ".chart-grid text",
      ".intro-art text",
      ".currency > span",
    ].map((selector) => {
      const e = document.querySelector(selector);
      let b = e;
      let background;
      while (b) {
        background = getComputedStyle(b).backgroundColor;
        if (background !== "rgba(0, 0, 0, 0)" && background !== "transparent")
          break;
        b = b.parentElement;
      }
      const foreground = e instanceof SVGElement ? getComputedStyle(e).fill : getComputedStyle(e).color;
      return {
        selector,
        foreground,
        background,
        ratio: ratio(foreground, background),
        ...([".amount-box", ".preset:not(.active)"].includes(selector) ? { border: getComputedStyle(e).borderTopColor, borderRatio: ratio(getComputedStyle(e).borderTopColor, background) } : {}),
      };
    });
  });
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto(origin + "/frame.html");
  const frame = page.frameLocator("iframe");
  await frame
    .getByRole("button", { name: "Deep 1,000 ETH", exact: true })
    .click();
  assert.equal(await frame.getByTestId("output").innerText(), "49,602.73");
  report.checks.push(
    'Module works in a 360px iframe with sandbox="allow-scripts" and no wallet/storage permissions.',
  );
  assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
  assert.equal(
    report.failedRequests.length,
    0,
    JSON.stringify(report.failedRequests),
  );
  assert.equal(report.externalRequests.length, 0);
  assert.equal(
    report.axe.flatMap((a) => a.violations).length,
    0,
    JSON.stringify(report.axe),
  );
  report.status = "passed";
  console.log(JSON.stringify({ status: report.status, browser: report.browser, checks: report.checks.length, widths: report.widths, violations: report.axe.flatMap(a => a.violations).length, errors: report.errors, failedRequests: report.failedRequests, externalRequests: report.externalRequests }, null, 2));
} catch (e) {
  report.status = "failed";
  report.failure = String(e.stack);
  console.error(e);
  process.exitCode = 1;
} finally {
  await writeFile(
    join(out, "browser-checks.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser?.close();
  await new Promise((r) => server.close(r));
}
