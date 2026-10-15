// Spend caps (founder pricing decision, 13 Oct 2026). Import-free: the serverless
// sweep route, the analysis route and the headless runners all import this file.
//
//  - Per sweep, a hard ceiling in TRUE provider dollars: $1.50 on panel v1.1 (four
//    engines), $6.00 on panel v1.2 (five engines, adds Grok; raised from $4.00 on 14 Oct
//    2026 after the largest customer sweep measured $4.48).
//  - Per account per month: plan sweeps × the per-sweep cap of the plan's panel.
//  - Analyses (founder decisions, 14 Oct 2026): free 3 per account, ever; Day Pass 25 within
//    its 24 hours; Pro 100 a month; Business 200 a month.
//
// The ceiling is enforced BEFORE money is spent: each call reserves the most it can
// cost before it starts, so concurrent calls cannot jointly cross the line.

export type CapPanel = 'v1.1' | 'v1.2';
export type PaidTier = 'daypass' | 'Pro' | 'Business';

export const SWEEP_COST_CAP_USD: Record<CapPanel, number> = { 'v1.1': 1.5, 'v1.2': 6.0 };

/** Sweeps included per plan period (Day Pass = its 24 hours, plans = a calendar month). */
export const PLAN_SWEEPS: Record<PaidTier, number> = { daypass: 3, Pro: 8, Business: 20 };

/** The panel each plan runs. The Day Pass is four engines; Pro and Business are five. */
export const PLAN_PANEL: Record<PaidTier, CapPanel> = { daypass: 'v1.1', Pro: 'v1.2', Business: 'v1.2' };

/** Analyses allowed per account in the tier's window (see allowanceWindowStart). */
export const ANALYSES_ALLOWANCE: Record<PaidTier | 'free', number> = { free: 3, daypass: 25, Pro: 100, Business: 200 };

export function analysesAllowance(tier: string | null | undefined): number {
  return (ANALYSES_ALLOWANCE as Record<string, number>)[tier || 'free'] ?? ANALYSES_ALLOWANCE.free;
}

/** Where a tier's allowance count starts, for analyses AND sweeps: a Day Pass counts from the
 *  start of its 24 hours, Pro and Business from the 1st of the month (UTC), and free analyses
 *  count every one ever (null). */
export function allowanceWindowStart(tier: string | null | undefined, passUntil: string | null | undefined, now = new Date()): Date | null {
  if (tier === 'Pro' || tier === 'Business') return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  if (tier === 'daypass' && passUntil) return new Date(new Date(passUntil).getTime() - 24 * 3_600_000);
  return null;
}

/** The refusal a capped account sees, in the tier's own terms. */
export function analysesLimitMessage(tier: string | null | undefined): string {
  const n = analysesAllowance(tier);
  if (tier === 'Pro' || tier === 'Business') return `You have used this month's ${n} analyses. The allowance resets on the 1st.`;
  if (tier === 'daypass') return `You have used the ${n} analyses included in your Day Pass.`;
  return `You have used your ${n} free analyses. Start a Day Pass or a plan to keep going.`;
}

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

// Most one call has cost, measured on the 13–14 Oct v1.2 runs, rounded up (Grok's dearest
// answer was $0.876, a branded "is it legit" question). The guard ratchets these up if a call
// ever costs more.
export const CALL_RESERVE_USD: Record<string, number> = {
  grok: 0.9, claude: 0.05, openai: 0.02, perplexity: 0.01, gemini: 0.002,
};

/** Transcript of a call the spend ceiling declined: an errored run, never an engine failure. */
export const NOT_ASKED = '[error: not asked — this sweep reached its spend ceiling]';

export class CostGuard {
  spent = 0;
  private reserved = 0;
  private reserve: Record<string, number>;
  private waiters: Array<() => void> = [];
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
    this.waiters.splice(0).forEach((wake) => wake());
  }
  /** Like tryReserve, but while other calls are in flight it waits for one to settle and tries
   *  again, so a call is skipped only when it cannot fit even with nothing else running. */
  async reserveWhenAffordable(engine: string): Promise<number | null> {
    for (;;) {
      const est = this.estimate(engine);
      if (this.spent + this.reserved + est <= this.capUsd + 1e-9) { this.reserved += est; return est; }
      if (this.reserved <= 1e-12) { this.skipped++; return null; }
      await new Promise<void>((wake) => this.waiters.push(wake));
    }
  }
}
