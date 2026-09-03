// WO-2/WO-5 — Truth Record: the client's canonical facts, derived from their own
// structured data (JSON-LD), llms.txt, and meta tags. This is ground truth: what
// answer engines SHOULD say. WO-2 (fidelity) diffs engine answers against it;
// WO-5 (drift) diffs the live site against an approved copy of it.
//
// Deterministic — parses the site's own first-party signals, never an LLM.

export interface TruthRecord {
  brandName: string | null;
  /** Canonical founder/creator name(s) — the fact answer engines most often get
   *  wrong (see the Jesper Nissen misattribution). */
  founders: string[];
  /** Controlled-profile URLs the entity has declared. */
  sameAs: string[];
  /** Free-form canonical facts { key, value } for the drill-down + drift diff. */
  facts: { key: string; value: string }[];
  /** WO-INTEGRITY-002 B5: what schema the page ALREADY serves, so the fix prescribes
   *  only the delta instead of a fresh graph. */
  hasOrganization?: boolean;
  /** The served Organization/WebSite node already carries a stable @id. */
  hasOrgId?: boolean;
  /** The served entity node already carries a disambiguatingDescription. */
  hasDisambiguation?: boolean;
}

/** Extract and parse every <script type="application/ld+json"> block, flattening
 *  any @graph. Malformed blocks are skipped. */
export function extractJsonLdNodes(html: string): any[] {
  const nodes: any[] = [];
  const rx = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(String(html || '')))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of arr) {
        if (item && Array.isArray(item['@graph'])) nodes.push(...item['@graph']);
        else if (item) nodes.push(item);
      }
    } catch {
      /* skip malformed JSON-LD */
    }
  }
  return nodes;
}

function metaContent(html: string, key: string): string | null {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const tag = String(html || '').match(new RegExp(`<meta[^>]+(?:name|property)=["']${esc}["'][^>]*>`, 'i'));
  if (!tag) return null;
  const c = tag[0].match(/content=["']([^"']*)["']/i);
  return c ? c[1].trim() : null;
}

const FOUNDER_TITLE = /founder|creator|co-?founder|owner|principal/i;

/** Build the truth record from a page's HTML plus its llms.txt (if any). */
export function extractTruthRecord(html: string, llmsTxt?: string | null): TruthRecord {
  const h = String(html || '');
  const nodes = extractJsonLdNodes(h);

  // --- Brand name ---
  const orgNode = nodes.find((n) => /Organization|SoftwareApplication|WebSite|LocalBusiness/i.test(String(n?.['@type'])));
  const brandName =
    metaContent(h, 'og:site_name') ||
    (orgNode?.name && String(orgNode.name)) ||
    (nodes.find((n) => n?.name)?.name && String(nodes.find((n) => n?.name).name)) ||
    (h.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.split(/[|–—·:]|\s-\s/)[0]?.trim() ?? null);

  // --- Founders (canonical) ---
  const founders = new Set<string>();
  for (const n of nodes) {
    const type = String(n?.['@type'] || '');
    if (/Person/i.test(type) && n?.name && FOUNDER_TITLE.test(String(n?.jobTitle || ''))) {
      founders.add(String(n.name).trim());
    }
  }
  // Organization.founder / .creator / .author references resolved by name.
  for (const n of nodes) {
    for (const key of ['founder', 'creator', 'author']) {
      const ref = n?.[key];
      const refs = Array.isArray(ref) ? ref : ref ? [ref] : [];
      for (const r of refs) {
        if (r?.name) founders.add(String(r.name).trim());
      }
    }
  }
  // llms.txt "Founder: Name" and author meta.
  const llmsFounder = String(llmsTxt || '').match(/^\s*founder[s]?\s*:\s*([^,\n(]+)/im);
  if (llmsFounder) founders.add(llmsFounder[1].trim());
  const authorMeta = metaContent(h, 'author');
  if (authorMeta) founders.add(authorMeta);

  // --- sameAs ---
  const sameAs = new Set<string>();
  for (const n of nodes) {
    const sa = n?.sameAs;
    const arr = Array.isArray(sa) ? sa : sa ? [sa] : [];
    for (const u of arr) if (typeof u === 'string') sameAs.add(u);
  }

  // --- Canonical facts (for drill-down + drift) ---
  const facts: { key: string; value: string }[] = [];
  if (brandName) facts.push({ key: 'name', value: brandName });
  for (const f of founders) facts.push({ key: 'founder', value: f });
  const desc = metaContent(h, 'description') || (orgNode?.description && String(orgNode.description));
  if (desc) facts.push({ key: 'description', value: String(desc) });

  // WO-INTEGRITY-002 B5: what the page already serves — the org node, its @id, and a
  // disambiguatingDescription — so the remediation prescribes only what's missing.
  const orgLike = nodes.find((n) => /Organization|SoftwareApplication|LocalBusiness/i.test(String(n?.['@type'])));
  const hasOrganization = !!orgLike;
  const hasOrgId = !!(orgLike && orgLike['@id']);
  const hasDisambiguation = nodes.some((n) => !!n?.disambiguatingDescription);

  return {
    brandName: brandName || null,
    founders: [...founders].filter(Boolean),
    sameAs: [...sameAs],
    facts,
    hasOrganization,
    hasOrgId,
    hasDisambiguation,
  };
}
