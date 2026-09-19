import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const APP = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8');

/** WO-AEO-TIER-LEAK-008.
 *
 *  The analyzer response is gated server-side by `redactFixFields`, but History
 *  reads `analysis_history` straight from PostgREST — our API never sees it. The
 *  list query used `select=*`, which returned `full_result` (the ENTIRE stored
 *  analysis) for up to 20 rows in one response. A free user opening the History
 *  tab received every fix from every past run before clicking anything.
 *
 *  These assert the source, because the defect is in WHAT WE ASK FOR, and a
 *  behavioural test would need a live database to see it. */
describe('History list must not ship full_result (tier wall)', () => {
  const listQuery = APP.match(/'analysis_history',\s*\n\s*`select=[^`]*`/);

  it('has an explicit column list, not a wildcard select', () => {
    expect(listQuery, 'the analysis_history list query was not found').not.toBeNull();
    expect(listQuery![0]).not.toContain('select=*');
  });

  it('never returns full_result for the LIST', () => {
    // Both halves matter: a wildcard does not contain the STRING "full_result"
    // but returns the COLUMN, so asserting the name alone passes on `select=*`.
    expect(listQuery![0]).not.toContain('select=*');
    expect(listQuery![0]).not.toContain('full_result');
  });

  it('still requests the columns the History table renders', () => {
    for (const col of ['url', 'score', 'citation_probability', 'created_at', 'is_duel']) {
      expect(listQuery![0], `History rows render ${col}`).toContain(col);
    }
  });

  it('fetches full_result for the ONE row the detail view opens', () => {
    expect(APP).toContain('select=full_result&id=eq.');
  });
});

describe('the analyzer paywall is still wired to the gate', () => {
  const ROUTE = readFileSync(resolve(__dirname, '../../api/llm-generate.ts'), 'utf8');

  it('calls redactFixFields for a determined, non-paid caller', () => {
    expect(ROUTE).toContain('if (!ent.paid && ent.determined) text = redactFixFields(text);');
  });

  it('refuses sweep-config outright rather than redacting it', () => {
    expect(ROUTE).toContain("if (purpose === 'sweep-config')");
    expect(ROUTE).toContain('return res.status(402)');
  });
});
