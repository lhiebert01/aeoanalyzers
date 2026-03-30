import type { AnalysisResult } from './geminiService';

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
    children.push(
      boldBodyText('Generated JSON-LD snippet for ', `${analyzedUrl}:`),
      new Paragraph({
        children: [new TextRun({ text: result.schemaSnippet, size: 18, font: 'Courier New', color: '333333' })],
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
        bulletPoint(`${q.question} — ${q.answerQuality}${q.answered ? '' : ' (NOT answered)'}`)
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
