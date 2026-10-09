# Poolside — Swap impact lab

A finished, browser-only module for the Ground sheet. Change an ETH trade, switch between three liquidity depths, or enter custom reserves. The output curve and depth comparison explain why the same trade can produce different results. A visible paragraph on the page explains what was built and why.

**Production entry:** [`dist/index.html`](dist/index.html). React + TypeScript source, Vite configuration, exact dependency versions, and the npm lockfile are in [`web/`](web/). The export is included; publishing does not require rebuilding it.

## Use in under a minute

1. Start with the default 5 ETH trade in the Balanced pool.
2. Select Shallow, then Deep. Watch output and price impact change.
3. Select Compare depths to compare the same trade at the same starting price.
4. Adjust the slider or type an amount. On narrow screens, a compact estimate appears beside the controls.
5. Optionally set custom reserves or a different fee. Reset restores the initial experiment.

All reserves are hypothetical; TOKEN is a generic asset. The module does not fetch chain data, connect a wallet, sign transactions, request credentials, store inputs, or contact any external runtime service. Its Content Security Policy includes `connect-src 'none'`. All graphics are local SVG/CSS, and typography uses system fonts.

## Install and rebuild

Requires Node.js 22 and npm. Tested with Node 22.23.3 and npm 10.9.9.

Run from the repository root:

```sh
node web/scripts/run.mjs install
node web/scripts/run.mjs typecheck
node --experimental-strip-types --test web/tests/pool.test.mjs
node web/scripts/run.mjs build
```

The installer runs `npm ci` against `web/package-lock.json`. To respect this assignment's restriction on repository `node_modules/`, it installs dependencies and stages builds in a dedicated `poolside-*` directory under the system temporary directory. Its npm cache also stays in the temporary directory. No repository ignore file or dependency archive is needed. Source changes are copied into staging before each command; the build replaces the repository's `dist/` only after Vite succeeds. These temporary dependencies can be deleted after use and recreated by the install command.

Once the npm cache is populated, an offline reinstall is supported and was checked:

```sh
node web/scripts/run.mjs install --offline
```

A first install on a clean machine needs registry access. The production build and typecheck use installed dependencies without network access. The exported page needs no network connection after its local static assets load.

Equivalent package scripts are available from `web/`: `npm run setup`, `npm run build`, `npm run typecheck`, `npm test`, and `npm run preview`. Do not run a normal in-repository `npm install` for this submission workflow.

## Preview and publish

```sh
node web/scripts/preview.mjs
```

Open `http://127.0.0.1:4173/preview/`. This intentionally previews a subpath to check relative URLs. Set `PORT` if necessary; stop with Ctrl+C. Serve over HTTP(S), rather than opening the ES-module entry as a local file.

Upload **all contents of `dist/`**, including `assets/`, `favicon.svg`, and `THIRD_PARTY_LICENSES.txt`, to a static host at the chosen module path. Vite uses `base: './'`; the page has no server routes and needs no rewrite rule or backend. Keep the asset filenames produced by the build. Neither `web/` nor `artifacts/` is needed by the published page.

Embed the resulting index URL using an iframe with an accessible title, width `100%`, and a height appropriate to the Ground sheet. Allow normal iframe scrolling. JavaScript must be enabled. No wallet, clipboard, storage, camera, location, or download permissions are requested. If a host applies an iframe sandbox, it should allow scripts and same-origin asset access, or configure CORS for a sandbox with an opaque origin.

## Checks actually run

- Production Vite build: passed after the final source changes.
- TypeScript `tsc --noEmit`: passed.
- Node test runner: **10 tests passed**, including an independent integer AMM calculation, invalid inputs, zero trade, limits, fees, and 500 deterministic varied invariant/monotonicity scenarios.
- Chromium production-export interaction tests: passed at a real `/preview/` subpath, including preset changes, fee selection, custom reserves, invalid/empty recovery, comparison, extreme values, reset, range keyboard controls, and disclosures.
- Responsive measurements: no horizontal document overflow at **320, 360, 768, and 1200 CSS pixels**. Screenshots were inspected at the required 360 and 1200 widths, plus narrow, focus, forced-color, and text-enlargement states.
- Axe checks: no automatically detected WCAG A/AA violations in the checked default states. Some checks require manual review; this is not a claim of accessibility certification.
- Runtime observation: no page/console errors, failed resource requests, or external requests in the tested flows. A sandboxed 360px iframe interaction passed.
- Offline locked reinstall: passed using the populated temporary npm cache.
- Static export/path/size check: `node web/scripts/check-export.mjs` passed. Runtime assets total about 237 KB; the full raw deliverable is about 1.76 MB, below the 8 MiB budget.

See [`artifacts/validation.md`](artifacts/validation.md) for the six-domain Better Interface review, reproduced findings, corrections, contrast measurements, and limitations. [`artifacts/browser-checks.json`](artifacts/browser-checks.json) contains machine-recorded results; screenshots are in the same directory. [`DESIGN.md`](DESIGN.md) documents the final implementation.

To rerun rendered checks:

```sh
node web/scripts/run.mjs install-browser
node web/scripts/run.mjs browsercheck
```

The browser test starts and closes its own temporary HTTP server and browser within one foreground process. It writes evidence to `artifacts/`. An existing compatible Chromium executable can be selected with `POOLSIDE_CHROMIUM`. The recorded run used the environment's Chromium headless shell, version 153.0.8010.12. The supplied browser connector returned `Transport closed`; local Playwright provided the actual browser checks instead.

## Model and limitations

For ETH reserve `x`, token reserve `y`, trade `a`, and fee fraction `f`:

```text
net input = a × (1 − f)
output = y × net input / (x + net input)
price impact = net input / (x + net input) × 100
starting rate = y / x
average rate = output / a
```

Price impact compares output with the starting rate after the same fee. Average rate includes the fee. At a zero trade the average rate is undefined and displayed as a dash. Comparison holds the entered starting token/ETH ratio constant; rows whose resulting token reserves exceed the model's numeric limits are explicitly unavailable. The ETH side represents wrapped ETH in an actual pair.

The model follows constant-product pool mechanics described in the [Uniswap v2 pricing documentation](https://developers.uniswap.org/docs/protocols/v2/concepts/pricing), read during implementation. It excludes gas, taxes, integer token rounding, routing, competing trades, and concentrated liquidity. It is a learning simulation, not a live quote. Numeric bounds and browser floating-point precision are documented in `web/src/pool.ts` and in the interface.

Physical devices, Safari/Firefox, a native screen-reader session, and native browser 200% zoom were not tested. A 200% root-font-size check and 320px reflow check were performed separately. The model graphic's axis labels use fixed SVG text sizes; system font rendering can vary across platforms. English and a single light theme are the supported variants.

The task described existing modules 1–3 clearly; this is neither a unit converter, stacking game, nor pool-alert monitor. Modules 4, 6, and 7 had truncated descriptions, and their URLs returned access errors/HTTP 403 during research. Overlap with their undisclosed functionality could not be independently ruled out.

Third-party runtime licenses are bundled in `dist/THIRD_PARTY_LICENSES.txt`. Pinned design-guide attribution and licenses are retained under `docs/`. No ignore file was added or changed, no dependency/cache directory or archive is included, and no external deployment was performed.
