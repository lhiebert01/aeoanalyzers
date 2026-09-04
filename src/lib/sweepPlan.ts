// WO-INTEGRITY-002 B1(b) — the single source of the "how many reps will actually run"
// rule. run-sweep.ts uses it to trim a sweep into the maxDuration budget; the UI uses the
// SAME function to show a truthful pre-run estimate. No second copy of the rule.

export const SWEEP_MAX_QUERY_RUNS = 15;   // non-admin cost cap on engines×queries×reps units
export const SWEEP_MAX_RUNS = 3;          // non-admin reps ceiling
export const SWEEP_TASK_BUDGET_DEFAULT = 84; // ~engine-calls that fit maxDuration (env-overridable server-side)

/** Given the panel size and engine count, return the reps that will ACTUALLY run and how
 *  many queries fit. Mirrors run-sweep's trim exactly: prefer query breadth — if reps>1
 *  would overflow the budget, drop to 1; then cap reps by tier. */
export function planSweep(
  totalQueries: number,
  engines: number,
  opts: { admin?: boolean; requestedReps?: number; taskBudget?: number } = {},
): { reps: number; queriesRun: number } {
  const engN = Math.max(1, engines);
  const budget = opts.taskBudget ?? SWEEP_TASK_BUDGET_DEFAULT;
  const timeQueryRuns = Math.max(engN, Math.floor(budget / engN));
  const costQueryRuns = opts.admin ? Number.POSITIVE_INFINITY : SWEEP_MAX_QUERY_RUNS;
  const maxQueryRuns = Math.min(timeQueryRuns, costQueryRuns);
  let reps = Math.max(1, Math.min(5, opts.requestedReps ?? 3));
  if (reps > 1 && Math.ceil(maxQueryRuns / reps) < totalQueries) reps = 1;
  reps = Math.min(reps, opts.admin ? 5 : SWEEP_MAX_RUNS);
  const maxQueries = Math.max(1, Math.floor(maxQueryRuns / reps));
  return { reps, queriesRun: Math.min(totalQueries, maxQueries) };
}
