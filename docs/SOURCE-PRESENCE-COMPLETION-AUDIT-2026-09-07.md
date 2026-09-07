# Source Presence checklist — what has been done, what has not. Sep 7 2026

Audited against the repo record, the live site, and the stored sweeps. **One caveat stated up
front: a browser action leaves no trace in this repo.** If you verified Search Console in a
browser three weeks ago and never wrote it down, I cannot see it. The four steps where that is
possible are marked **⚑ confirm**. Everything else is verifiable either way.

---

## The short answer

**The repeated work was on-site and measurement. This checklist is deliberately the off-site,
manual work — and almost none of it has been done once.**

You have run the analyzer on your own site and re-run citation sweeps many times, and each round
produced real on-site improvements: JSON-LD and the connected `@graph`, entity disambiguation,
crawler-access audit, `llms.txt`, `robots.txt`, prerendering, the sitemap corrected today. None of
that appears on this checklist, because the checklist opens by saying agents can already fix your
schema, sitemap and copy — the list is only the things a person must do by hand.

So the sense of having done these steps "over and over" is real, but it is a different set of
steps. Layer 2 has never been started, which is exactly why the number underneath has never
moved.

---

## Done at least once

| Step | Status | Evidence |
|---|---|---|
| **0.1 Read your own bot log** | **Done — today** | Per-agent all-time table pulled Sep 7. ClaudeBot 55 hits (Jul 23 → Aug 18), Claude-User 8, **Claude-SearchBot never**. It also exposed that the telemetry itself had been dropping writes since Aug 18; fixed and verified by outcome the same day. |
| **2.4 Reddit** | **Done, and ongoing** | Six AEO/GEO subreddits joined; a five-comment queue prepared (`docs/launch/reddit-comment-queue.md`); target list with subscriber counts and moderation notes (`docs/launch/aeo-geo-community-targets.md`); Part 1 posted to r/Entrepreneurs. Standing practice, comment-first. |
| **3.1 Publish reference material** | **Partly done** | Five blog pages are live and real, verified by byte count today: i-scored-zero (22.0 KB), are-you-the-answer-ai-gives (25.0 KB), reading-isnt-citing (20.2 KB), what-you-actually-get (19.4 KB), how-it-works (18.9 KB). **The two most source-shaped pages — /methodology and /evidence — are built and unpublished.** |
| **1.4 One canonical description** | **Partly done** | A canonical description exists in code (`src/lib/json-ld.ts`) and is used consistently on-site. It is **not** the sentence in this checklist, and it is **not** used verbatim off-site: pigenai.com carries different wording. |
| **0.5 Inbound link from an indexed domain** | **One exists, not by our action** | pigenai.com already links to aeoanalyzers.com as a real crawlable anchor — verified Sep 7. That is the single most valuable one and it is already in place; what is wrong there is the surrounding description, which is the handover already filed. |
| **3.2 Answer the losing questions** | **Partly** | Several blog posts address category questions. The dedicated comparison page, D1, was never built. |

## Not done — no record of ever being done

| Step | Status | Note |
|---|---|---|
| **0.2 Google Search Console** | ⚑ **confirm** | No record anywhere in the repo. If the domain is verified and the sitemap submitted, tell me and I will log it. Note the sitemap only became correct today, so a submission before today submitted a list that declared five non-pages. |
| **0.3 Bing Webmaster Tools** | ⚑ **confirm** | No record. |
| **0.4 IndexNow** | **Not done** | No key file, no ping code, no mention. Verifiable in the repo, so this one is certain. |
| **1.1 Wikidata — both items** | **Not done** | Recorded repeatedly as pending, with a standing rule never to invent Q-IDs. Certain. |
| **1.2 LinkedIn company page** | ⚑ **confirm** | Zero mentions in the entire repo. |
| **1.3 Crunchbase** | **Not done** | Appears only as a plan line. |
| **2.1 Find the cited URL and its entry path, per target** | **Not done** | This is the research task you assigned for Thursday. Not started. |
| **2.2 Directories — G2, AlternativeTo, SaaSHub, Product Hunt, Capterra/GetApp** | **Not done** | Plan lines only, in the Wave 1 plan and the GTM plan. No profile, no submission recorded. |
| **2.3 Reviewer and press pitches** | **Not done** | Target names exist; no pitch sent. |
| **3.3 Independent coverage** | **Not done** | Hacker News and podcasts both listed as October founder tasks. |

## Done many times, but not on this checklist

Worth stating so the effort is not invisible. These are real and they are why layer 0 on-site is
in good shape:

- AEO analyzer runs against aeoanalyzers.com, repeatedly, with the fixes applied each round.
- Citation sweeps of our own domain: the Aug 1 anchor at N=240, the September re-measure at
  N=240, plus earlier runs on Jul 30 and Aug 1 visible in History.
- On-site entity work: connected `@graph`, Organization and WebApplication nodes,
  `disambiguatingDescription`, crawler-access audit, `llms.txt`, `robots.txt`, prerendered home
  page, and the sitemap rewritten today to declare only pages that exist.

The checklist's own framing explains why none of this moved the number: it is all layer 0 and
on-site, and the constraint is layer 2, which is other people's pages.

---

## What I would do first, given this audit

1. **Wikidata, both items.** Forty minutes, certain to be undone, and it is the anchor for the
   American Eagle collision that nothing else fixes.
2. **Search Console and Bing.** If already verified, re-submit the sitemap — the one you would
   have submitted before today declared five URLs that serve the homepage shell.
3. **IndexNow.** Cheap, certain to be undone, and you are about to publish several pages.
4. **Publish /methodology and /evidence.** They are built, they are the most source-shaped
   content we have, and vendor domains do get cited once they publish exactly this shape.
5. Then the Thursday directory research, then D1.

**One correction to the checklist itself:** its "Today" line for 0.1 says the bot-log question has
been theorised about for four days. It is now answered. ClaudeBot has crawled for training;
Claude-SearchBot, the agent that populates the search index, never has. That is a discovery
problem, so submission and inbound links are the right fixes, and no amount of content work
substitutes for them.
