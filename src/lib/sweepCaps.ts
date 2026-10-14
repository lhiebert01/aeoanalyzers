// Spend caps (founder pricing decision, 13 Oct 2026). Import-free: the serverless
// sweep route, the analysis route and the headless runners all import this file.
//
//  - Per sweep, a hard ceiling in TRUE provider dollars: $1.50 on panel v1.1 (four
//    engines), $4.00 on panel v1.2 (five engines, adds Grok).
//  - Per account per month: plan sweeps × the per-sweep cap of the plan's panel.
//  - Analyses: 200 per account per month.
//
// The ceiling is enforced BEFORE money is spent: each call reserves the most it can
// cost before it starts, so concurrent calls cannot jointly cross the line.

export type CapPanel = 'v1.1' | 'v1.2';
export type PaidTier = 'daypass' | 'Pro' | 'Business';

export const SWEEP_COST_CAP_USD: Record<CapPanel, number> = { 'v1.1': 1.5, 'v1.2': 4.0 };

/** Sweeps included per plan period (Day Pass = its 24 hours, plans = a calendar month). */
export const PLAN_SWEEPS: Record<PaidTier, number> = { daypass: 3, Pro: 8, Business: 20 };

/** The panel each plan runs. The Day Pass is four engines; Pro and Business are five. */
export const PLAN_PANEL: Record<PaidTier, CapPanel> = { daypass: 'v1.1', Pro: 'v1.2', Business: 'v1.2' };

export const ANALYSES_PER_MONTH = 200;

export function sweepCapUsd(panel: CapPanel): number {
  return SWEEP_COST_CAP_USD[panel] ?? SWEEP_COST_CAP_USD['v1.1'];
}

export function monthlyCostCapUsd(tier: PaidTier): number {
  return PLAN_SWEEPS[tier] * sweepCapUsd(PLAN_PANEL[tier]);
}

/** The ceiling for THIS sweep: the per-sweep cap, or what is left of the month, whichever is lower. */
export function effectiveSweepCapUsd(panel: CapPanel, monthlyCapUsd: number, spentThisMonthUsd: number): number {
  const left = Math.max(0, monthlyCapUsd - Math.max(0, spentThisMonthUsd));
  return Math.min(sweepCapUsd(panel), left);
}

// Most one call has cost, measured on the 13 Oct v1.2 runs (756 calls), rounded up.
// The guard ratchets these up if a call ever costs more.
export const CALL_RESERVE_USD: Record<string, number> = {
  grok: 0.2, claude: 0.03, openai: 0.02, perplexity: 0.01, gemini: 0.002,
};

export class CostGuard {
  spent = 0;
  private reserved = 0;
  private reserve: Record<string, number>;
  skipped = 0;
  constructor(public readonly capUsd: number, seed: Record<string, number> = CALL_RESERVE_USD) {
    this.reserve = { ...seed };
  }
  private estimate(engine: string): number {
    return this.reserve[engine] ?? 0.2;
  }
  /** Reserve the most the next call can cost. Returns the reservation, or null when the cap forbids the call. */
  tryReserve(engine: string): number | null {
    const est = this.estimate(engine);
    if (this.spent + this.reserved + est > this.capUsd + 1e-9) { this.skipped++; return null; }
    this.reserved += est;
    return est;
  }
  /** Release a reservation and book what the call actually cost. */
  settle(engine: string, reservation: number, actualUsd: number): void {
    this.reserved = Math.max(0, this.reserved - reservation);
    const a = Math.max(0, actualUsd || 0);
    this.spent += a;
    if (a > (this.reserve[engine] ?? 0)) this.reserve[engine] = a;
  }
}
