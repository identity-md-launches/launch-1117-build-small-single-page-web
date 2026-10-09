import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  PRESETS,
  LIMITS,
  parseAmount,
  quote,
  formatNumber as fmt,
  compact,
  impactLabel,
} from "./pool";
import type { PoolInput } from "./pool";
import "./styles.css";

function Icon({
  name,
  className = "",
}: {
  name: "pool" | "arrow" | "reset" | "info" | "plus";
  className?: string;
}) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "pool" && (
        <>
          <ellipse cx="12" cy="7" rx="9" ry="4" />
          <path d="M3 12c0 2.2 4 4 9 4s9-1.8 9-4M3 17c0 2.2 4 4 9 4s9-1.8 9-4" />
        </>
      )}
      {name === "arrow" && <path d="M5 12h14m-5-5 5 5-5 5" />}
      {name === "reset" && (
        <>
          <path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" />
        </>
      )}
      {name === "info" && (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6m0-10v.1" />
        </>
      )}
      {name === "plus" && <path d="M12 5v14M5 12h14" />}
    </svg>
  );
}

function Curve({ input }: { input: PoolInput }) {
  const chartRef = useRef<SVGSVGElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(604);
  useEffect(() => {
    if (!chartRef.current) return;
    const observer = new ResizeObserver(([entry]) =>
      setCanvasWidth(Math.max(240, Math.round(entry.contentRect.width))),
    );
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, []);
  const result = quote(input);
  const xMax = Math.max(25, Math.ceil(input.trade / 5) * 5);
  const yMax = xMax * (1 - input.fee) * result.spotRate;
  const left = 56,
    top = 22,
    width = canvasWidth - 72,
    height = 198;
  const x = (n: number) => left + (n / xMax) * width;
  const y = (n: number) => top + height - (n / yMax) * height;
  const points = Array.from({ length: 121 }, (_, i) => {
    const t = (xMax * i) / 120;
    return `${x(t)},${y(quote({ ...input, trade: t }).output)}`;
  }).join(" ");
  const px = x(input.trade),
    py = y(result.output);
  return (
    <figure className="curve-figure">
      <div className="chart-label">
        Tokens received <span>Hypothetical TOKEN</span>
      </div>
      <svg
        ref={chartRef}
        className="curve"
        viewBox={`0 0 ${canvasWidth} 260`}
        role="img"
        aria-labelledby="curve-title curve-desc"
      >
        <title id="curve-title">Token output by ETH trade size</title>
        <desc id="curve-desc">
          For {fmt(input.trade, 6)} ETH, this pool returns {fmt(result.output)}{" "}
          tokens. Price impact is {fmt(result.impact)} percent, excluding the
          fee. The dotted line shows output at the starting rate after the same
          fee.
        </desc>
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f} className="chart-grid">
            <line
              x1={left}
              x2={left + width}
              y1={top + height * f}
              y2={top + height * f}
            />
            <text x={left - 12} y={top + height * f + 4} textAnchor="end">
              {compact(yMax * (1 - f))}
            </text>
            <line
              x1={left + width * f}
              x2={left + width * f}
              y1={top}
              y2={top + height}
            />
            <text
              x={left + width * f}
              y={top + height + 24}
              textAnchor="middle"
            >
              {compact(xMax * f)}
            </text>
          </g>
        ))}
        <path
          d={`M${left},${top + height} L${left + width},${top}`}
          className="ideal-line"
        />
        <polygon
          points={`${left},${top + height} ${points} ${left + width},${top + height}`}
          className="curve-fill"
        />
        <polyline points={points} className="output-line" />
        <path
          d={`M${px},${top + height} V${py} H${left}`}
          className="crosshair"
        />
        <circle cx={px} cy={py} r="9" className="point-halo" />
        <circle cx={px} cy={py} r="4.5" className="point" />
      </svg>
      <figcaption>
        <span>
          <i className="legend-line" /> Pool output
        </span>
        <span>
          <i className="legend-line dashed" /> Starting rate, after fee
        </span>
        <span className="axis-caption">Trade size · ETH</span>
      </figcaption>
    </figure>
  );
}

