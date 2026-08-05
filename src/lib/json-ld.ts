const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://aeoanalyzers.com';

// --- Stable @id anchors so every node in the graph cross-references cleanly ---
const ORG_ID = `${SITE_URL}/#organization`;
const FOUNDER_ID = `${SITE_URL}/#founder`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const APP_ID = `${SITE_URL}/#app`;
// PI GenAI LLC hub entity — the portfolio's canonical Organization. Reciprocal
// linking to it is what lets answer engines fuse the whole portfolio into ONE
// authoritative entity (see the AEO remediation playbook, FIX 3).
const PIGENAI_ORG_ID = 'https://pigenai.com/#org';

const APP_DESCRIPTION =
  'AEO Analyzers scores how citable your site is by AI answer engines like Gemini, ChatGPT, Perplexity, and Claude — and gives you the exact fixes, in 90 seconds.';

// WO-DOGFOOD-001: atomic, quotable disambiguation sentence. "AEO Analyzer" is a
// crowded near-generic name (browser extensions, other tools, even a same-named
// WebApplication schema on a third-party domain), which let a reranker fuse a
// stranger onto our entity. This declarative sentence — verbatim in schema AND
// visible HTML — gives engines a first-party fact to resolve the collision.
// Exploit the plural: ours is the only "AEO Analyzer​s".
const DISAMBIGUATION =
  'AEO Analyzers (aeoanalyzers.com) was created and is solely maintained by Lindsay Hiebert, founder of PI GenAI LLC. It is unaffiliated with any similarly named browser extension, plugin, or tool.';

// Node builders (no @context — that lives on the wrapping object / @graph).
// The Organization IS the legal entity PIGENAI LLC (the operator), not a
// separate "AEO Analyzers" company: AEO Analyzers is the SoftwareApplication it
// publishes. Legal facts below are founder-ratified (Aug 5 2026) against the
// Missouri Secretary of State record — do not substitute values from older copy.
function organizationNode() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'PIGENAI LLC',
    legalName: 'PIGENAI LLC',
    alternateName: 'PI GenAI LLC',
    url: 'https://pigenai.com',
    logo: `${SITE_URL}/aeo-og-bta-2026b.png`,
    description:
      'PIGENAI LLC builds and operates AEO Analyzers (aeoanalyzers.com) and a portfolio of practical AI products.',
    foundingDate: '2025-12-18',
    founder: { '@id': FOUNDER_ID },
    address: {
      '@type': 'PostalAddress',
      streetAddress: '5901 NW 63rd Ter, Suite 301',
      addressLocality: 'Kansas City',
      addressRegion: 'MO',
      postalCode: '64151',
      addressCountry: 'US',
    },
    identifier: {
      '@type': 'PropertyValue',
      propertyID: 'Missouri Secretary of State Charter Number',
      value: 'LC014688957',
    },
    // The pigenai.com portfolio-hub @id fuses the portfolio into ONE entity
    // across domains. The Wikidata Q-ID for PIGENAI LLC is PENDING (C4): when
    // the founder mints it, add 'https://www.wikidata.org/wiki/Q…' to this
    // array. Do NOT invent a Q-ID.
    sameAs: ['https://pigenai.com', PIGENAI_ORG_ID],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'Lindsay.Hiebert@gmail.com',
      contactType: 'customer support',
    },
  };
}

// Founder Person — the same canonical identity used across every PI GenAI
// property. The Credly badge URL is the strongest cross-property "same person"
// signal, so it's the load-bearing sameAs.
function founderNode() {
  return {
    '@type': 'Person',
    '@id': FOUNDER_ID,
    name: 'Lindsay Hiebert',
    jobTitle: 'Founder & Sole Creator',
    description:
      '30+ years across major US carriers (AT&T, Verizon, T-Mobile), ~15 years at Cisco Systems, and ~7 years at Intel — including leading the Intel Network Builders ecosystem (550+ partners). CISSP. Solo builder of 15+ production AI apps.',
    worksFor: { '@id': ORG_ID },
    sameAs: [
      'https://www.linkedin.com/in/lindsayhiebert/',
      'https://www.credly.com/badges/c0bbd19c-c33d-4f32-94d9-36a622fe853f/public_url',
    ],
    hasCredential: {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: 'certification',
      name: 'CISSP',
      url: 'https://www.credly.com/badges/c0bbd19c-c33d-4f32-94d9-36a622fe853f/public_url',
      recognizedBy: { '@type': 'Organization', name: '(ISC)²' },
    },
  };
}

