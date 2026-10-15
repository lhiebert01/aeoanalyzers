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
| Organization | https://pigenai.com/#org | Wikidata Q141739140, plus the listings below once live. Served in full on aeoanalyzers.com (src/lib/json-ld.ts) and on pigenai.com (separate repository). |
| Person | https://pigenai.com/#lindsay | (as already set; X: @Lindsay_Hiebert) |
| SoftwareApplication | https://aeoanalyzers.com/#app | Wikidata Q141739225; AlternativeTo (2026-10-15); further listings below once live |

## Listings (directories and profiles)
| Listing | URL | Status | Date live | Added to Wikidata as a reference? |
|---|---|---|---|---|
| AlternativeTo | https://alternativeto.net/software/aeo-analyzers/ | live | 2026-10-15 | not yet (founder adds "described at URL" on Q141739225) |
| Crunchbase | | planned (founder, week of Oct 19) | | |
| G2 | | planned (founder, Oct 16) | | |
| Slashdot / SourceForge | | planned (founder, Oct 16) | | |
| LinkedIn company page | | planned (founder, week of Oct 19) | | |
| GitHub repository | https://github.com/lhiebert01/aeoanalyzers | live | | n/a |

## Canonical listing text (use word for word; no prices)
Short: Measures what AI answer engines say when buyers ask for a recommendation.
Long: AEO Analyzers measures what AI answer engines say when buyers ask for a recommendation in your category. Pro and Business ask five answer engines: ChatGPT, Claude, Perplexity, Gemini and Grok. The no-subscription Day Pass asks four. Every answer is stored, every result names its engine panel, and being found by name is reported separately from being recommended. Built by PIGENAI LLC in Kansas City, Missouri. Founder: Lindsay Hiebert.
Pricing model: Freemium, linked to https://aeoanalyzers.com/pricing. No price figures in any listing.

## Change log
- 2026-10-15 — Wikidata items Q141739140 and Q141739225 created by the founder; registry created (WO-013).
- 2026-10-15 — AlternativeTo submitted by the founder (priority review); G2 and Slashdot planned Oct 16; Crunchbase and LinkedIn moved to the week of Oct 19. No listing is live yet, so no listing URL is in sameAs.
- 2026-10-15 — AlternativeTo live (https://alternativeto.net/software/aeo-analyzers/, platform Online, developer PIGENAI LLC); added to the SoftwareApplication sameAs on aeoanalyzers.com (product node only). Long text updated to the five-first wording (founder ruling 10:07 CT, WO-008); the AlternativeTo description still carries the earlier four-first text until the founder edits it.
