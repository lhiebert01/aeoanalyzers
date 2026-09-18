# Blocked and deferred items — the file we actually re-read

**Why this file exists.** `/best-aeo-tools` (D1) was designated a keystone in August 2026
and sat unbuilt for two months. Its only trace was a comment in `SEO.tsx`. A deferred item
that lives in a code comment, or in a session's head, is not tracked — it is forgotten with
extra steps. Anything deliberately not built goes here, with its successor named.

Founder instruction, Sep 19 2026: *"a deferred item that lives only in your head or in a
code comment is how D1 was designated a keystone in August and sat unbuilt for two months."*

| Item | Why it was deferred | Successor | Logged |
|---|---|---|---|
| **`shellRoute` detector** — the customer-facing "does this URL serve its own document, or the shell?" check | It would have had no caller. The build-side gate (`scripts/check-prerender.mjs`) answers the same question from ground truth — did we render it? — so the two do not share code. Shipping a module nothing imports is precisely what `scripts/check-no-orphan-modules.mjs` exists to fail. | **WO-003/B**, which wires it into the customer scan. Its implementation reference is `scripts/check-prerender.mjs` and the marker lessons in `scripts/prerender.mjs`. | 2026-09-19 |
| **`/best-aeo-tools` (D1)** | Keystone of WO-CITATION-WIN-001, never built. Recorded here so it stops living in a comment. | Unassigned — needs a founder date, not a go-word. | 2026-09-19 |
| **FAQ verbatim-parity check** | Judged marginal against the first-200-characters check. Founder agreed. | **WO-003/B**, if it earns a slot. | 2026-09-19 |

## Rules

- An item leaves this table only when it ships or when the founder retires it in writing.
- "Blocked on a go-word" is not a valid reason. Per the Sep 5 standing rule, parked work is
  a **dated row** or a yes/no question with a stated default.