function webSiteNode() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: 'AEO Analyzers',
    alternateName: 'AEOAnalyzers',
    url: SITE_URL,
    publisher: { '@id': ORG_ID },
    description: 'AI-powered Answer Engine Optimization powered by a Google Gemini frontier model. Real frontier-model analysis. Real-world results. 90 seconds.',
  };
}

function softwareApplicationNode() {
  return {
    '@type': 'SoftwareApplication',
    '@id': APP_ID,
    name: 'AEO Analyzers',
    alternateName: 'AEOAnalyzers',
    url: SITE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    datePublished: '2026-03',
    provider: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    developer: { '@id': ORG_ID },
    // Wikidata Q-ID for AEO Analyzers (the software) is PENDING (C4): add
    // 'https://www.wikidata.org/wiki/Q…' here when the founder mints it. Do NOT
    // invent a Q-ID.
    sameAs: ['https://pigenai.com'],
    // Explicit sole authorship of the software. Without this, answer engines
    // infer the creator from third-party sources and can misattribute a
    // co-founder that does not exist. Lindsay Hiebert is the sole creator.
    author: { '@id': FOUNDER_ID },
    creator: { '@id': FOUNDER_ID },
    description: APP_DESCRIPTION,
    disambiguatingDescription: DISAMBIGUATION,
    // Real, public pricing (Free / $24 Day Pass / $49 Pro / $199 Business).
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: '0',
      highPrice: '199',
      offerCount: '4',
    },
    featureList: [
      'AI Crawler-Access Audit',
      'AI-Powered AEO Analysis',
      'Competitive Duel Engine',
      'Citation Readiness Scoring',
      'AEO Implementation Roadmaps',
      'AI Search Visibility Reports',
      'Semantic Authority Audit',
    ],
  };
}

// 0. The connected @graph — the preferred, single-block form (all nodes linked
//    by @id). Use this on the primary landing page.
export function getGraphJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [organizationNode(), founderNode(), webSiteNode(), softwareApplicationNode()],
  };
}

// 1. Organization — WHO you are (standalone; @id lets it link to the graph)
export function getOrganizationJsonLd() {
  return { '@context': 'https://schema.org', ...organizationNode() };
}

// 2. WebSite — WHAT your site is
export function getWebSiteJsonLd() {
  return { '@context': 'https://schema.org', ...webSiteNode() };
}

// 3. SoftwareApplication — for SaaS/tools (with pricing)
export function getSoftwareApplicationJsonLd() {
  return { '@context': 'https://schema.org', ...softwareApplicationNode() };
}

// 4. FAQ — CRITICAL for AI citation (biggest single impact)
export function getFAQJsonLd(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}

// 5. AggregateRating + Reviews — INTENTIONALLY REMOVED.
// We do not yet have a verifiable, substantiated body of public reviews, so we
// must NOT emit aggregateRating / Review JSON-LD. Publishing invented review
// counts or star ratings is a deceptive-practice (FTC) and Google
// structured-data-spam risk — the same fabrication the analyzer now refuses to
// generate for our users. When real, verifiable reviews exist (e.g. from a
// third-party platform), add a grounded AggregateRating here sourced from them.

// 6. HowTo — for tutorial/setup pages
export function getHowToJsonLd(steps: Array<{ name: string; text: string; image?: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Optimize for Answer Engines (AEO)',
    description: 'Step-by-step guide to improving your brand\'s visibility in AI search results.',
    totalTime: 'PT15M',
    step: steps.map((step, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: step.name,
      text: step.text,
      image: step.image,
    })),
  };
}

// 8. Article — for blog posts / stories / generated content
export function getArticleJsonLd(article: { title: string; description: string; url: string; datePublished: string; authorName: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    url: article.url,
    datePublished: article.datePublished,
    author: { '@type': 'Person', name: article.authorName },
    publisher: { '@type': 'Organization', name: 'AEO Analyzers', url: SITE_URL },
  };
}

// 9. BreadcrumbList — for navigation clarity
export function getBreadcrumbJsonLd(items: Array<{ name: string; item: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.item}`,
    })),
  };
}
