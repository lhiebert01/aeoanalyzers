# Outreach — canonical location and the public/private split

**This repository is public.** That single fact decides where every outreach artifact lives.

## The rule

| Kind of content | Where it lives | Tracked? |
|---|---|---|
| Copy templates, sequences, subject lines, reply blocks, the footer | `docs/outreach/` | **Yes — canonical** |
| Plans, cadence, guardrails, decision gates | `docs/outreach/`, `docs/GTM90-STATUS-AND-PLAN-2026-08-05.md` | **Yes** |
| The wire release plan | `docs/launch/EIN-LAUNCH-PLAN-AEO-ANALYZERS.md` | **Yes** |
| Any named prospect: person, company, address, verification status, roster history | `private/` only | **No — gitignored** |
| The target slate workbook | `private/GTM90-Master-Target-Slate-v4.2.xlsx` | **No** |
| Anything naming the sending mailbox or the campaign's own infrastructure | `private/` | **No** |

A template is safe to track because it addresses `[FIRST NAME]` at `[DOMAIN]`. The moment a
real name replaces a bracket, the file belongs in `private/`.

## Canonical files here

- **`AEO-OUTREACH-COPY-KIT.md`** — the source of record for all outreach copy. The Word
  version people actually paste from is generated from this file, so edit this one and
  regenerate; never edit the `.docx` by hand.

## Regenerating the Word version

```bash
npx tsx scripts/mdToDocxTables.mjs \
  docs/outreach/AEO-OUTREACH-COPY-KIT.md \
  private/outreach/AEO-OUTREACH-COPY-KIT.docx \
  "AEO Analyzers Outreach Copy Kit"
```

The generated `.docx` goes to `private/outreach/` beside the working copies of the plans, and
to the founder's `Downloads/AEO-OUTREACH-KIT/` folder for use. Binary deliverables are always
regenerated from the Markdown, never patched in place, and verified by extracting their text
rather than grepping their XML.

## Working copies

`private/outreach/` mirrors this folder plus the private material, so the founder has the
whole kit in one place. It is gitignored. Because it is gitignored it does not travel with a
clone, so the Markdown here is the thing that survives.

## History note

On Sep 7 2026, section 2 of `docs/GTM90-STATUS-AND-PLAN-2026-08-05.md` was redacted: it had
carried 16 prospect email addresses and roster details in a tracked, public file since Aug 5
2026. The current tree is clean, but **git history still contains that commit**. Removing it
from history requires a rewrite and a force push, which is a separate decision.
