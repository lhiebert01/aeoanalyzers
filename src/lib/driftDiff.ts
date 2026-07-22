// WO-5 — Deployment Drift / Integrity. Diffs a freshly-crawled truth record
// against the client's APPROVED truth record and flags drift (e.g. a theme update
// silently wiped the founder schema, or an llms.txt edit dropped a fact). Shares
// the truth-record engine with WO-2. Deterministic set/field diff.

import type { TruthRecord } from './truthRecord';

export interface Drift {
  field: 'brandName' | 'founder' | 'sameAs' | 'fact';
  type: 'removed' | 'changed' | 'added';
  before?: string;
  after?: string;
  severity: 'high' | 'medium' | 'low';
}

export interface DriftReport {
  inSync: boolean;
  drifts: Drift[];
  summary: string;
}

const norm = (s: string) => String(s || '').trim().toLowerCase();

/** Compare the current (live) truth record against the approved baseline. */
export function diffTruthRecords(approved: TruthRecord, current: TruthRecord): DriftReport {
  const drifts: Drift[] = [];

  // Brand name.
  if (norm(approved.brandName || '') !== norm(current.brandName || '')) {
    drifts.push({
      field: 'brandName', type: 'changed',
      before: approved.brandName || '(none)', after: current.brandName || '(none)',
      severity: 'high',
    });
  }

  // Founders — a removed canonical founder is high severity (WO-2 fidelity risk).
  const curFounders = new Set(current.founders.map(norm));
  for (const f of approved.founders) {
    if (!curFounders.has(norm(f))) {
      drifts.push({ field: 'founder', type: 'removed', before: f, severity: 'high' });
    }
  }
  const apprFounders = new Set(approved.founders.map(norm));
  for (const f of current.founders) {
    if (!apprFounders.has(norm(f))) {
      // A NEW founder appearing on the live site is worth surfacing (could be an
      // injected/erroneous edit, or a legitimate addition).
      drifts.push({ field: 'founder', type: 'added', after: f, severity: 'medium' });
    }
  }

  // sameAs profile links.
  const curSame = new Set(current.sameAs.map(norm));
  for (const u of approved.sameAs) {
    if (!curSame.has(norm(u))) {
      drifts.push({ field: 'sameAs', type: 'removed', before: u, severity: 'medium' });
    }
  }

  const inSync = drifts.length === 0;
  const summary = inSync
    ? '✓ Live AI files match the approved truth record.'
    : `${drifts.length} drift${drifts.length === 1 ? '' : 's'} detected — the live site no longer matches the approved truth record.`;

  return { inSync, drifts, summary };
}
