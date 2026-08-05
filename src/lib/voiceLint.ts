// Measurement-honesty voice guard. The brand rule forbids unqualified superlatives
// and absolute brags in user-facing copy ("head and shoulders", "no other tool",
// "world-class", guarantees). SCOPED comparatives are fine — "most tools grade you
// in isolation" is an allowed factual contrast, not a brag about us. This lints for
// the absolutes only, so blog/report copy can't regress into hype.

const BANNED: { rx: RegExp; label: string }[] = [
  { rx: /head and shoulders/i, label: 'head and shoulders' },
  { rx: /\bno other (tool|platform|product|company)\b/i, label: 'no other tool/platform' },
  { rx: /\buniversal signals\b/i, label: 'universal signals (unknowable-algorithm claim)' },
  { rx: /world[-\s]?class/i, label: 'world-class' },
  { rx: /\bunbeatable\b/i, label: 'unbeatable' },
  { rx: /second to none/i, label: 'second to none' },
  { rx: /best[-\s]in[-\s]class/i, label: 'best-in-class' },
  { rx: /\bbar none\b/i, label: 'bar none' },
  { rx: /the only (tool|platform) that\b/i, label: 'the only tool that' },
  { rx: /hands down/i, label: 'hands down' },
  { rx: /\bwe guarantee\b/i, label: 'we guarantee' },
  { rx: /guaranteed results/i, label: 'guaranteed results' },
];

/** Return the banned absolute/superlative phrases present in `text` (empty = clean).
 *  Note: a NEGATED use ("no guarantees of rankings") is fine — the patterns target
 *  the promissory forms only. */
export function bannedAbsolutes(text: string): string[] {
  const t = String(text || '');
  return BANNED.filter((b) => b.rx.test(t)).map((b) => b.label);
}
