# Edge, robots and crawler checks — all four, Sep 7 2026

Run to rule out a second cause for Claude's index not having aeoanalyzers.com.
**Result: nothing is blocking anything. The crawler simply never came.**

---

## 1 · Edge blocking — nothing is configured, nothing is challenged

**Vercel firewall, project `aeo-app1`:**

```
Firewall:             Not configured
System Bypass:        0 IPs
Attack Mode:          Off
System Mitigations:   Active   (Vercel's always-on default, not a custom rule)
```

**No Cloudflare in front.** Response headers show `server: Vercel` and `x-vercel-id`, with no
`cf-ray` or any Cloudflare header. The domain is not proxied, so there is no second edge to check.

**Live probes against production**, `/blog/i-scored-zero`, from outside:

| User-agent | Status | Bytes served | Mitigation headers |
|---|---|---|---|
| Claude-SearchBot | 200 | 22,036 | none |
| ClaudeBot | 200 | 22,036 | none |
| Bravebot | 200 | 22,036 | none |
| Googlebot | 200 | 22,036 | none |
| PerplexityBot | 200 | 22,036 | none |

Every crawler gets the complete, real page. No 403, no 429, no challenge, no soft block.

## 2 · robots.txt — Claude-SearchBot is allowed by name

The live file names the agent explicitly, in the allow group:

```
User-agent: ClaudeBot
User-agent: Claude-User
User-agent: Claude-SearchBot
User-agent: GPTBot
User-agent: ChatGPT-User
User-agent: OAI-SearchBot
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: Amazonbot
Allow: /
Disallow: /dashboard /admin /api /login /signup
```

Googlebot, Bingbot and `*` are allowed the same way. Sitemap declared. **Verdict: clean for every
agent on the list, Claude-SearchBot included.**

## 3 · The bot log, all time — and two blind spots in it

**Claude-SearchBot has exactly two rows, and both are my probes from today.** Organically it has
never visited. All-time agents on aeoanalyzers.com:

GPTBot 445 · ChatGPT-User 109 · Amazonbot 86 · PerplexityBot 63 · ClaudeBot 57 · OAI-SearchBot 54
· Bingbot 41 · CCBot 37 · Google-Extended 26 · meta-externalagent 10 · Claude-User 8 · Applebot 7
· MistralAI-User 4 · Bytespider 2 · Claude-SearchBot 2 (probes) · Applebot-Extended 1 · cohere-ai 1

**Two agents cannot appear in this log at all**, which matters for the conclusion:

| Agent | Classified? | Consequence |
|---|---|---|
| **Bravebot** | **No — absent from `src/lib/botClassify.ts`** | If Brave's crawler visited, the middleware returns early and no row is written. Our log cannot say whether Brave has ever crawled us. |
| **Googlebot** | **No — not recognised** | Same. We see `Google-Extended` (the training agent) but never Googlebot itself, even though Google demonstrably has the site indexed. |

The probes confirmed it: the Bravebot and Googlebot requests returned 200 and wrote no row, while
the Claude-SearchBot, ClaudeBot and PerplexityBot probes each wrote one.

**So "Brave has never visited" is not a finding we are entitled to make.** It is unmeasured. If
Claude's search runs on a third-party index, that gap matters and should be closed before anyone
reasons from it.

## 4 · What this leaves

Not blocked. Not disallowed. Not challenged. Not rate-limited. **Never visited by the crawler
that builds the index Claude searches** — and that is a discovery problem, which only inbound
links from already-crawled pages solve.

---

## Product gaps this exposed — for the backlog

**a. The crawler-hits panel cannot distinguish "blocked" from "absent".** The beacon runs in
middleware, so anything stopped at the edge never reaches it. Every customer has this blind spot
and none of them know. Either reconcile against edge logs where we can, or **state the limitation
on the panel itself**: "This panel shows crawlers that reached the application. Requests blocked
at your CDN or firewall are not visible here." The honest label costs nothing and is the kind of
disclosure this product is built on.

**b. The classifier's allowlist is a second blind spot.** `botClassify.ts` silently drops any
agent it does not recognise, so an unlisted crawler is indistinguishable from one that never came.
Add Bravebot and Googlebot at minimum, and add a counter for *unrecognised* bot-shaped agents so
the gap is visible rather than silent. Note that adding agents changes what stored history means,
so the panel needs a "first observed" date per agent.

**c. No external-link count.** Google Search Console's Links report gives a free external backlink
count and we have no equivalent. Given that link acquisition is the mechanism that gets an
unlisted site into a link-following index, "who links to you" is a question our report should at
least teach a customer to ask, even if we cannot answer it ourselves. Cheapest honest version: a
section that tells them where to look and what a near-zero count means.
