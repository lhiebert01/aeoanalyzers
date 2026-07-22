import type { AnalysisResult } from './geminiService';
import { categoryFromAnswerQuality, type GapCategory } from '../lib/queryGap';

function docxGapAction(cat: GapCategory): string {
  if (cat === 'strong') return 'No action needed — maintain current content';
  if (cat === 'schema_only') return 'Answer already on page — wrap it in FAQPage schema (do NOT create new content)';
  if (cat === 'partial') return 'Expand existing content with additional details, metrics, and examples';
  return 'Create dedicated content answering this question with specific facts and data';
}

function docxGapStatus(cat: GapCategory): string {
  return cat === 'schema_only' ? 'Schema only' : cat.charAt(0).toUpperCase() + cat.slice(1);
}

export async function generateDocxReport(
  result: AnalysisResult,
  analyzedUrl: string,
  displayName: string
): Promise<void> {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    BorderStyle,
    TableCell,
    TableRow,
    Table,
    WidthType,
    ShadingType,
  } = await import('docx');

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const domain = (() => {
    try {
      return new URL(analyzedUrl.startsWith('http') ? analyzedUrl : `https://${analyzedUrl}`).hostname;
    } catch {
      return analyzedUrl;
    }
  })();

  const weakAreas = result.criteria.filter(c => c.score < 7).sort((a, b) => a.score - b.score);
  const strongAreas = result.criteria.filter(c => c.score >= 7).sort((a, b) => b.score - a.score);
  const topPriorities = [...result.criteria].sort((a, b) => a.score - b.score).slice(0, 3);

  const spacer = () => new Paragraph({ spacing: { after: 200 } });

  const sectionHeading = (text: string) =>
    new Paragraph({
      children: [new TextRun({ text, bold: true, size: 28, color: '1a1a2e' })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'e0e0e0' },
      },
    });

  const bodyText = (text: string) =>
    new Paragraph({
      children: [new TextRun({ text, size: 22, color: '333333' })],
      spacing: { after: 120 },
    });

  const bulletPoint = (text: string) =>
    new Paragraph({
      children: [new TextRun({ text, size: 22, color: '333333' })],
      bullet: { level: 0 },
      spacing: { after: 80 },
    });

  const boldBodyText = (label: string, value: string) =>
    new Paragraph({
      children: [
        new TextRun({ text: label, bold: true, size: 22, color: '1a1a2e' }),
        new TextRun({ text: value, size: 22, color: '333333' }),
      ],
      spacing: { after: 120 },
    });

  // --- Build document sections ---
  const children: any[] = [];

  // 1. Title Page
  children.push(
    new Paragraph({ spacing: { before: 1200 } }),
    new Paragraph({
      children: [new TextRun({ text: 'AEO Analysis Report', bold: true, size: 52, color: '1a1a2e' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: analyzedUrl, size: 24, color: '666666', italics: true })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [new TextRun({ text: date, size: 22, color: '999999' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Prepared by: ${displayName}`, size: 24, color: '333333' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `AEO Score: ${result.score}/100`, bold: true, size: 32, color: '1a1a2e' }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Citation Probability: ${result.citationProbability}%`,
          bold: true,
          size: 28,
          color: result.citationProbability >= 60 ? '16a34a' : result.citationProbability >= 30 ? 'ca8a04' : 'dc2626',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    })
  );

  // Score Rating Table
  const scoreRatingTiers: [string, string, string][] = [
    ['0–30', 'Poor', 'AI engines will almost never cite this site'],
    ['31–50', 'Below Average', 'Major gaps — AI may find the site but won\'t trust it as a source'],
    ['51–70', 'Okay / Fair', 'Foundational elements exist but content lacks the specificity AI needs to cite confidently'],
    ['71–85', 'Good', 'Strong structure + content — AI will cite this for many relevant queries'],
    ['86–100', 'Excellent', 'Source of Truth — AI engines actively prefer this site as a primary reference'],
  ];
  const activeTierIdx = result.score <= 30 ? 0 : result.score <= 50 ? 1 : result.score <= 70 ? 2 : result.score <= 85 ? 3 : 4;

  children.push(
    sectionHeading('What Your Score Means'),
    new Table({
      rows: [
        new TableRow({
          children: ['Range', 'Rating', 'What it means'].map(
            text =>
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, color: 'ffffff' })] })],
                shading: { type: ShadingType.SOLID, color: '1a1a2e' },
                width: { size: 33, type: WidthType.PERCENTAGE },
              })
          ),
        }),
        ...scoreRatingTiers.map(
          ([range, rating, desc], i) =>
            new TableRow({
              children: [range, rating, desc].map(
                text =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text, bold: i === activeTierIdx, size: 20, color: i === activeTierIdx ? '1a1a2e' : '333333' })] })],
                    width: { size: 33, type: WidthType.PERCENTAGE },
                    ...(i === activeTierIdx ? { shading: { type: ShadingType.SOLID, color: 'e8e8ee' } } : {}),
                  })
              ),
            })
        ),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Your score of ${result.score}/100 with ${result.citationProbability}% citation probability places you in the `, size: 22, color: '333333' }),
        new TextRun({ text: scoreRatingTiers[activeTierIdx][1], bold: true, size: 22, color: '1a1a2e' }),
        new TextRun({ text: ' range.', size: 22, color: '333333' }),
      ],
      spacing: { before: 200, after: 200 },
    }),
    spacer()
  );

  // What is JSON-LD?
  children.push(
    sectionHeading('What is JSON-LD and Why Does It Matter?'),
    bodyText(
      'JSON-LD (JavaScript Object Notation for Linked Data) is a small block of structured code placed in your website\'s <head> section. It acts as a machine-readable "business card" — telling AI engines exactly what your business does, what products and services you offer, and how to cite you.'
    ),
    boldBodyText('How AI Answer Engines use JSON-LD: ', 'When an AI engine like Google Gemini, ChatGPT, or Perplexity answers a user\'s question, it scans websites for structured, trustworthy data it can quote. JSON-LD gives the AI a pre-organized summary of your business — no guessing required. Without it, AI has to infer your offerings from unstructured page content, which leads to incomplete or inaccurate citations.'),
    bodyText(
      'Sites with comprehensive JSON-LD improve their chances of being cited as an authoritative source, because the AI can extract exact service names, descriptions, and capabilities with high confidence.'
    ),
    spacer()
  );

  // 2. Why This Matters
  children.push(
    sectionHeading('Why This Matters'),
    bodyText(
      'AI-powered search engines like Google Gemini, ChatGPT, and Perplexity are replacing traditional search results with direct answers. When a potential customer asks an AI a question about your industry, the AI pulls its answer from websites it considers authoritative and well-structured.'
    ),
    bodyText(
      'If your website is not optimized for these AI engines, your competitors get cited instead — and you lose the customer without ever knowing it. This is not about traditional SEO. This is about making your website readable, trustworthy, and citable by AI systems.'
    ),
    spacer()
  );

  // 3. Executive Summary
  children.push(
    sectionHeading('Executive Summary'),
    bodyText(result.summary),
    spacer()
  );

  // Crawler Access (foundational — an AI engine that can't crawl you can't cite you)
  if (result.crawlerAccess) {
    const ca = result.crawlerAccess;
    children.push(
      sectionHeading('AI Crawler Access'),
      bodyText(`Crawler-access score: ${ca.score}/100. ${ca.summary}`),
    );
    if (result.scoreBeforeCrawlerCap != null) {
      children.push(
        bodyText(`NOTE: The headline AEO score was capped at ${result.score}/100 (from ${result.scoreBeforeCrawlerCap}) because citation-critical AI crawlers are blocked. A page the answer engines cannot read cannot be their source of truth.`)
      );
    }
    if (ca.blockedBots.length > 0) {
      children.push(bodyText(`Blocked AI crawlers: ${ca.blockedBots.map(b => b.name).join(', ')}.`));
    }
    children.push(bodyText(`robots.txt: ${ca.robotsFound ? 'found' : 'not found (default-allow)'}. llms.txt: ${ca.llmsTxtFound ? 'present' : 'missing'}.`));
    for (const rec of ca.recommendations) children.push(bodyText(`• ${rec}`));
    children.push(spacer());
  }

  // Score Breakdown (if available)
  if (result.scoreBreakdown) {
    const sb = result.scoreBreakdown;
    children.push(
      sectionHeading('Score Breakdown'),
      bodyText(`AEO Score = Entity × 0.3 + Density × 0.3 + Clarity × 0.2 + Structure × 0.2`),
      new Table({
        rows: [
          new TableRow({
            children: ['Dimension', 'Score', 'Weight'].map(
              text =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 20, color: 'ffffff' })] })],
                  shading: { type: ShadingType.SOLID, color: '1a1a2e' },
                  width: { size: 33, type: WidthType.PERCENTAGE },
                })
            ),
          }),
          ...([
            ['Entity', sb.entity, '30%'],
            ['Density', sb.density, '30%'],
            ['Clarity', sb.clarity, '20%'],
            ['Structure', sb.structure, '20%'],
          ] as [string, number, string][]).map(
            ([name, score, weight]) =>
              new TableRow({
                children: [name, `${score}/100`, weight].map(
                  text =>
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text: String(text), size: 20 })] })],
                      width: { size: 33, type: WidthType.PERCENTAGE },
                    })
                ),
              })
          ),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      spacer()
    );
  }

  // 4. Main Areas Needing Improvement
  if (weakAreas.length > 0) {
    children.push(sectionHeading('Main Areas Needing Improvement'));
    weakAreas.forEach(c => {
      children.push(
        boldBodyText(`${c.name}: `, `${c.score}/10`),
        bodyText(c.feedback)
      );
    });
    children.push(spacer());
  }

  // 5. Areas of Strength
  if (strongAreas.length > 0) {
    children.push(sectionHeading('Areas of Strength'));
    strongAreas.forEach(c => {
      children.push(
        boldBodyText(`${c.name}: `, `${c.score}/10`),
        bodyText(c.feedback)
      );
    });
    children.push(spacer());
  }

  // 6. Top 3 Priorities
  children.push(sectionHeading('Top 3 Priorities'));
  topPriorities.forEach((c, i) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: `${i + 1}. ${c.name} (Score: ${c.score}/10)`, bold: true, size: 24, color: '1a1a2e' })],
        spacing: { before: 200, after: 80 },
      }),
      bodyText(c.feedback)
    );
  });
  children.push(spacer());

  // 7. Implementation Instructions
  children.push(
    sectionHeading('Implementation Instructions'),
    new Paragraph({
      children: [new TextRun({ text: 'A. Structured Data Tasks (JSON-LD)', bold: true, size: 24, color: '1a1a2e' })],
      spacing: { before: 200, after: 100 },
    }),
    bodyText(
      'JSON-LD is a small block of code that goes in your website\'s <head> section. It acts as a "business card" for AI — telling search engines and AI agents exactly what your business does, what you offer, and how to cite you.'
    ),
    bulletPoint('Service schema on solution and services pages'),
    bulletPoint('Product schema on product pages'),
    bulletPoint('FAQPage schema on pages with Q&A content'),
    bulletPoint('Organization schema with detailed attributes'),
    bulletPoint('OfferCatalog schema where multiple solutions are grouped')
  );

  if (result.schemaSnippet) {
    let formattedSnippet = result.schemaSnippet;
    try { formattedSnippet = JSON.stringify(JSON.parse(result.schemaSnippet), null, 2); } catch { /* use as-is */ }
    children.push(
      boldBodyText('Generated JSON-LD for ', `${analyzedUrl}:`),
      bodyText('Paste this complete schema into your site\'s <head> section on your main Services or Solutions page. It lists all detected products, services, and capabilities.'),
      new Paragraph({
        children: [new TextRun({ text: formattedSnippet, size: 16, font: 'Courier New', color: '333333' })],
        spacing: { after: 200 },
      })
    );
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'B. Content Architecture Tasks', bold: true, size: 24, color: '1a1a2e' })],
      spacing: { before: 200, after: 100 },
    }),
    bulletPoint('A clear H1 heading that defines the offering'),
    bulletPoint('A concise intro paragraph stating what the page is about'),
    bulletPoint('Logical H2/H3 subheadings'),
    bulletPoint('Short sections answering common questions'),
    bulletPoint('Lists or tables for specifications and capabilities'),
    bulletPoint('FAQ content near the bottom where appropriate'),

    new Paragraph({
      children: [new TextRun({ text: 'C. Semantic HTML Tasks', bold: true, size: 24, color: '1a1a2e' })],
      spacing: { before: 200, after: 100 },
    }),
    bulletPoint('<main> for primary content'),
    bulletPoint('<article> for self-contained content blocks'),
    bulletPoint('<section> for thematic groupings'),
    bulletPoint('<header> and <footer> for page/section headers and footers'),
    bulletPoint('<nav> for navigation'),

    new Paragraph({
      children: [new TextRun({ text: 'D. Content Guidance', bold: true, size: 24, color: '1a1a2e' })],
      spacing: { before: 200, after: 100 },
    }),
    boldBodyText('Reduce: ', 'broad adjectives, generic claims, purely promotional phrasing'),
    boldBodyText('Increase: ', 'definitions, use cases, technical specifics, measurable facts, supported technologies, deployment context, operational benefits tied to real capabilities'),
    spacer()
  );

  // 8. Platform Instructions
  children.push(
    sectionHeading('Platform Instructions'),
    boldBodyText('WordPress: ', 'Install "Insert Headers and Footers" plugin, paste JSON-LD in Header section.'),
    boldBodyText('Shopify: ', 'Edit theme.liquid, paste above </head>.'),
    boldBodyText('HubSpot: ', 'Settings > Website > Pages > Site Header HTML.'),
    boldBodyText('Wix: ', 'Settings > Custom Code > Add Code > Head > All Pages.'),
    boldBodyText('Custom Code: ', 'Paste directly in your HTML <head> tag.'),
    spacer()
  );

  // 9. Rollout Plan
  children.push(
    sectionHeading('Rollout Plan'),
    new Paragraph({
      children: [new TextRun({ text: 'Phase 1: High-Impact Technical Changes (1-2 days)', bold: true, size: 24, color: '1a1a2e' })],
      spacing: { before: 200, after: 100 },
    }),
    bulletPoint('Add JSON-LD structured data to priority pages'),
    bulletPoint('Improve semantic HTML structure'),
    bulletPoint('Review titles, meta descriptions, and alt text'),

    new Paragraph({
      children: [new TextRun({ text: 'Phase 2: Core Page Rewrites (1-2 weeks)', bold: true, size: 24, color: '1a1a2e' })],
      spacing: { before: 200, after: 100 },
    }),
    bulletPoint('Homepage content optimization'),
    bulletPoint('Main product and service pages'),
    bulletPoint('About page with specific company facts'),

    new Paragraph({
      children: [new TextRun({ text: 'Phase 3: Citation-Building Content (ongoing)', bold: true, size: 24, color: '1a1a2e' })],
      spacing: { before: 200, after: 100 },
    }),
    bulletPoint('Publish FAQ pages with structured data'),
    bulletPoint('Create technical explainer content'),
    bulletPoint('Add use-case and deployment documentation'),
    spacer()
  );

  // 10. Success Criteria
  children.push(
    sectionHeading('Success Criteria'),
    bulletPoint('AI agents can clearly identify your products and services'),
    bulletPoint('Key pages contain direct, factual answers to common questions'),
    bulletPoint('Structured data is page-specific and valid'),
    bulletPoint('Product and service pages are more likely to be cited as primary references'),
    spacer()
  );

  // Citation Hook Density (Phase 3a)
  if (result.citationHookDensity) {
    const chd = result.citationHookDensity;
    children.push(
      sectionHeading('Citation Hook Density'),
      boldBodyText('Factual Density Score: ', `${chd.factualDensityScore}/100`),
      boldBodyText('Statistics Found: ', `${chd.statsCount}`),
      boldBodyText('Percentages Found: ', `${chd.percentagesCount}`),
      new Paragraph({
        children: [new TextRun({ text: 'Top Citable Sentences:', bold: true, size: 22, color: '1a1a2e' })],
        spacing: { before: 100, after: 80 },
      }),
      ...chd.exampleHooks.map(h => bulletPoint(h)),
      spacer()
    );
  }

  // E-E-A-T Author Audit (Phase 3a)
  if (result.eatAudit) {
    const eat = result.eatAudit;
    children.push(
      sectionHeading('E-E-A-T Author Audit'),
      boldBodyText('E-E-A-T Score: ', `${eat.eatScore}/100`),
      boldBodyText('Author Found: ', eat.authorFound ? `Yes — ${eat.authorName || 'Unknown'}` : 'No'),
      ...(eat.genericAuthorFlag ? [bodyText('Warning: Generic author name detected (e.g., "Admin", "Staff").')] : []),
      ...(eat.trustSignals.length > 0
        ? [
            new Paragraph({ children: [new TextRun({ text: 'Trust Signals:', bold: true, size: 22, color: '1a1a2e' })], spacing: { before: 100, after: 80 } }),
            ...eat.trustSignals.map(s => bulletPoint(s)),
          ]
        : []),
      ...(eat.warnings.length > 0
        ? [
            new Paragraph({ children: [new TextRun({ text: 'Warnings:', bold: true, size: 22, color: 'dc2626' })], spacing: { before: 100, after: 80 } }),
            ...eat.warnings.map(w => bulletPoint(w)),
          ]
        : []),
      spacer()
    );
  }

  // LLM Summarization Test (Phase 3b)
  if (result.llmSummarizationTest) {
    const lst = result.llmSummarizationTest;
    children.push(
      sectionHeading('LLM Summarization Test'),
      boldBodyText('Metadata Intent: ', lst.metadataIntent),
      boldBodyText('AI Summary: ', lst.aiSummary),
      boldBodyText('Alignment: ', lst.alignment),
      bodyText(lst.explanation),
      spacer()
    );
  }

  // Zero-Click Predictor (Phase 3b)
  if (result.zeroClickPredictor) {
    const zcp = result.zeroClickPredictor;
    children.push(
      sectionHeading('Zero-Click / Featured Snippet Predictor'),
      boldBodyText('Featured Snippet Readiness: ', `${zcp.featuredSnippetReadiness}/100`),
      ...(zcp.snippetOpportunities.length > 0
        ? [
            new Paragraph({ children: [new TextRun({ text: 'Snippet Opportunities:', bold: true, size: 22, color: '1a1a2e' })], spacing: { before: 100, after: 80 } }),
            ...zcp.snippetOpportunities.flatMap(o => [
              bulletPoint(`Current: ${o.currentText}`),
              bodyText(`  Suggested format: ${o.suggestedFormat} — ${o.reason}`),
            ]),
          ]
        : []),
      spacer()
    );
  }

  // Query-to-Content Gap (Phase 3c)
  if (result.queryContentGap) {
    const qcg = result.queryContentGap;
    children.push(
      sectionHeading('Query-to-Content Gap Analysis'),
      boldBodyText('Gap Score: ', `${qcg.gapScore}/100`),
      new Paragraph({ children: [new TextRun({ text: 'Generated Questions:', bold: true, size: 22, color: '1a1a2e' })], spacing: { before: 100, after: 80 } }),
      ...qcg.generatedQuestions.map(q =>
        bulletPoint(`${q.question} — ${docxGapStatus(q.gapCategory || categoryFromAnswerQuality(q.answerQuality, !!q.sourceQuote))}${q.answered ? '' : ' (NOT answered)'}`)
      ),
      spacer()
    );
  }

  // Semantic Chunking (Phase 3c)
  if (result.semanticChunking) {
    const sc = result.semanticChunking;
    children.push(
      sectionHeading('Semantic Chunking Analysis'),
      boldBodyText('Chunking Score: ', `${sc.chunkingScore}/100`),
      ...(sc.longBlocks.length > 0
        ? [
            new Paragraph({ children: [new TextRun({ text: 'Long Content Blocks Without Headings:', bold: true, size: 22, color: '1a1a2e' })], spacing: { before: 100, after: 80 } }),
            ...sc.longBlocks.flatMap(b => [
              bulletPoint(`~${b.approximateWordCount} words: "${b.context}"`),
              bodyText(`  Suggested heading: "${b.suggestedHeading}"`),
            ]),
          ]
        : []),
      spacer()
    );
  }

  // 11. Recommendations
  if (result.recommendations && result.recommendations.length > 0) {
    children.push(sectionHeading('Full Recommendations'));
    result.recommendations.forEach(rec => {
      children.push(bulletPoint(rec));
    });
    children.push(spacer());
  }

  // --- Appendix Sections ---

  // Appendix A: Verified Schema (Safe to Paste) + Candidate Schema (Verify First)
  const verified = result.verifiedSchema || result.comprehensiveSchema;
  if (verified) {
    let formattedVerified = verified;
    try { formattedVerified = JSON.stringify(JSON.parse(verified), null, 2); } catch { /* use as-is */ }
    children.push(
      sectionHeading('Appendix A: Verified Schema (Safe to Paste)'),
      bodyText(
        'The following JSON-LD contains ONLY values detected on your page, and only user-facing services (internal architecture modules excluded). Every value here is supported by content on your site, so it is safe to paste into your <head> section as-is.'
      ),
      boldBodyText('Where to use: ', 'Main Services page, Solutions page, or Homepage — whichever page lists your full product/service portfolio.'),
      new Paragraph({
        children: [new TextRun({ text: formattedVerified, size: 16, font: 'Courier New', color: '333333' })],
        spacing: { after: 200 },
      }),
      spacer()
    );
  }

  // Inferred fields are quarantined into a clearly-labeled, verify-first block.
  if (result.candidateSchema && result.candidateSchema.trim()) {
    let formattedCandidate = result.candidateSchema;
    try { formattedCandidate = JSON.stringify(JSON.parse(result.candidateSchema), null, 2); } catch { /* use as-is */ }
    children.push(
      sectionHeading('Appendix A2: Candidate Schema (Verify Before Pasting)'),
      bodyText(
        'WARNING: The fields below were inferred, not detected on your page. Confirm each value is accurate before publishing. Pasting unverified values can teach AI engines incorrect facts about your business.'
      ),
      new Paragraph({
        children: [new TextRun({ text: formattedCandidate, size: 16, font: 'Courier New', color: '8a5a00' })],
        spacing: { after: 200 },
      }),
      spacer()
    );
  }

  // Schema-density opportunities (editorial sites get this instead of voice rewrites).
  if (result.schemaDensityRecommendations && result.schemaDensityRecommendations.length > 0) {
    children.push(
      sectionHeading('Appendix A3: Schema-Density Opportunities'),
      bodyText(
        'Your brand voice is an asset. Rather than rewriting prose, raise your AEO score by adding the structured data below — it enriches metadata without touching your content.'
      ),
      ...result.schemaDensityRecommendations.map(rec =>
        bulletPoint(`${rec.schemaType}: ${rec.reason} (${rec.benefit})`)
      ),
      spacer()
    );
  }

  // Appendix B: Content Rewrite Examples
  if (result.contentRewrites && result.contentRewrites.length > 0) {
    children.push(
      sectionHeading('Appendix B: Content Rewrite Examples'),
      bodyText(
        'AI engines cite pages with specific, measurable claims over pages with vague marketing language. The table below shows "Adjective-to-Metric" rewrites — replacing low-citation phrases from your actual content with high-citation alternatives that AI systems prefer to quote.'
      ),
      new Table({
        rows: [
          new TableRow({
            children: ['Page / Section', 'Current (Low Citation)', 'Proposed (High Citation)'].map(
              text =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, color: 'ffffff' })] })],
                  shading: { type: ShadingType.SOLID, color: '1a1a2e' },
                  width: { size: 33, type: WidthType.PERCENTAGE },
                })
            ),
          }),
          ...result.contentRewrites.map(
            rw =>
              new TableRow({
                children: [rw.page, rw.current, rw.proposed].map(
                  text =>
                    new TableCell({
                      children: [new Paragraph({ children: [new TextRun({ text, size: 18 })] })],
                      width: { size: 33, type: WidthType.PERCENTAGE },
                    })
                ),
              })
          ),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      spacer()
    );
  }

  // Appendix C: Meta Description Rewrite
  if (result.metaDescriptionRewrite) {
    children.push(
      sectionHeading('Appendix C: Meta Description Rewrite'),
      bodyText(
        'Your meta description is the first thing AI agents read when deciding whether to cite your page. A specific, fact-rich meta description dramatically increases citation probability.'
      ),
      boldBodyText('Current: ', result.metaDescriptionRewrite.current),
      boldBodyText('Suggested: ', result.metaDescriptionRewrite.suggested),
      spacer()
    );
  }

  // Appendix D: Knowledge Gap Action Table
  if (result.queryContentGap && result.queryContentGap.generatedQuestions.length > 0) {
    children.push(
      sectionHeading('Appendix D: Knowledge Gap Action Table'),
      bodyText(
        'This table maps each question AI agents are likely to ask about your business to its current answer status and the specific action required to close the gap.'
      ),
      new Table({
        rows: [
          new TableRow({
            children: ['Question', 'Status', 'Required Action'].map(
              text =>
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, color: 'ffffff' })] })],
                  shading: { type: ShadingType.SOLID, color: '1a1a2e' },
                  width: { size: 33, type: WidthType.PERCENTAGE },
                })
            ),
          }),
          ...result.queryContentGap.generatedQuestions.map(q => {
            const cat = q.gapCategory || categoryFromAnswerQuality(q.answerQuality, !!q.sourceQuote);
            const action = docxGapAction(cat);
            return new TableRow({
              children: [q.question, docxGapStatus(cat), action].map(
                text =>
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text, size: 18 })] })],
                    width: { size: 33, type: WidthType.PERCENTAGE },
                  })
              ),
            });
          }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
      spacer()
    );
  }

  // Appendix E: Implementation Checklist
  if (result.implementationChecklist && result.implementationChecklist.length > 0) {
    children.push(
      sectionHeading('Appendix E: Implementation Checklist'),
      bodyText(
        'A prioritized checklist of all actions needed to maximize your AEO score. Work through High priority items first, then Medium, then Low.'
      ),
      ...result.implementationChecklist.map(item =>
        new Paragraph({
          children: [
            new TextRun({ text: `[ ] `, size: 22, font: 'Courier New', color: '333333' }),
            new TextRun({
              text: `[${item.priority.toUpperCase()}] `,
              bold: true,
              size: 22,
              color: item.priority === 'High' ? 'dc2626' : item.priority === 'Medium' ? 'ca8a04' : '16a34a',
            }),
            new TextRun({ text: `${item.category}: `, bold: true, size: 22, color: '1a1a2e' }),
            new TextRun({ text: item.action, size: 22, color: '333333' }),
          ],
          spacing: { after: 80 },
        })
      ),
      spacer()
    );
  }

  // 12. Footer
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Generated by AEO Analyzers — aeoanalyzers.com', size: 18, color: '999999', italics: true }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'e0e0e0' },
      },
    })
  );

  const doc = new Document({
    creator: 'AEO Analyzers',
    title: `AEO Analysis Report — ${domain}`,
    description: `AEO Analysis Report for ${analyzedUrl}`,
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `AEO-Report-${domain}-${new Date().toISOString().split('T')[0]}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