function Comparison({ input }: { input: PoolInput }) {
  // Keep the user's starting token/ETH ratio constant while changing pool depth.
  const spot = input.tokens / input.eth;
  return (
    <div className="comparison">
      <div className="comparison-heading">
        <span>Same trade. Different depths.</span>
        <span>{fmt(input.trade, 6)} ETH</span>
      </div>
      <p>Each pool starts at the same token price.</p>
      <div className="comparison-rows">
        {PRESETS.map((p) => {
          const canCompare =
            p.eth * spot <= LIMITS.tokens && p.eth * spot >= 0.000001;
          const result = canCompare
            ? quote({ ...input, eth: p.eth, tokens: p.eth * spot })
            : null;
          return (
            <div className="comparison-row" key={p.id}>
              <div className="comparison-name">
                <strong>{p.label}</strong>
                <span>{fmt(p.eth)} ETH reserve</span>
              </div>
              <div className="comparison-output">
                {result ? (
                  <>
                    <strong>
                      {fmt(result.output)} <small>TOKEN</small>
                    </strong>
                    <div className="bar-track">
                      <div
                        className="bar"
                        style={{
                          width: `${(input.trade === 0 ? 0 : Math.max(0, 100 - result.impact))}%`,
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <span>Outside model limits</span>
                )}
              </div>
              <span className="comparison-impact">
                {result ? `${fmt(result.impact)}%` : "—"}
                <small>impact</small>
              </span>
            </div>
          );
        })}
      </div>
      <p className="comparison-footnote">
        Bars show output as a share of the starting-rate estimate, after fees.
      </p>
    </div>
  );
}

function App() {
  const [trade, setTrade] = useState("5");
  const [eth, setEth] = useState("100");
  const [tokens, setTokens] = useState("1000000");
  const [fee, setFee] = useState("0.003");
  const [view, setView] = useState<"curve" | "compare">("curve");
  const [announcement, setAnnouncement] = useState("");
  const tradeValue = parseAmount(trade, LIMITS.trade, true);
  const ethValue = parseAmount(eth, LIMITS.eth);
  const tokenValue = parseAmount(tokens, LIMITS.tokens);
  const valid = tradeValue !== null && ethValue !== null && tokenValue !== null;
  const input = valid
    ? { trade: tradeValue, eth: ethValue, tokens: tokenValue, fee: Number(fee) }
    : null;
  const result = input ? quote(input) : null;
  const activePreset = PRESETS.find(
    (p) => String(p.eth) === eth && String(p.tokens) === tokens,
  );
  const rangeMax = Math.max(25, tradeValue ?? 0);
  const tradeError =
    "Enter an ETH amount from 0 to 1,000,000, using a decimal point.";
  const reserveError = "Use a number from 0.000001 to ";
  useEffect(() => {
    const timeout = window.setTimeout(
      () =>
        setAnnouncement(
          result
            ? `Estimated output: ${fmt(result.output)} tokens. Price impact: ${fmt(result.impact)} percent, excluding fees.`
            : "Check the highlighted inputs to see the estimate.",
        ),
      500,
    );
    return () => window.clearTimeout(timeout);
  }, [trade, eth, tokens, fee]);
  const selectPreset = (p: (typeof PRESETS)[number]) => {
    setEth(String(p.eth));
    setTokens(String(p.tokens));
  };
  const reset = () => {
    setTrade("5");
    setEth("100");
    setTokens("1000000");
    setFee("0.003");
    setView("curve");
  };
  return (
    <>
      <a className="skip-link" href="#lab">
        Skip to swap lab
      </a>
      <div className="site-shell">
        <header className="site-header">
          <div className="wordmark">
            <span className="brand-icon">
              <Icon name="pool" />
            </span>
            <span>
              poolside<span className="wordmark-dot">.</span>
            </span>
            <span className="header-divider" />
            <span className="eyebrow header-subtitle">
              A Ground sheet experiment
            </span>
          </div>
          <span className="local-badge">
            <span className="status-dot" /> Local simulation
          </span>
        </header>
        <main>
          <section className="intro" aria-labelledby="page-title">
            <div>
              <p className="eyebrow intro-eyebrow">The swap impact lab</p>
              <h1 id="page-title">
                Small trade.
                <br />
                Big <em>ripple.</em>
              </h1>
              <p className="intro-copy">
                A swap changes the pool it trades in. Explore how size and
                liquidity shape the tokens you receive.
              </p>
            </div>
            <div className="intro-art" aria-hidden="true">
              <svg viewBox="0 0 320 192" fill="none">
                <path d="M36 145h249M159 16v157" className="art-guide" />
                <ellipse
                  cx="159"
                  cy="123"
                  rx="118"
                  ry="39"
                  className="art-ring"
                />
                <ellipse
                  cx="159"
                  cy="111"
                  rx="94"
                  ry="32"
                  className="art-ring"
                />
                <ellipse
                  cx="159"
                  cy="99"
                  rx="67"
                  ry="24"
                  className="art-ring"
                />
                <ellipse
                  cx="159"
                  cy="85"
                  rx="37"
                  ry="15"
                  className="art-ring"
                />
                <path
                  d="m159 31 14 22-14 8-14-8 14-22Zm0 36 14-8-14 19-14-19 14 8Z"
                  className="art-token"
                />
                <path
                  d="M42 40h45m-22-22v44M252 153h20m-10-10v20"
                  className="art-guide"
                />
                <circle cx="252" cy="71" r="4" className="art-dot" />
                <path d="m223 53 27 15" className="art-guide" />
                <text x="190" y="45">
                  Every swap leaves a ripple.
                </text>
                <text x="34" y="184">
                  FIG. 01 — THE LIQUIDITY EFFECT
                </text>
              </svg>
            </div>
          </section>
          <section id="lab" className="lab" aria-label="Interactive swap lab">
            <div className="lab-topline">
              <span>
                <span className="live-mark" /> Experiment with a swap
              </span>
              <span className="model-tag">
                Constant-product model <span> / </span> x × y = k
              </span>
            </div>
            <div className="workspace">
              <div className="controls">
                <div className="section-title">
                  <h2>
                    <span className="step">01</span> Set the scene
                  </h2>
                  <button className="reset-button" onClick={reset}>
                    <Icon name="reset" /> Reset
                  </button>
                </div>
                <fieldset className="pool-fieldset">
                  <legend>Pool depth</legend>
                  <div className="presets">
                    {PRESETS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => selectPreset(p)}
                        aria-pressed={activePreset?.id === p.id}
                        className={
                          activePreset?.id === p.id ? "preset active" : "preset"
                        }
                      >
                        <span>{p.label}</span>
                        <small>{fmt(p.eth)} ETH</small>
                      </button>
                    ))}
                  </div>
                  <p className="field-hint">
                    {activePreset
                      ? `${fmt(activePreset.tokens)} TOKEN paired with ${fmt(activePreset.eth)} ETH.`
                      : "Custom reserves. Your pool, your experiment."}
                  </p>
                </fieldset>
                <div className="trade-group">
                  <div className="label-row">
                    <label htmlFor="trade">You put in</label>
                    <span className="small-label">ETH → TOKEN</span>
                  </div>
                  <div
                    className={`amount-box ${tradeValue === null ? "has-error" : ""}`}
                  >
                    <input
                      id="trade"
                      name="trade"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={trade}
                      onChange={(e) => setTrade(e.target.value)}
                      aria-invalid={tradeValue === null}
                      aria-describedby={
                        tradeValue === null ? "trade-error" : "trade-hint"
                      }
                    />
                    <span className="currency">
                      <span aria-hidden="true">◇</span> ETH
                    </span>
                  </div>
                  {tradeValue === null && (
                    <p className="error" id="trade-error">
                      {tradeError}
                    </p>
                  )}
                  <label htmlFor="trade-range" className="sr-only">
                    Adjust trade size in ETH
                  </label>
                  <input
                    id="trade-range"
                    type="range"
                    min="0"
                    max={rangeMax}
                    step="0.1"
                    value={tradeValue ?? 0}
                    onChange={(e) => setTrade(e.target.value)}
                    aria-valuetext={`${fmt(tradeValue ?? 0, 6)} ETH`}
                    style={
                      {
                        "--range-fill": `${((tradeValue ?? 0) / rangeMax) * 100}%`,
                      } as React.CSSProperties
                    }
                  />
                  <div className="range-labels">
                    <span>0 ETH</span>
                    <span>{fmt(rangeMax)} ETH</span>
                  </div>
                  <p id="trade-hint" className="field-hint">
                    Drag the slider or enter an amount.
                  </p>
                  {result && (
                    <div className="mobile-estimate">
                      <span>Estimated tokens received</span>
                      <strong>{fmt(result.output)} TOKEN</strong>
                      <span>
                        {fmt(result.impact)}% price impact · excludes fee
                      </span>
                    </div>
                  )}
                </div>
                <div className="fee-row">
                  <label htmlFor="fee">Pool fee</label>
                  <select
                    id="fee"
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                  >
                    <option value="0">0%</option>
                    <option value="0.0005">0.05%</option>
                    <option value="0.003">0.30%</option>
                    <option value="0.01">1.00%</option>
                  </select>
                </div>
                <details className="custom-reserves">
                  <summary>
                    Set custom reserves <Icon name="plus" />
                  </summary>
                  <div className="reserve-fields">
                    <label htmlFor="reserve-eth">ETH reserve</label>
                    <input
                      id="reserve-eth"
                      name="eth-reserve"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={eth}
                      onChange={(e) => setEth(e.target.value)}
                      aria-invalid={ethValue === null}
                      aria-describedby={
                        ethValue === null ? "eth-error" : undefined
                      }
                    />
                    {ethValue === null && (
                      <p id="eth-error" className="error">
                        {reserveError}1,000,000,000.
                      </p>
                    )}
                    <label htmlFor="reserve-token">TOKEN reserve</label>
                    <input
                      id="reserve-token"
                      name="token-reserve"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={tokens}
                      onChange={(e) => setTokens(e.target.value)}
                      aria-invalid={tokenValue === null}
                      aria-describedby={
                        tokenValue === null ? "token-error" : undefined
                      }
                    />
                    {tokenValue === null && (
                      <p id="token-error" className="error">
                        {reserveError}1,000,000,000,000.
                      </p>
                    )}
                  </div>
                </details>
                <p className="simulation-note">
                  <Icon name="info" />
                  <span>
                    Hypothetical tokens. Real pool math.
                    <br /> No funds or wallet needed.
                  </span>
                </p>
              </div>
              <section className="results" aria-label="Swap estimate">
                <div className="section-title">
                  <h2>
                    <span className="step">02</span> See the ripple
                  </h2>
                  <span className="small-label">Updates as you explore</span>
                </div>
                {result && input ? (
                  <>
                    <div className="result-top">
                      <div className="output-block">
                        <span className="result-label">
                          Estimated tokens received
                        </span>
                        <div className="big-output">
                          <span data-testid="output">{fmt(result.output)}</span>
                          <span className="token-label">TOKEN</span>
                        </div>
                      </div>
                      <div
                        className={`impact-block ${result.impact >= 5 ? "elevated" : ""}`}
                      >
                        <span className="result-label">Price impact</span>
                        <strong data-testid="impact">
                          {fmt(result.impact)}
                          <span>%</span>
                        </strong>
                        <span className="impact-caption">
                          Excludes pool fee
                        </span>
                      </div>
                    </div>
                    <div
                      className="view-switch"
                      role="group"
                      aria-label="Visualization"
                    >
                      <button
                        onClick={() => setView("curve")}
                        aria-pressed={view === "curve"}
                      >
                        Output curve
                      </button>
                      <button
                        onClick={() => setView("compare")}
                        aria-pressed={view === "compare"}
                      >
                        Compare depths <Icon name="arrow" />
                      </button>
                    </div>
                    {view === "curve" ? (
                      <Curve input={input} />
                    ) : (
                      <Comparison input={input} />
                    )}
                    <dl className="metrics">
                      <div>
                        <dt>Starting rate</dt>
                        <dd>
                          {fmt(result.spotRate)}
                          <span>TOKEN / ETH</span>
                        </dd>
                      </div>
                      <div>
                        <dt>Average rate</dt>
                        <dd>
                          {result.averageRate === null
                            ? "—"
                            : fmt(result.averageRate)}
                          <span>TOKEN / ETH · incl. fee</span>
                        </dd>
                      </div>
                      <div>
                        <dt>Pool fee paid</dt>
                        <dd>
                          {fmt(result.feePaid, 6)}
                          <span>ETH</span>
                        </dd>
                      </div>
                    </dl>
                    <div
                      className={`takeaway ${result.impact >= 5 ? "elevated" : ""}`}
                    >
                      <Icon name="info" />
                      <p>
                        <strong>
                          {input.trade === 0
                            ? "Start with a small swap."
                            : impactLabel(result.impact) + "."}
                        </strong>{" "}
                        {input.trade === 0
                          ? "Move the slider to see how a trade changes the pool."
                          : result.impact >= 5
                            ? "This trade moves the pool noticeably. Compare a deeper pool to see the difference."
                            : "Try the same trade in a shallower pool. Less liquidity means more price impact."}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="empty-result">
                    <Icon name="pool" />
                    <h3>A little input goes a long way.</h3>
                    <p>
                      Check the highlighted amounts to bring your swap estimate
                      back.
                    </p>
                    <button className="primary-button" onClick={reset}>
                      Reset the experiment <Icon name="reset" />
                    </button>
                  </div>
                )}
                <div role="status" className="sr-only">
                  {announcement}
                </div>
              </section>
            </div>
          </section>
          <section className="field-notes" aria-labelledby="notes-heading">
            <div className="notes-heading">
              <h2 id="notes-heading">A few things to take away</h2>
              <span className="eyebrow">Field notes</span>
            </div>
            <div className="notes-grid">
              <article>
                <span className="note-number">01 / THE TRADE</span>
                <h3>Size is relative.</h3>
                <p>
                  A 5 ETH swap is small in a deep pool and large in a shallow
                  one. The share of reserves you trade matters.
                </p>
              </article>
              <article>
                <span className="note-number">02 / THE DISTINCTION</span>
                <h3>Impact isn’t slippage.</h3>
                <p>
                  Impact comes from your own trade. Slippage is the difference
                  between the quote you expect and the execution you get.
                </p>
              </article>
              <article>
                <span className="note-number">03 / THE EXPERIMENT</span>
                <h3>Keep the trade. Add depth.</h3>
                <p>
                  Switch from Shallow to Deep with the same amount. More
                  liquidity brings your average rate closer to the starting
                  rate.
                </p>
              </article>
            </div>
          </section>
          <details className="method">
            <summary>
              <span>
                Under the surface{" "}
                <span className="method-subtitle">Model & assumptions</span>
              </span>
              <Icon name="plus" />
            </summary>
            <div className="method-content">
              <p>
                This is a single, hypothetical constant-product pool. ETH
                represents the wrapped ETH side of the pair; TOKEN is a generic
                asset. It is a learning tool, not a live quote.
              </p>
              <code>
                net input = ETH in × (1 − fee)
                <br />
                tokens out = token reserve × net input / (ETH reserve + net
                input)
                <br />
                impact = net input / (ETH reserve + net input) × 100
              </code>
              <p>
                Price impact compares output with the starting reserve rate
                after the same fee. The average rate includes the fee. Fees
                remain in the pool. The chart’s dotted line assumes the starting
                rate stays fixed; its solid line shows the pool’s changing rate.
              </p>
              <p>
                No gas costs, token taxes, integer rounding, competing trades,
                routing, or concentrated liquidity are modeled. Estimates use
                browser floating-point arithmetic. No inputs are saved or sent
                anywhere.
              </p>
            </div>
          </details>
          <aside className="build-note">
            <span className="build-note-icon">
              <Icon name="pool" />
            </span>
            <p>
              <strong>Built for curious holders.</strong> Poolside is a hands-on
              swap impact lab for the Ground sheet. We built it to make
              liquidity easier to understand: change one number, see the ripple,
              and take that intuition into the Ethereum ecosystem.
            </p>
          </aside>
        </main>
        <footer>
          <span>
            Poolside <span className="footer-slash">/</span> Made for the swarm
          </span>
          <span>
            One pool. A little more understanding.{" "}
            <span aria-hidden="true">↗</span>
          </span>
        </footer>
      </div>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
