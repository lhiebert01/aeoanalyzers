# Entity registry — PIGENAI LLC and AEO Analyzers

The single source for our public identifiers. Update this file whenever a listing is created or changes. Never record tax IDs, charter numbers, account passwords or private emails here; this repository is public.

## Canonical names (Sep 5, 2026 naming ruling)
- Company: PIGENAI LLC (one word, all caps). "PI GenAI LLC" is the retired spelling and appears only as an alias.
- Product: AEO Analyzers (two words) everywhere words are read. "AEOANALYZERS" is the wordmark in pixels only; "aeoanalyzers" is the domain and handle; "AEOAnalyzers" is an alias.
- Founder: Lindsay Hiebert, Founder and CEO, PIGENAI LLC.

## Wikidata (created October 15th, 2026)
| Entity | Q-ID | URL | Description on Wikidata |
|---|---|---|---|
| PIGENAI LLC | Q141739140 | https://www.wikidata.org/wiki/Q141739140 | software company in Kansas City, Missouri, United States |
| AEO Analyzers | Q141739225 | https://www.wikidata.org/wiki/Q141739225 | software that measures and records how AI answer engines describe and recommend companies |

Statements on PIGENAI LLC (each referenced to https://pigenai.com): instance of business; legal form limited liability company; country United States; headquarters location Kansas City (Missouri); official website https://pigenai.com; product or material produced AEO Analyzers (Q141739225).
Statements on AEO Analyzers (each referenced to https://aeoanalyzers.com): instance of web application; developer PIGENAI LLC (Q141739140); country of origin United States; official website https://aeoanalyzers.com.
Aliases: PIGENAI LLC → PIGENAI, PI GenAI LLC. AEO Analyzers → AEOAnalyzers, aeoanalyzers.com.

## Structured data @ids on our sites
| Node | @id | sameAs includes |
|---|---|---|
| Organization | https://pigenai.com/#org | Wikidata Q141739140; Crunchbase (2026-11-01). Served in full on aeoanalyzers.com (src/lib/json-ld.ts) and on pigenai.com (separate repository; Wikidata only there). |
| Person | https://pigenai.com/#lindsay | (as already set; X: @Lindsay_Hiebert) |
| SoftwareApplication | https://aeoanalyzers.com/#app | Wikidata Q141739225; AlternativeTo (2026-10-15); LinkedIn company page (2026-11-01) |

## Listings (directories and profiles)
| Listing | URL | Status | Date live | Added to Wikidata as a reference? |
|---|---|---|---|---|
| AlternativeTo | https://alternativeto.net/software/aeo-analyzers/ | live | 2026-10-15 | yes, on AEO Analyzers (Q141739225), 2026-11-01; submitted 2026-10-15, publicly reachable 2026-10-15, approval confirmed 2026-11-01 |
| Crunchbase | https://www.crunchbase.com/organization/pigenai-llc | live | 2026-11-01 | yes, on PIGENAI LLC (Q141739140), 2026-11-01; profile of the company, so it is on the Organization sameAs |
| G2 | | planned (founder, Oct 16) | | |
| Slashdot / SourceForge | | submitted 2026-11-01 (review pending; not live yet) | | |
| LinkedIn company page | https://www.linkedin.com/company/aeoanalyzers/ | live | 2026-11-01 | not yet; page named AEO Analyzers, so it is on the SoftwareApplication sameAs |
| GitHub repository | https://github.com/lhiebert01/aeoanalyzers | live | | n/a |

## Canonical listing text (use word for word; no prices)
Short: Measures what AI answer engines say when buyers ask for a recommendation.
Long: AEO Analyzers measures what AI answer engines say when buyers ask for a recommendation in your category. Pro and Business ask five answer engines: ChatGPT, Claude, Perplexity, Gemini and Grok. The no-subscription Day Pass asks four. Every answer is stored, every result names its engine panel, and being found by name is reported separately from being recommended. Built by PIGENAI LLC in Kansas City, Missouri. Founder: Lindsay Hiebert.
Pricing model: Freemium, linked to https://aeoanalyzers.com/pricing. No price figures in any listing.

## Change log
- 2026-10-15 — Wikidata items Q141739140 and Q141739225 created by the founder; registry created (WO-013).
- 2026-10-15 — AlternativeTo submitted by the founder (priority review); G2 and Slashdot planned Oct 16; Crunchbase and LinkedIn moved to the week of Oct 19. No listing is live yet, so no listing URL is in sameAs.
- 2026-10-15 — AlternativeTo live (https://alternativeto.net/software/aeo-analyzers/, platform Online, developer PIGENAI LLC); added to the SoftwareApplication sameAs on aeoanalyzers.com (product node only). Long text updated to the five-first wording (founder ruling 10:07 CT, WO-008); the AlternativeTo description still carries the earlier four-first text until the founder edits it.
- 2026-11-01 — AlternativeTo approval confirmed by the founder (submissions queue empty). The listing page states it was added and last updated 2026-10-15; it was publicly reachable when first checked that day, so the live date stays 2026-10-15. Entered in the founder's Record (submitted and live, both 2026-10-15).
- 2026-11-01 — Crunchbase (PIGENAI LLC) live and added to the Organization sameAs; LinkedIn company page (AEO Analyzers) live and added to the SoftwareApplication sameAs; SourceForge/Slashdot submitted. Wikidata: Crunchbase added on Q141739140 and AlternativeTo on Q141739225 (founder). Crunchbase could not be fetched by script (Cloudflare); live per the founder.
