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
function organizationNode() {
  return {
    '@type': 'Organization',
    '@id': ORG_ID,
    name: 'AEO Analyzers by PI GenAI LLC',
    alternateName: 'AEO Analyzers',
    legalName: 'PI GenAI LLC',
    url: SITE_URL,
    logo: `${SITE_URL}/aeo-og-bta-2026b.png`,
    description: APP_DESCRIPTION,
    disambiguatingDescription: DISAMBIGUATION,
    parentOrganization: { '@type': 'Organization', '@id': PIGENAI_ORG_ID, name: 'PI GenAI LLC', url: 'https://pigenai.com' },
    founder: { '@id': FOUNDER_ID },
    sameAs: [
      'https://pigenai.com',
      'https://www.linkedin.com/company/aeo-analyzers',
      'https://twitter.com/aeoanalyzers',
      'https://github.com/aeoanalyzers',
    ],
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
    name: 'AEO Analyzers by PI GenAI LLC',
    alternateName: 'AEO Analyzers',
    url: SITE_URL,
    publisher: { '@id': ORG_ID },
    description: 'AI-powered Answer Engine Optimization powered by a Google Gemini frontier model. Real frontier-model analysis. Real-world results. 90 seconds.',
  };
}

function softwareApplicationNode() {
  return {
    '@type': 'SoftwareApplication',
    '@id': APP_ID,
    name: 'AEO Analyzers by PI GenAI LLC',
    alternateName: 'AEO Analyzers',
    url: SITE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    provider: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
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
      'Citation Probability Scoring',
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
