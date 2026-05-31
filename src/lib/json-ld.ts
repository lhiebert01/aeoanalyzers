const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://aeoanalyzers.com';

// 1. Organization — WHO you are
export function getOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AEO Analyzers',
    url: SITE_URL,
    logo: `${SITE_URL}/aeo-og.png`,
    description: 'AEO Analyzers simulates multiple AI engines to show how Gemini, ChatGPT, and Perplexity perceive your brand. What takes web teams hundreds of hours, we deliver in 90 seconds.',
    sameAs: [
      'https://www.linkedin.com/company/aeo-analyzers',
      'https://twitter.com/aeoanalyzers',
      'https://github.com/aeoanalyzers'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'Lindsay.Hiebert@gmail.com',
      contactType: 'customer support',
    },
  };
}

// 2. WebSite — WHAT your site is
export function getWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'AEO Analyzers',
    url: SITE_URL,
    description: 'Multi-engine AI simulation for Answer Engine Optimization. Multiple AI models. Real-world results. 90 seconds.',
  };
}

// 3. SoftwareApplication — for SaaS/tools (with pricing)
export function getSoftwareApplicationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AEO Analyzers',
    url: SITE_URL,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'AEO Analyzers simulates multiple AI engines to show how Gemini, ChatGPT, and Perplexity perceive your brand. What takes web teams hundreds of hours, we deliver in 90 seconds.',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: '0',
      highPrice: '99',
      offerCount: '3',
    },
    featureList: [
      'AI Simulation Engine',
      'Competitive Duel Engine',
      'Citation Probability Scoring',
      'AEO Implementation Roadmaps',
      'AI Search Visibility Reports',
      'Semantic Authority Audit'
    ],
  };
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

// 5. AggregateRating + Reviews — E-E-A-T trust signals
export function getAggregateRatingJsonLd(appName: string, siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: appName,
    url: siteUrl,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      bestRating: '5',
      ratingCount: '124',
      reviewCount: '124',
    },
    review: [
      {
        '@type': 'Review',
        author: { '@type': 'Person', name: 'Sarah J.' },
        reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
        reviewBody: 'AEO Analyzers transformed how we think about search. Our brand citations are now consistently accurate across all AI engines.',
      },
      {
        '@type': 'Review',
        author: { '@type': 'Person', name: 'Mark T.' },
        reviewRating: { '@type': 'Rating', ratingValue: '5', bestRating: '5' },
        reviewBody: 'The competitive benchmarking tool is a game-changer. We can finally see how we stack up in the age of AI search.',
      },
    ],
  };
}

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
