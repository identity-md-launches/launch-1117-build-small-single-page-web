export const PRESETS = [
  { id: "shallow", label: "Shallow", eth: 10, tokens: 100_000 },
  { id: "balanced", label: "Balanced", eth: 100, tokens: 1_000_000 },
  { id: "deep", label: "Deep", eth: 1000, tokens: 10_000_000 },
] as const;
export const LIMITS = {
  trade: 1_000_000,
  eth: 1_000_000_000,
  tokens: 1_000_000_000_000,
};
export type PoolInput = {
  trade: number;
  eth: number;
  tokens: number;
  fee: number;
};
export function parseAmount(
  value: string,
  max: number,
  allowZero = false,
): number | null {
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())) return null;
  const n = Number(value);
  return Number.isFinite(n) && n <= max && (allowZero ? n >= 0 : n >= 0.000001)
    ? n
    : null;
}
export function quote({ trade, eth, tokens, fee }: PoolInput) {
  if (
    ![trade, eth, tokens, fee].every(Number.isFinite) ||
    trade < 0 ||
    trade > LIMITS.trade ||
    eth < 0.000001 ||
    eth > LIMITS.eth ||
    tokens < 0.000001 ||
    tokens > LIMITS.tokens ||
    fee < 0 ||
    fee >= 1
  ) {
    throw new RangeError("Enter valid reserves, trade size, and fee.");
  }
  const feePaid = trade * fee;
  const effective = trade * (1 - fee);
  const output = tokens * (effective / (eth + effective));
  const spotRate = tokens / eth;
  const ideal = effective * spotRate;
  const impact = (effective / (eth + effective)) * 100;
  return {
    output,
    impact,
    feePaid,
    effective,
    spotRate,
    ideal,
    averageRate: trade > 0 ? output / trade : null,
    afterEth: eth + trade,
    afterTokens: tokens - output,
  };
}
export function formatNumber(value: number, decimals = 2): string {
  if (value > 0 && value < 0.000001) return value.toExponential(3);
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value > 0 && value < 0.01 ? 8 : decimals,
  }).format(value);
}
export function compact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
export function impactLabel(impact: number): string {
  return impact < 1
    ? "Under 1% impact"
    : impact < 5
      ? "1–5% impact"
      : "5% impact or more";
}
