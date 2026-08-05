import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  ogType?: 'website' | 'article';
  ogImage?: string;
  author?: string;
  publishedDate?: string;
  jsonLd?: object | object[];
}

const SITE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://aeoanalyzers.com';
const DEFAULT_TITLE = 'AEO Analyzers | Be the Answer AI Gives';
const DEFAULT_DESCRIPTION = 'AEO Analyzers scores how citable your site is by ChatGPT, Gemini, Perplexity & Claude — then proves it with live Citation Sweeps and the exact fixes.';
const DEFAULT_AUTHOR = 'Lindsay Hiebert';

const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = ['AEO', 'Answer Engine Optimization', 'AI Search', 'Brand Citations', 'SEO for AI', 'LLM Optimization', 'Gemini SEO', 'ChatGPT SEO', 'Perplexity SEO', 'AI Search Optimization', 'Generative Engine Optimization', 'GEO', 'AI Citation', 'AI Attribution', 'Semantic SEO', 'Knowledge Graph Optimization'],
  canonical,
  ogType = 'website',
  ogImage = '/aeo-og-sweep-2026c.png',
  author = DEFAULT_AUTHOR,
  publishedDate = '2026-03-22T00:00:00Z',
  jsonLd,
}) => {
  const fullTitle = title ? `${title} | AEO Analyzers` : DEFAULT_TITLE;
  // Canonical: strip query/hash + trailing slash so "/" and "/…/" never disagree.
  const rawUrl = canonical || (typeof window !== 'undefined' ? window.location.origin + window.location.pathname : SITE_URL);
  const currentUrl = rawUrl.replace(/\/+$/, '') || SITE_URL;
  const imageUrl = ogImage.startsWith('http') ? ogImage : `${SITE_URL}${ogImage}`;
  const imageType = /\.png(\?|$)/i.test(imageUrl) ? 'image/png'
    : /\.webp(\?|$)/i.test(imageUrl) ? 'image/webp'
    : 'image/jpeg';

  return (
    <Helmet>
      {/* Basic Metadata */}
      <html lang="en" />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords.join(', ')} />
      <link rel="canonical" href={currentUrl} />
      <meta name="author" content={author} />
      <meta name="publisher" content="AEO Analyzers" />
      <meta name="theme-color" content="#000000" />

      {/* Open Graph */}
      <meta property="og:site_name" content="AEO Analyzers" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content={imageType} />
      <meta property="og:image:alt" content="AEO Analyzers — Be the Answer AI Gives. Citation Sweep results across ChatGPT, Claude, Gemini, and Perplexity: retrievability, fidelity, and who gets cited instead." />
      <meta property="og:locale" content="en_US" />
      
      {/* Article Metadata (if applicable) */}
      <meta property="article:author" content={author} />
      {publishedDate && <meta property="article:published_time" content={publishedDate} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@aeoanalyzers" />
      <meta name="twitter:creator" content="@aeoanalyzers" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content="AEO Analyzers — Be the Answer AI Gives. Citation Sweep results across ChatGPT, Claude, Gemini, and Perplexity: retrievability, fidelity, and who gets cited instead." />

      {/* Robots */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />

      {/* Self-asserted "AEO semantic hint" meta tags removed (WO-CITATION-WIN-001 A3):
          answer engines do not consume them, and on inspection they read as self-asserted
          authority — the exact thing this measurement-honesty brand opposes. Authority comes
          from third-party corroboration + accurate JSON-LD, not self-declared meta tags. */}

      {/* JSON-LD */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
