# Poolside design

## Overview

Poolside is a short, exploratory swap lesson for Ethereum holders and Ground sheet visitors. The implemented page uses warm paper surfaces, dark green type, a simple liquidity illustration, and a live chart. A large editorial heading introduces one work area: controls first, results second, with explanatory field notes below. The tone is curious and direct. The page is a standalone module, not an imitation of the host site's branding.

Source of truth: `web/src/styles.css`, `web/src/main.tsx`, and `web/src/pool.ts`. The inline SVG illustration and plot are original code-native assets. `web/public/favicon.svg` reuses the pool motif.

## Colors

Colors are canonical hex primitives mapped to semantic CSS properties in `:root` of `web/src/styles.css`. Components consume the semantic properties.

| Semantic token | Value | Implemented purpose |
| --- | --- | --- |
| `--color-bg` | `#f6f5ef` | Page and amount-field background |
| `--color-surface` | `#fffefa` | Lab surface and input backgrounds |
| `--color-subtle` | `#edeee6` | Hover surfaces and comparison tracks |
| `--color-text` | `#243d36` | Primary text and numeric output |
| `--color-muted` | `#58675e` | Supporting text, labels, dotted reference curve |
| `--color-border` | `#d8ddd3` | Structural dividers and decorative grid |
| `--color-control-border` | `#7f8c82` | Input and preset boundaries; range track |
| `--color-accent`, `--color-focus` | `#194c42` | Selected state, recovery action, focus outline |
| `--color-accent-hover` | `#286357` | Recovery action hover |
| `--color-selected` | `#e9f0e7` | Selected preset, result hint, plot fill |
| `--color-on-accent` | `#fffefa` | Text/icons on the filled action and mark |
| `--color-warning` | `#a84324` | Invalid input and impact of 5% or more |
| `--color-warning-surface` | `#f9eee4` | Elevated-impact explanation and point halo |
| `--color-plot` | `#286357` | Solid output curve and comparison bars |
| `--color-point` | `#c45532` | Current-trade plot marker and decorative token |

Status is always stated in text as well as color. The filled recovery button appears in the invalid state; the normal experience updates directly without a submit action. The orange plot marker is not an interactive control. There is one light theme, plus native forced-color adaptations.

Measured rendered contrast includes muted text on page **5.47:1**, muted text on the lab **5.92:1**, green text on the hint **8.40:1**, and output text on the lab **11.59:1**. See the validation evidence for pair definitions and remaining automated/manual coverage limits.

## Typography

- Body: `Arial`, `Helvetica Neue`, `sans-serif`. Editorial emphasis: `Georgia`, `Times New Roman`, `serif`. Monospace labels: `SFMono-Regular`, `Consolas`, `Liberation Mono`, `monospace`. No downloaded font files. Actual installed font selection varies by platform.
- Root is 16px, line-height 1.5. Role tokens are `--text-xs` 0.75rem, `--text-sm` 0.8125rem, `--text-ui` 0.875rem, `--text-body` 1rem, and `--text-section` 1.125rem.
- Main heading: `clamp(2.8rem, 5.1vw, 3.8rem)`, line-height 1.03, tracking −0.052em, requested weight 500. The italic word uses Georgia at weight 400, tracking −0.06em. At 47rem the heading is 48px; at 34rem it is 51px.
- Section headings: generally 14px/600, with field-note heading 17px/500 (16px on small screens). Note headings are 15px/600, rising to 16px on small screens. Body/explanatory text is 13–15px with 1.6–1.7 line-height; field notes use 14px on phones.
- Field captions, secondary values, and most labels use 12px. The decorative hero diagram alone uses 7px annotations; it is hidden from assistive technology and absent at phone sizes. Chart tick labels are a stable 12 SVG units in a plot whose view box follows its rendered width.
- Numeric input: 32px. Output: responsive 27.2–40px, then 30/34/28px at the implemented breakpoints. Impact: 28px, 25px at the smallest breakpoint. Changing values use tabular numerals and may wrap instead of truncating.
- Headings use balanced wrapping; prose uses pretty wrapping. Intro measure is 380px, explanatory notes about 36ch, model disclosure 75ch. Text stays selectable. System fonts are requested at weights 400–700; no claim is made that every requested weight has a distinct installed face. Font synthesis is disabled.

## Layout

`site-shell` has a maximum width of 1168px, centered, with 36px inline padding. The header has a shared baseline and thin divider. The hero uses a 1.3:1 two-column grid. The main lab uses a 34% controls column and a flexible results column, separated by a structural border. Field notes form three equal columns.

The declared spacing scale is 4, 8, 12, 16, 24, 32, and 48px. The compact lab also uses optical spacings of 20, 22, 25, and 28px, all visible in the component rules. Grouping is carried by section space and tonal surfaces; borders separate controls and chart sections. Padding and borders use logical inline/block properties where meaningful.

