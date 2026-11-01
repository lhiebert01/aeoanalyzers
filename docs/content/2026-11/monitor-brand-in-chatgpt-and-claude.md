---
slug: /monitor-brand-in-chatgpt-and-claude
kind: answer
eyebrow: AEO Analyzers · How to
title: How to monitor whether your brand appears in ChatGPT and Claude responses
seo_title: Monitor Your Brand in ChatGPT and Claude | AEO Analyzers
description: Ask the questions buyers ask, with web search on, five times each. Score found, accurate and recommended separately, and repeat every month.
date: 2026-11-01
display_date: November 1, 2026
read_time: 6-minute read
---
**Short answer:** write a fixed set of questions (two that use your name, about ten that a buyer would ask without it), ask each one in ChatGPT and Claude with web search on, five times per engine, and keep every answer and its sources. Score three things separately: whether the answer reached your site, whether it described you correctly, and whether it recommended you. Then ask the same questions again every month and keep a dated list of what you changed in between.

That is the whole method. The rest of this page is the detail that makes the numbers trustworthy.

## Step 1: write two kinds of questions

Questions that use your name ("what is example.com", "who makes Example") test whether an engine can find you and what it says about you. Questions that do not use your name ("best invoicing software for freelancers") test whether an engine recommends you to someone who has never heard of you. These measure different things and move independently, so keep them in separate groups and never average them together.

Write the category questions the way your buyers phrase them, including the comparisons and "alternatives to" questions they really ask. Ten is enough to see a pattern; one is not.

## Step 2: ask with web search on, several times each

Answers vary from one run to the next, so a single answer is an anecdote. Ask each question five times per engine in a fresh conversation, with web search on, so the engine reads current pages instead of answering from memory. If an answer did not search, keep it but count it apart: it tells you what the model remembers, not what it finds.

## Step 3: keep every answer and its sources

Save the full text of each answer and the list of pages it cited. Every number you report later should trace back to answers you can show someone. A spreadsheet works: one row per answer, with the question, engine, date, run number, answer text and cited URLs.

## Step 4: score three things separately

- **Found by name:** for the questions that use your name, did your own site appear among the sources?
- **Described accurately:** when the answer named you, were the facts right (what you do, who runs it, what it costs according to your own pricing page)? Check against your own published facts, not against memory.
- **Recommended:** for the category questions, did the answer name you as an option?

Report each as a count with its denominator ("31 of 40"), not as a single blended score.

## Step 5: read the sources behind the category answers

For the category questions, list the pages the engines cited most often and check each one for your name. Those pages are what the recommendation is built from. If none of them mentions you, an answer built from them will not mention you either, however good your own site is.

## Step 6: repeat monthly, same questions, same engines

Change nothing about the questions or the engines between months, or the months stop being comparable. Keep a separate, dated list of what you did (a page published, a listing created). Put the two side by side. That shows timing. It does not show cause, and it is worth saying so.

## What this looks like in practice

We run this on our own product every month and publish the result. On November 1st, 2026: found by name in 31 of 40 answers (78%), with ChatGPT returning our site 1 time in 10 and Claude 10 times in 10. Recommended in 0 of 200 category answers. None of the 40 pages the engines read most often for our category questions named us. The full series, with the stored answers, is on [the ledger](https://aeoanalyzers.com/evidence).

## Doing it by hand, or not

Everything above works with a spreadsheet and an afternoon a month. [AEO Analyzers](https://aeoanalyzers.com) runs the same method across ChatGPT, Claude, Perplexity and Gemini (and Grok on Pro and Business), stores every answer, and reports the three figures separately. Our twelve-question panel and scoring rules are published as an open repository: https://github.com/lhiebert01/aeo-measurement-panel

## Questions people ask

### Can I just ask ChatGPT "do you know my brand"?
You can, but the answer tells you about one conversation. Buyers do not ask that question. Measure the questions they do ask, several times, with search on.

### Why separate "found" from "recommended"?
Because they have different fixes. Being found depends on your own site being reachable and clear. Being recommended depends on what the pages the engines read for your category say. Blending them hides which problem you have.

### How often should I measure?
Monthly is enough to see movement without chasing noise. Measuring daily mostly measures the variation between runs.
