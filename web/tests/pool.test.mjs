import test from "node:test";
import assert from "node:assert/strict";
import {
  LIMITS,
  PRESETS,
  parseAmount,
  quote,
  formatNumber,
} from "../src/pool.ts";
const base = { trade: 5, eth: 100, tokens: 1_000_000, fee: 0.003 };
const close = (actual, expected, tolerance = 1e-10) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)),
    `${actual} differs from ${expected}`,
  );

test("default output matches an independent integer AMM calculation", () => {
  const amountIn = 5n * 10n ** 18n;
  const reserveIn = 100n * 10n ** 18n;
  const reserveOut = 1_000_000n * 10n ** 18n;
  const expected =
    (amountIn * 997n * reserveOut) / (reserveIn * 1000n + amountIn * 997n);
  const result = quote(base);
  close(result.output, Number(expected) / 1e18);
  close(result.feePaid, 0.015);
  close(result.impact, (1 - result.output / 49850) * 100);
  close(result.averageRate, result.output / 5);
  close(result.afterEth, 105);
});

test("a fee-free pool preserves its product", () => {
  const result = quote({ trade: 10, eth: 100, tokens: 1000, fee: 0 });
  close(result.output, 1000 / 11);
  close(result.afterEth * result.afterTokens, 100000);
});

test("zero trade has zero output, impact and fee, and no average rate", () => {
  const result = quote({ ...base, trade: 0 });
  assert.equal(result.output, 0);
  assert.equal(result.impact, 0);
  assert.equal(result.feePaid, 0);
  assert.equal(result.averageRate, null);
});

test("more depth at the same starting rate returns more tokens", () => {
  const results = PRESETS.map((p) => quote({ ...base, ...p }));
  assert.ok(
    results[0].output < results[1].output &&
      results[1].output < results[2].output,
  );
  assert.ok(
    results[0].impact > results[1].impact &&
      results[1].impact > results[2].impact,
  );
});

test("fees reduce output and are excluded from the impact metric", () => {
  const withFee = quote(base),
    without = quote({ ...base, fee: 0 });
  assert.ok(withFee.output < without.output);
  close(withFee.impact, 100 * (1 - withFee.output / withFee.ideal));
});

test("empty, negative, nonfinite, commas, exponents and malformed inputs are rejected", () => {
  for (const value of [
    "",
    " ",
    "-1",
    "NaN",
    "Infinity",
    "1,000",
    "1e5",
    "5 ETH",
    "1.2.3",
    "+5",
  ])
    assert.equal(parseAmount(value, LIMITS.trade, true), null, value);
  assert.equal(parseAmount("0", LIMITS.eth), null);
  assert.equal(parseAmount("0.0000001", LIMITS.eth), null);
  assert.equal(parseAmount("1000001", LIMITS.trade, true), null);
});

test("editing-friendly decimals, zero and exact bounds are accepted", () => {
  assert.equal(parseAmount("5.", LIMITS.trade, true), 5);
  assert.equal(parseAmount(".5", LIMITS.trade, true), 0.5);
  assert.equal(parseAmount(" 5.25 ", LIMITS.trade, true), 5.25);
  assert.equal(parseAmount("0", LIMITS.trade, true), 0);
  assert.equal(parseAmount("0.000001", LIMITS.eth), 0.000001);
  for (const max of Object.values(LIMITS))
    assert.equal(parseAmount(String(max), max), max);
});

test("quote independently rejects invalid numeric state", () => {
  for (const patch of [
    { trade: -1 },
    { eth: 0 },
    { tokens: NaN },
    { fee: 1 },
    { fee: -0.1 },
    { trade: Infinity },
    { trade: LIMITS.trade + 1 },
    { eth: LIMITS.eth + 1 },
    { tokens: LIMITS.tokens + 1 },
  ])
    assert.throws(() => quote({ ...base, ...patch }), RangeError);
});

test("tiny nonzero values remain visible", () => {
  assert.notEqual(formatNumber(1e-12), "0");
  assert.notEqual(formatNumber(0.000001), "0");
  assert.equal(formatNumber(0), "0");
});

test("500 deterministic varied scenarios maintain invariants and monotonic output", () => {
  let seed = 12345;
  function random() {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 2 ** 32;
  }
  for (let i = 0; i < 500; i++) {
    const eth = 10 ** (random() * 9 - 3),
      tokens = 10 ** (random() * 12 - 3);
    const trade = 10 ** (random() * 9 - 4),
      fee = random() * 0.01;
    const r = quote({ eth, tokens, trade, fee });
    assert.ok(Number.isFinite(r.output) && r.output > 0 && r.output < tokens);
    assert.ok(r.impact >= 0 && r.impact < 100);
    assert.ok(r.afterEth * r.afterTokens >= eth * tokens * (1 - 1e-7));
    assert.ok(
      quote({ eth, tokens, trade: trade * 1.01, fee }).output > r.output,
    );
    close(r.output / r.ideal, 1 - r.impact / 100, 1e-8);
  }
});
