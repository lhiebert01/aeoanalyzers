# Known gap: the fidelity check does not flag an out-of-date price (opened November 26, 2026)

**Status:** open follow-up, not part of the Release 3 change set.

**What was observed.** In the October 13, 2026 panel v1.2 baseline of aeoanalyzers.com
(`docs/baselines/aeoanalyzers-panel-v1.2-day0-2026-10-13.json`), several Claude answers to the
branded questions quote plan prices that had since changed. The fidelity check classified those
answers as having no conflict with the facts recorded from the site.

**Why it matters.** Fidelity is reported as "does the answer match key facts on your website".
A price is a fact a buyer acts on.

**What to build.** When the truth record carries published prices, an answer that states a price
for the same plan that differs from the published one is flagged as a fidelity issue, with the
published value. Add a regression test from the stored transcripts above, break it once to see it
fail, and re-score stored sweeps to report which results change.

**Where it shows today.** The limits note on /citation-sweep-example states the gap plainly.
