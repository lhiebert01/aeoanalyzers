# Silent-failure log — checks that returned a reassuring answer about the wrong thing

**Internal. Not published.** Started 2026-09-20 on founder instruction: *"That file is now a
body of evidence rather than a set of anecdotes."*

Every entry has the same shape. A check ran. It reported success. What it measured was not
what anyone believed it was measuring. **None of these announced itself.** In each case the
green result was indistinguishable from a real one until something outside the check caught it.

This is the product's own argument, applied to the product's own tooling: a tool can be
completely broken and still look completely fine.

---

## 1. The telemetry beacon — 14 days of zero rows

**What ran:** the AI-crawler beacon fired as a bare `void fetch(...)` from an edge handler.
**What it reported:** nothing. No error, no failure, no alert.
**What was actually happening:** Vercel can end an invocation as soon as the response returns,
so the POST was dropped in flight. Recording ran at 100+ hits/day through Aug 18 and then fell
to near zero for **14 straight days** while the site kept serving crawlers normally.
**Caught by:** a person noticing the number had stopped moving, three weeks later.
**The number it produced had already been published in a press release and a blog post.**
**Fix:** `waitUntil`. **Lesson:** verify the artifact — the row — not that the code ran.

## 2. The DuckDuckGo index probe — a fabricated domain came back "present"

**What ran:** a `site:` probe through DuckDuckGo's HTML endpoint, to test index presence.
**What it reported:** matches for `aeoanalyzers.com`. It looked like a working check.
**What was actually happening:** it counted the query string echoed back in the results page,
not results. **A control query for `zzq-not-a-real-domain-91731.com` also returned "matches".**
**Caught by:** running the negative control before building on it.
**Had it shipped it would have told every customer their site was indexed.** Deleted, not fixed.
**Lesson:** a check that cannot fail on a planted problem is not a check.

## 3. The grep-gated push — `vitest | grep "Tests "` and a red suite shipped

**What ran:** `npx vitest run 2>&1 | grep "Tests " && git push`.
**What it reported:** success, because grep found the word "Tests".
**What was actually happening:** a pipeline's exit status is the **last** command's. `head`,
`tail` and `grep` almost always succeed, so every `tsc` and `vitest` failure in that session
was invisible to the `&&` chain. Commit `025194d` shipped with a red suite.
**Caught by:** reading the output that had scrolled past, then self-reporting it.
**Standing rule since:** verification chains on exit status, never on a string in output, and
every close-out names the command whose exit code gated the push.

## 4. The `?cb=` sitemap read — a query string fell through to the SPA shell

**What ran:** `curl .../sitemap.xml?cb=$RANDOM | grep -c "/guide"`, to cache-bust.
**What it reported:** `/guide`, `/privacy`, `/terms` and `/press` were all in the sitemap.
**What was actually happening:** a query string on a static file does not match the file, so
the request fell through to the SPA rewrite and returned **the homepage**. The grep was
matching the homepage's own footer links. **Four false positives in one command.**
**Caught by:** the numbers disagreeing with the same file read without the query string.
**Lesson:** the cache-buster changed what was being fetched. Use a `Cache-Control` header.

## 5. The status-code deploy check — six URLs, six 200s, all the homepage

**What ran:** `curl -o /dev/null -w "%{http_code}"` against the new primer and five icon files.
**What it reported:** `200` on all six. Shipped and serving.
**What was actually happening:** the deployment had not propagated. Every one of those paths
did not exist yet, so the SPA rewrite served the homepage — **58,881 bytes of it, six times.**
**Caught by:** re-polling on byte length instead of status.
**This happened while publishing the post that makes exactly this argument**, and the post
already contained the sentence "a 200 does not prove a page exists."
**Lesson:** compare bytes and title against a known baseline. A status code is not an identity.

## 6. The converted-view byline — a reader reordered the source

**What ran:** the founder read the live post in a converted view to check the first-200-character
window, and reported the byline sitting between the `<h1>` and the lead.
**What it reported:** a byline in the window, on the post that explains why that is a mistake.
**What was actually happening:** the converter hoisted the byline into a metadata position.
Raw served bytes: `</h1>` at 13715, `class="postlead"` at **13757 (+42)**, `class="postmeta"` at
**14043 (+328)**. The lead precedes the byline by 286 bytes, with no CSS reordering.
**Caught by:** fetching the raw bytes and printing the span in source order.
**Lesson:** it is not only our checks. Any rendering between you and the artifact is a check
you did not write and cannot see the assumptions of.

---

## The pattern, stated once

Five of these six were **our own verification steps**, not our product. The product's checks are
tested against planted failures; the steps we use to confirm our own work were not, until this
week. Three of the six were caught only because a number disagreed with another number.

**The rule that falls out of it:** a verification step is a check, and every rule we apply to a
shipped check applies to it. It must be provable by breaking, it must gate on something that
cannot succeed by accident, and it must compare against a baseline rather than a threshold that
a failure can also satisfy.

## A related failure mode, same family: the guard that was too specific

Four times this week a regex guard reported clean copy that was not clean, each time because a
modifier sat between the subject and the noun it required:

| Missed | Why |
|---|---|
| `Most "AEO" or "GEO" tools hand you a score` | pattern allowed one unquoted category word |
| `Most AI-visibility tools hand you a number and a vibe` | pattern allowed only `aeo`/`geo` |
| `Most tools & consultants:` | 12-character gap before the colon, needed 24 |
| **`No other AEO tool measures whether AI is telling the truth about you`** | `/no other (tool\|platform)/` needs the noun **immediately** after `other` |

The last one is the retired claim from the guardrail, **verbatim**, live on two customer-facing
surfaces, through a truth pass and three widenings. Founder ruling 2026-09-20: stop widening.
Flag on the **noun class** — any competitor-plural in published copy — and route every candidate
to human review. Measured cost on current copy: **33 candidates**, roughly 2 real, a one-time
review, then only new or changed copy is flagged.
