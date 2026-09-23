// Separates a crawler fetching a PAGE from a scanner fetching a SECRET.
//
// WHY THIS EXISTS. bot_hits classifies a request by its User-Agent string, and anyone can
// send "GPTBot/1.3". Vulnerability scanners do, constantly. Pulled on 23 Sep 2026: of
// 1,061 hits logged on aeoanalyzers.com since 22 July, 801 were requests for /.git/HEAD,
// /.aws/credentials, /graphql, /actuator/env, /id_rsa and the like — 75%. The published
// "at least 265 crawler visits in ten days" recounted to 36 fetches of a page that exists.
//
// A blocklist lost twice before this landed (it missed /id_rsa, /_profiler, /.kube/config,
// /aws-credentials on the second pass), so the test pins every observed probe path as a
// fixture and every sitemap route as a page. Add to the fixtures, never trust the regex.
//
// This is a READ-TIME classification. The raw log is untouched — it is the evidence.

const PROBE = [
  /(^|\/)\.[A-Za-z]/,                       // any dot-segment: /.git, /.aws, /.env, /.kube, /.DS_Store
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)/i,      // private keys
  /credential|secret|\.pem$|\.key$|\.p12$/i,
  /(^|\/)(graphql|actuator|_profiler|_ignition|@fs|phpinfo|xmlrpc|cgi-bin|server-status|telescope|debug|backend|wp-[a-z]+|vendor|storage\/logs)(\/|$|\.)/i,
  /\/(config|settings)\.(json|php|ya?ml|xml|ini)$/i,
  /\/proc\/self\//,
];

/** True when the path is a scanner probe rather than a page fetch. */
export function isProbePath(path: string): boolean {
  const p = (path || '').split('?')[0];
  return PROBE.some(re => re.test(p));
}
