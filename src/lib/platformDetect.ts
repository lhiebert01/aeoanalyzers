// Publishing-stack detection.
//
// The Implementation Roadmap ships CMS-specific instructions (WordPress plugin,
// Shopify theme.liquid, Wix custom code…). For an obviously custom-coded site
// (Next.js/React on Vercel) those tabs are noise — the real target is a code
// repo, not a CMS admin. This deterministic detector reads the page HTML and
// classifies the stack so the roadmap can lead with the RIGHT guidance.

export type Platform =
  | 'wordpress'
  | 'shopify'
  | 'wix'
  | 'squarespace'
  | 'hubspot'
  | 'webflow'
  | 'custom'
  | 'unknown';

export interface PlatformDetection {
  platform: Platform;
  /** True when the site is hand/framework-coded (paste into repo, not a CMS). */
  isCustomCoded: boolean;
  signals: string[];
}

// CMS fingerprints, checked in priority order. First match wins.
const CMS_PATTERNS: { platform: Exclude<Platform, 'custom' | 'unknown'>; rx: RegExp; label: string }[] = [
  { platform: 'wordpress', rx: /wp-content|wp-includes|wp-json|name=["']generator["'][^>]*WordPress/i, label: 'WordPress (wp-content / generator tag)' },
  { platform: 'shopify', rx: /cdn\.shopify\.com|myshopify\.com|Shopify\.theme|window\.Shopify/i, label: 'Shopify (cdn.shopify.com / Shopify.theme)' },
  { platform: 'wix', rx: /wixstatic\.com|static\.parastorage\.com|X-Wix|_wixCssStates/i, label: 'Wix (wixstatic / parastorage)' },
  { platform: 'squarespace', rx: /squarespace\.com|static1\.squarespace|Static\.SQUARESPACE_CONTEXT/i, label: 'Squarespace' },
  { platform: 'hubspot', rx: /hs-scripts\.com|hubspot\.com|hsforms|hubspotusercontent|hs-analytics/i, label: 'HubSpot' },
  { platform: 'webflow', rx: /\.webflow\.io|data-wf-(page|site)|assets\.website-files\.com/i, label: 'Webflow' },
];

// Custom-framework fingerprints (Next.js, React, Vite, etc.).
const CUSTOM_PATTERNS: { rx: RegExp; label: string }[] = [
  { rx: /__NEXT_DATA__|\/_next\//, label: 'Next.js (__NEXT_DATA__ / _next)' },
  { rx: /id=["']__next["']/i, label: 'Next.js root element' },
  { rx: /id=["']root["'][^>]*>|data-reactroot/i, label: 'React root element' },
  { rx: /\/assets\/index-[\w-]+\.js|type=["']module["'][^>]*\/assets\//i, label: 'Vite/bundled ES modules' },
  { rx: /data-astro-|astro-island/i, label: 'Astro' },
  { rx: /__NUXT__|\/_nuxt\//, label: 'Nuxt' },
];

/** Classify the publishing stack from raw page HTML. */
export function detectPlatform(html: string): PlatformDetection {
  const h = String(html || '');
  const signals: string[] = [];

  for (const { platform, rx, label } of CMS_PATTERNS) {
    if (rx.test(h)) {
      signals.push(label);
      return { platform, isCustomCoded: false, signals };
    }
  }

  const customSignals = CUSTOM_PATTERNS.filter(({ rx }) => rx.test(h)).map(({ label }) => label);
  if (customSignals.length > 0) {
    return { platform: 'custom', isCustomCoded: true, signals: customSignals };
  }

  return { platform: 'unknown', isCustomCoded: false, signals: [] };
}
