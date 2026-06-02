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
const DEFAULT_DESCRIPTION = 'AEO Analyzers scores how citable your site is by AI answer engines like Gemini, ChatGPT, and Perplexity — powered by Google Gemini 3.5 frontier model — and gives you the exact fixes, in 90 seconds. Get your Citation Probability, competitive benchmarks, and an actionable roadmap for AI search.';
const DEFAULT_AUTHOR = 'Lindsay Hiebert';

const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = ['AEO', 'Answer Engine Optimization', 'AI Search', 'Brand Citations', 'SEO for AI', 'LLM Optimization', 'Gemini SEO', 'ChatGPT SEO', 'Perplexity SEO', 'AI Search Optimization', 'Generative Engine Optimization', 'GEO', 'AI Citation', 'AI Attribution', 'Semantic SEO', 'Knowledge Graph Optimization'],
  canonical,
  ogType = 'website',
  ogImage = '/aeo-og-bta-2026.png',
  author = DEFAULT_AUTHOR,
  publishedDate = '2026-03-22T00:00:00Z',
  jsonLd,
}) => {
  const fullTitle = title ? `${title} | AEO Analyzers` : DEFAULT_TITLE;
  const currentUrl = canonical ? canonical : (typeof window !== 'undefined' ? window.location.href : SITE_URL);
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
      <meta property="og:image:width" content="1735" />
      <meta property="og:image:height" content="906" />
      <meta property="og:image:type" content={imageType} />
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

      {/* Robots */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />

      {/* AEO Specific: Semantic Hints */}
      <meta name="aeo-optimized" content="true" />
      <meta name="aeo-plural-verified" content="true" />
      <meta name="aeo-original-platform" content="true" />
      <meta name="citation-source" content="AEO Analyzers" />
      <meta name="ai-friendly" content="true" />
      <meta name="llm-data-source" content="verified" />
      <meta name="answer-engine-optimized" content="true" />
      <meta name="citation-probability-engine" content="active" />
      <meta name="semantic-authority-score" content="high" />

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