| Rule | Implemented response |
| --- | --- |
| At or below 62rem | Shell padding 26px; controls take 36%; header descriptor is hidden; plot panel spacing tightens |
| At or below 47rem | Shell padding 20px; single-column lab; controls above results; 44px select, range, reset, and view controls; compact live estimate beside the slider |
| At or below 34rem | Shell padding 16px; decorative hero graphic is hidden; field notes and footer stack; explanation wraps; model subtitle occupies its own line |
| Lab container at or below 47rem | Stack the workspace, wrap result/header rows, and distribute metrics in three flexible columns; this also responds to enlarged root text |

No essential data is hidden at a breakpoint. Custom reserves and model details use visible native disclosure controls. On phones, the inline estimate gives immediate feedback without having to scroll to the chart. Inputs and chart containers use `min-width: 0`; long numbers wrap. The chart uses `ResizeObserver` to match its SVG view box to the available width, keeping labels readable.

Observed: no horizontal document overflow at 320, 360, 768, or 1200 CSS pixels, including large input values at 360px. A 200% root-font-size check at 1200px stacked the lab without horizontal document overflow. This check is not native browser zoom and does not scale fixed-pixel annotations.

## Elevation & Depth

The interface is deliberately flat. Lab borders and internal dividers establish structure; selected presets receive a 1px inset outline in addition to their border. The range thumb has a 1px outline-like shadow. There are no floating panels, modal shadows, tooltips, or overlays. A pale fill under the plot supports the solid curve without replacing it.

## Shapes

`--radius-sm` is 6px (controls, hint, disclosure focus region), `--radius-md` is 10px (amount field), and `--radius-lg` is 14px (outer lab). The small-screen lab radius is 10px. The mark and chart marker are circles; the tiny experiment symbol is a rotated square. Structural borders are 1px. Keyboard focus is a 2px solid perimeter with a 4px offset; forced colors uses the system `Highlight` color.

## Components

All component definitions currently live in `web/src/main.tsx`; they are local functions/patterns, not an exported component library.

| Component or pattern | Reuse and behavior |
| --- | --- |
| `Icon` | Local 24-unit SVG set; `name` is pool, arrow, reset, info, or plus. Uses `currentColor`, 1.6 stroke, hidden decorative semantics |
| Preset group | Native buttons inside a labeled fieldset; `aria-pressed` exposes selection; changing either custom reserve removes the preset selection |
| Amount field / range | Visible associated labels; decimal text input and native keyboard-operable slider share one state; empty/invalid amounts suppress stale results and show associated recovery instructions |
| Fee selector | Native select; 0%, 0.05%, 0.30%, 1.00%; display includes fee amount separately |
| Custom reserves | Native details/summary with a plus/cross cue; labeled inputs validate bounded positive reserves |
| Result header / metrics | Estimated output, fee-excluding impact, starting rate, average rate including fee, and fee paid; zero trade has an explicitly undefined average |
| `Curve({input})` | Accessible SVG with dynamic title/description; solid pool curve, dotted same-fee reference, point/crosshair for selected trade; numeric information also exists in HTML |
| `Comparison({input})` | Same starting rate at 10/100/1000 ETH depths; three rows with output, impact, and ratio bars; out-of-model rows explicitly say so |
| Visualization switch | Two native pressed buttons; no fake tab roles or unsupported composite keyboard behavior |
| Mobile estimate | A compact readout close to the slider, displayed below the 47rem viewport breakpoint |
| Takeaway / invalid state | Text and color reinforce the impact; invalid state offers Reset the experiment. No asynchronous loading state exists |
| Model disclosure | Native details/summary; formulas, metric definitions, and assumptions are in the page |
| Build note | Visible paragraph stating what was built and why, with a decorative pool icon |

A stable polite status region announces estimates after 500ms of inactivity. Controls update visually immediately. Hover styles are gated by `hover: hover`. Under `prefers-reduced-motion: no-preference`, buttons have 120ms background/transform transitions and a 0.96 press scale with `cubic-bezier(0.2, 0, 0, 1)`. Reduced motion removes those transitions. There is no entrance animation or autoplay.

## Do's and Don'ts

- Reuse semantic color roles; keep decorative dividers distinct from the higher-contrast control boundary token.
- Keep number formatting and pool calculations in `pool.ts`; state the units and whether a metric includes fees.
- Keep the range native, errors associated with inputs, and disclosure controls in normal document flow.
- Preserve the system-font approach and bundle any future required assets locally.
- Do not present illustrative reserves as real pool data or add runtime network dependencies.
- To add a related section, start inside `site-shell`, reuse the heading/field-note patterns and semantic tokens, preserve the 16px phone margin, then recheck the same four widths and keyboard flow. This module deliberately has no second route.
