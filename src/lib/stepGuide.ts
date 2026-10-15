// WO-AEO-STEP-BY-STEP-GUIDES-014 — the personalized step-by-step guide, deterministic half.
//
// One model, built only from stored data: the sweep's site snapshot (TruthRecord.site), the
// domain's latest AEO Score, page one's two figures, Source coverage, the directory catalog and the
// customer's Record. Any field without a stored source prints "Fill in:" and is listed in
// `fillIns`; nothing is guessed. Renderers: guideHtml (PDF via print, public pages) and
// services/guideDocx.ts (Word). No model call, so a re-download costs nothing.
//
// Measure. Act. Record. The guide promises steps, never outcomes.
import catalogJson from '../data/directories-catalog.json';
import type { SiteFacts } from './truthRecord';
import type { SourceCoverage } from './sourceCoverage';
import { coverageHeadline } from './sourceCoverage';
import { ownerForChecklist, type OwnerTag } from './ownerTags';
import { SPLIT, type CoverSplit } from './reportCover';
import type { RecordEntry } from './theRecord';

export type BusinessType = 'software' | 'local' | 'professional_services' | 'ecommerce';
export const BUSINESS_TYPE_LABEL: Record<BusinessType, string> = {
  software: 'Software or online service', local: 'Local business', professional_services: 'Professional services', ecommerce: 'Online store',
};

export interface CatalogEntry {
  id: string; name: string; types: string[]; start_url: string; account: string; reviewed_before_live: boolean;
  minutes: number; what_you_need: string[]; owner: OwnerTag; note?: string; hosts: string[];
  last_verified: string; verified: boolean; check_result: string;
}
export interface Catalog { verified_at: string; entries: CatalogEntry[] }
export const CATALOG: Catalog = catalogJson as unknown as Catalog;

export const FILL = 'Fill in:';
export const NO_GUARANTEE = 'No method can guarantee that an engine will recommend you. These are the steps that put you where engines look, and your Record shows what was measured afterward.';
export const PRICE_RULE = 'Keep prices only on your pricing page. Engines repeat old prices for months; a price in one place is a price you can keep correct.';
export const DRAFT_LABEL = 'Draft from your own website. Check every fact before you paste it.';
export const GUIDE_GATED = 'Your personalized guide is included on Pro and Business.';
export const THREE_RULES = [
  'One description everywhere, word for word.',
  'Describe yourself plainly and name no other company.',
  'Reviews only from real customers, never in exchange for anything.',
];

export interface GuideScore {
  score: number;
  at?: string | null;
  checklist?: { category: string; action: string; priority: string }[];
  verifiedSchema?: string | null;
  metaSuggested?: string | null;
  platform?: string | null;
}
export interface GuideInput {
  domain: string;
  date: Date | string;
  /** Public, non-personalized version: placeholders instead of a customer's facts. */
  generic?: boolean;
  brand?: string | null;
  site?: SiteFacts | null;
  score?: GuideScore | null;
  split?: CoverSplit | null;
  coverage?: SourceCoverage | null;
  category?: string | null;
  /** The customer's confirmed choice, used when structured data does not settle it. */
  businessType?: BusinessType | null;
  /** The Record's entries for this domain; null when the plan has no Record. */
  record?: RecordEntry[] | null;
  catalog?: Catalog;
}

export interface GuideStep {
  key: string;
  owner: OwnerTag;
  title: string;
  /** For the tracking table: the site or page the step happens on. */
  where: string;
  minutes: number | null;
  whereToStart?: string;
  steps: string[];
  copyTitle?: string;
  copy?: string[];
  code?: string;
  doneWhen: string;
  notes?: string[];
}
export interface GuidePart {
  id: 'site' | 'listings' | 'wikidata' | 'pages';
  title: string;
  owner: OwnerTag;
  intro: string[];
  boxes: { title: string; lines: string[]; tone: 'copy' | 'rules' }[];
  tables: { title: string; head: string[]; rows: string[][] }[];
  steps: GuideStep[];
  outro?: string[];
}
export interface TrackingRow { step: string; owner: OwnerTag; where: string; address: string; date: string; inRecord: string }
export interface Guide {
  title: string;
  subtitle: string;
  fileStem: string;
  startHere: string[];
  order: string[];
  parts: GuidePart[];
  tracking: TrackingRow[];
  /** Fields that printed "Fill in:", for the report back and for tests. */
  fillIns: string[];
  businessType: BusinessType | null;
  needsBusinessType: boolean;
}

// ── helpers ──────────────────────────────────────────────────────────────────────────────
const ORD = (d: number) => (d % 100 >= 11 && d % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][d % 10] || 'th');
/** US date style with an ordinal: "October 16th, 2026". */
export function usDate(at: Date | string, withYear = true): string {
  const d = new Date(typeof at === 'string' && /^\d{4}-\d\d-\d\d$/.test(at) ? `${at}T12:00:00Z` : at);
  const m = d.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' });
  return `${m} ${d.getUTCDate()}${ORD(d.getUTCDate())}${withYear ? `, ${d.getUTCFullYear()}` : ''}`;
}
const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const sentences = (t: string) => String(t || '').replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/).filter(Boolean);
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

/** Business type from the page's own structured data; null when it does not settle it. */
export function businessTypeFrom(ldTypes: string[] | undefined | null): BusinessType | null {
  const t = (ldTypes || []).join(' ');
  if (/SoftwareApplication|WebApplication|MobileApplication/i.test(t)) return 'software';
  if (/OnlineStore|\bStore\b|ProductGroup|\bProduct\b/i.test(t)) return 'ecommerce';
  if (/ProfessionalService|LegalService|Attorney|AccountingService|FinancialService|InsuranceAgency|Notary|EmploymentAgency/i.test(t)) return 'professional_services';
  if (/LocalBusiness|Restaurant|Dentist|Physician|MedicalClinic|Plumber|Electrician|HomeAndConstructionBusiness|AutomotiveBusiness|HealthAndBeautyBusiness|FoodEstablishment|LodgingBusiness|SportsActivityLocation/i.test(t)) return 'local';
  return null;
}

/** Short (≤120 characters) and Long (~60 words) drafts from the site's own description. */
export function descriptionDrafts(site: SiteFacts | null | undefined): { short: string | null; long: string | null } {
  const sources = [site?.metaDescription, site?.ldDescription].filter((x): x is string => !!x && x.trim().length > 0);
  if (!sources.length) return { short: null, long: null };
  const first = sentences(sources[0])[0] || sources[0];
  let short = first.trim();
  if (short.length > 120) {
    const cut = short.slice(0, 119);
    short = `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 60)).replace(/[,;:\s]+$/, '')}…`;
  }
  const seen = new Set<string>(); const out: string[] = [];
  for (const s of sources.flatMap(sentences)) {
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    if (out.length && words([...out, s].join(' ')) > 70) break;
    seen.add(k); out.push(s);
  }
  return { short, long: out.join(' ') || null };
}

/** Where a setting lives on a detected platform. Generic when the platform is unknown. */
const PLATFORM_WHERE: Record<string, { head: string; meta: string; robots: string }> = {
  wordpress: { head: 'In WordPress: your theme or SEO settings, in the section that adds code to the page head.', meta: 'In WordPress: the page editor\'s SEO settings for that page.', robots: 'In WordPress: Settings → Reading, and your SEO settings for robots.txt.' },
  webflow: { head: 'In Webflow: Page settings → Custom code → Inside <head> tag.', meta: 'In Webflow: Page settings → SEO settings → Meta description.', robots: 'In Webflow: Site settings → SEO → robots.txt.' },
  shopify: { head: 'In Shopify: Online Store → Themes → Edit code → theme.liquid, inside <head>.', meta: 'In Shopify: Online Store → Preferences (home page), or the page\'s "Search engine listing".', robots: 'In Shopify: Online Store → Themes → Edit code → robots.txt.liquid.' },
  wix: { head: 'In Wix: Settings → Custom code → add to the head of all pages.', meta: 'In Wix: the page\'s SEO basics (Page settings → SEO basics).', robots: 'In Wix: Marketing & SEO → SEO tools → robots.txt editor.' },
  squarespace: { head: 'In Squarespace: Settings → Advanced → Code injection → Header.', meta: 'In Squarespace: Pages → the page\'s settings → SEO.', robots: 'Squarespace manages robots.txt for you; check Settings → SEO.' },
};
export function platformFrom(generator: string | null | undefined, detected?: string | null): string | null {
  const g = `${generator || ''} ${detected || ''}`.toLowerCase();
  return Object.keys(PLATFORM_WHERE).find((p) => g.includes(p)) ?? null;
}

const PRIORITY = (p: string) => (/high/i.test(p) ? 0 : /medium/i.test(p) ? 1 : 2);

// ── the model ────────────────────────────────────────────────────────────────────────────
export function buildGuide(inp: GuideInput): Guide {
  const cat = inp.catalog ?? CATALOG;
  const g = !!inp.generic;
  const fillIns: string[] = [];
  const fill = (field: string, hint = '') => { fillIns.push(field); return `${FILL} ${hint || field} ____________________`; };
  const site = inp.site ?? null;
  const website = g ? 'your website address' : `https://${inp.domain}`;
  const company = g ? 'Your company' : site?.orgName || inp.brand || fill('company name');
  const product = g ? 'Your product' : site?.appName || inp.brand || site?.orgName || fill('product name');
  const drafts = g ? { short: null, long: null } : descriptionDrafts(site);
  const short = g ? 'Your one-line description (120 characters or fewer).' : drafts.short ?? fill('Short text', 'Short text (120 characters or fewer)');
  const long = g ? 'Your longer description, about 60 words: what it is, who it is for, where you are based.' : drafts.long ?? fill('Long text', 'Long text (about 60 words)');
  const category = g ? 'Your category, in the words your buyers use' : inp.category?.trim() || fill('category');
  const typeFromLd = businessTypeFrom(site?.ldTypes);
  const businessType: BusinessType | null = g ? null : typeFromLd ?? inp.businessType ?? null;
  const needsBusinessType = !g && !typeFromLd && !inp.businessType;
  if (!g && !businessType) fillIns.push('business type');
  const record = inp.record ?? null;
  const done = (key: string) => record?.filter((e) => e.action_key === key).sort((a, b) => a.done_at.localeCompare(b.done_at)).slice(-1)[0] ?? null;
  const place = [site?.locality, site?.region, site?.country].filter(Boolean).join(', ');

  // Start here
  const startHere: string[] = [];
  if (!g) {
    const sp = inp.split;
    startHere.push(`**${SPLIT.ready}:** ${sp && sp.readiness.score !== null ? `${sp.readiness.score}/100, your AEO Score${inp.score?.at ? `, ${usDate(inp.score.at)}` : ''}. ${SPLIT.readySub.replace('AEO Score · ', '')}` : `${SPLIT.notYet}. Run an AEO Score: https://aeoanalyzers.com`}`);
    startHere.push(`**${SPLIT.rec}:** ${sp && sp.recommended.pct !== null ? `${sp.recommended.pct}%, ${sp.recommended.line}.` : `${SPLIT.notYet}. Run a Citation Sweep: https://aeoanalyzers.com/sweeps`}`);
    startHere.push(`**Source coverage:** ${inp.coverage ? coverageHeadline(inp.coverage).headline : `${FILL} run "Check source coverage" on your sweep, then download this guide again.`}`);
  } else {
    startHere.push('Your AEO Score report and your Citation Sweep report give you two numbers: **Ready to be cited** (what your site controls) and **Recommended by engines** (how often engines name you when buyers ask). The personalized guide prints both here.');
  }
  startHere.push('**Structured data** is a hidden label on your page that tells machines who you are. **A listing** is your own page on a directory. **A knowledge-base entry** is a public record of your company that engines read, such as Wikidata.');
  const order = [
    'Part 1, your website (Site): usually done once, by your web team.',
    'Part 2, your listings (Outreach): one description, pasted the same way on each site.',
    'Part 3, your knowledge-base entry (Outreach): after at least one listing is live.',
    'Part 4, the pages engines read (Outreach): the pages cited for your category that do not name you yet.',
  ];

  // Part 1 — Site
  const plat = platformFrom(site?.generator, inp.score?.platform);
  const where = (kind: 'head' | 'meta' | 'robots' | 'verify' | 'page') =>
    kind === 'verify' ? 'Bing Webmaster Tools (https://www.bing.com/webmasters) and Google Search Console (https://search.google.com/search-console).'
    : kind === 'page' ? (plat ? `In ${plat[0].toUpperCase()}${plat.slice(1)}: the page editor for the page it names.` : 'In your content system: the page it names, in the page editor.')
    : plat ? PLATFORM_WHERE[plat][kind] : kind === 'head' ? 'In your site\'s code or content system: the <head> section of the page.' : kind === 'meta' ? 'In your content system: the page\'s SEO or meta settings.' : 'At your site root: /robots.txt.';
  const siteSteps: GuideStep[] = [];
  if (g) {
    siteSteps.push({ key: 'guide:site:example', owner: 'Site', title: 'Apply the fixes from your AEO Score report', where: 'Your website', minutes: null, steps: ['Open your AEO Score report and work through the Site actions, highest priority first.', 'Each fix shows what to change, where it goes and the text or code to paste.'], doneWhen: 'Each change is live on your site.' });
  } else if (inp.score?.checklist?.length) {
    const items = inp.score.checklist.filter((c) => ownerForChecklist(c.category, c.action) === 'Site').sort((a, b) => PRIORITY(a.priority) - PRIORITY(b.priority));
    items.forEach((c, i) => {
      const a = c.action.toLowerCase();
      const isSchema = /schema|json-ld|structured data/.test(a);
      const isMeta = /meta description/.test(a);
      const isRobots = /robots\.txt|user-agent|crawler access|disallow/.test(a);
      const isVerify = /webmaster tools|search console|verify (the )?(site|property|ownership)/.test(a);
      siteSteps.push({
        key: `guide:site:${slug(c.action)}`, owner: 'Site', title: c.action, where: inp.domain,
        minutes: isSchema ? 20 : isMeta || isRobots || isVerify ? 10 : 15,
        whereToStart: where(isVerify ? 'verify' : isSchema ? 'head' : isMeta ? 'meta' : isRobots ? 'robots' : 'page'),
        steps: [`What to change: ${c.action}`, `Priority: ${c.priority}. Area: ${c.category}.`],
        ...(isSchema && inp.score?.verifiedSchema ? { code: inp.score.verifiedSchema, copyTitle: 'Paste-ready, from your AEO Score (detected values only)' } : {}),
        ...(isMeta && inp.score?.metaSuggested ? { copyTitle: 'Suggested meta description, from your AEO Score', copy: [inp.score.metaSuggested] } : {}),
        doneWhen: isSchema ? `The block is in the page source of https://${inp.domain} and a structured-data validator reads it without errors.` : `The change is live on https://${inp.domain}.`,
      });
      void i;
    });
    if (!items.length) siteSteps.push({ key: 'guide:site:none', owner: 'Site', title: 'No Site actions in your latest AEO Score', where: inp.domain, minutes: null, steps: ['Your latest AEO Score lists no web-team fixes.'], doneWhen: 'Nothing to do here until your next AEO Score.' });
  } else {
    fillIns.push('site fixes');
    siteSteps.push({ key: 'guide:site:run-score', owner: 'Site', title: 'Run an AEO Score', where: inp.domain, minutes: 5, whereToStart: 'https://aeoanalyzers.com', steps: [`${FILL} your site fixes. Run an AEO Score on ${inp.domain}, then download this guide again; Part 1 fills in from it.`], doneWhen: 'Your AEO Score report is saved.' });
  }

  // Part 2 — listings
  const cited = new Map<string, number>();
  for (const r of inp.coverage?.rows || []) for (const e of cat.entries) if (e.hosts.some((h) => r.host === h || r.host.endsWith(`.${h}`))) cited.set(e.id, Math.max(cited.get(e.id) || 0, r.timesCited));
  const pool = cat.entries.filter((e) => e.id !== 'wikidata' && (g || (businessType ? e.types.includes('all') || e.types.includes(businessType) : e.types.includes('all'))));
  const listings = [...pool].sort((a, b) => (cited.get(b.id) || 0) - (cited.get(a.id) || 0));
  const listingSteps: GuideStep[] = listings.map((e) => {
    const n = cited.get(e.id);
    const steps = [
      `Have ready: ${e.what_you_need.join(', ')}.`,
      `Create a free account (${e.account}) and sign in.`,
      `Search ${e.name} for ${g ? 'your company and product' : `${product} and ${company}`} first, so you do not create a second listing.`,
      `Add the listing. Name: ${product}. Website: ${website}.`,
      'Paste the Short and Long text from the box at the start of Part 2, word for word.',
      ...(e.types.includes('software') || e.types.includes('ecommerce') ? ['Pricing: link to your pricing page. Do not type price figures.'] : []),
      ...(e.types.includes('local') ? ['Use the same business name, address and phone number as on your website.'] : []),
    ];
    return {
      key: `guide:listing:${e.id}`, owner: 'Outreach', title: `${e.name}${n ? ` — the engines read this for your category: cited ${n} times` : ''}`, where: e.name, minutes: e.minutes,
      whereToStart: `${e.start_url}${e.verified ? '' : ` (we could not check this page automatically on ${usDate(e.last_verified)}; if it has moved, start from the site's home page)`}`,
      steps, notes: [...(e.note ? [e.note] : []), ...(g ? [`Suited to: ${e.types.map((t) => (t === 'all' ? 'every business' : BUSINESS_TYPE_LABEL[t as BusinessType] || t)).join(', ')}.`] : [])],
      doneWhen: e.reviewed_before_live ? `The listing has its own public address. ${e.name} reviews new listings before they appear, so this can take a few days.` : 'The listing has its own public address.',
    };
  });

  // Part 3 — Wikidata
  // A separate product item only for software (and the generic page); a local business, a firm
  // or a store is one item: the company.
  const withProduct = g || businessType === 'software';
  const companyStatements: string[][] = [
    ['instance of', g ? 'business (or the closest type)' : 'business', website],
    ['legal form', g ? 'your legal form, e.g. limited liability company' : fill('legal form', 'legal form (e.g. limited liability company)'), website],
    ['country', g ? 'your country' : site?.country || fill('country'), website],
    ['headquarters location', g ? 'your city' : site?.locality || fill('headquarters city'), website],
    ['official website', website, website],
    ...(withProduct ? [['product or material produced', g ? 'your product\'s item' : `${product} (the item you create in step 5)`, website]] : []),
  ];
  const productStatements: string[][] = !withProduct ? [] : [
    ['instance of', g ? 'web application, software, or the closest type' : 'web application (or software)', website],
    ['developer', g ? 'your company\'s item' : `${company} (the company item)`, website],
    ['country of origin', g ? 'your country' : site?.country || 'same as the company', website],
    ['official website', website, website],
  ];
  const wikiStep: GuideStep = {
    key: 'guide:wikidata', owner: 'Outreach', title: withProduct ? 'Create your Wikidata entries' : 'Create your Wikidata entry', where: 'Wikidata', minutes: 30,
    whereToStart: 'https://www.wikidata.org (create a free account with "Create account", top right)',
    steps: [
      'Create a free Wikidata account and sign in.',
      `Search Wikidata for ${g ? 'your company and your product' : `"${company}" and "${product}"`} first. If an item already exists, edit it instead of creating a second one.`,
      `Open https://www.wikidata.org/wiki/Special:NewItem. Label: ${company}. Description: short and neutral, such as "${g ? 'software company in Your City, Country' : `company in ${place || 'your city, your country'}`}". Aliases: other spellings people use.`,
      'Add each statement in the company table: click "+ add statement", type the property, pick it from the list, type the value, pick it, then "+ add reference", choose "reference URL" and paste the source. Publish.',
      ...(withProduct ? [`Create the product item the same way (Label: ${product}) with the product table, then link the two: "product or material produced" on the company, "developer" on the product.`] : []),
      'When each directory listing goes live, add it to the item as a "described at URL" statement with itself as the reference.',
    ],
    doneWhen: withProduct ? 'Both items have their own Q-number (wikidata.org/wiki/Q…), and every statement has a reference.' : 'The item has its own Q-number (wikidata.org/wiki/Q…), and every statement has a reference.',
    notes: [
      'Wikidata keeps entries only when independent sources back them up, so list on directories first (Part 2) and add each live listing as a reference afterward.',
      'Descriptions must be short and neutral, never promotional.',
      'Wikipedia is different: it does not accept articles a company writes about itself.',
    ],
  };

  // Part 4 — pages engines read that do not name you yet
  const noRows = (inp.coverage?.rows || []).filter((r) => r.verdict === 'no').sort((a, b) => b.timesCited - a.timesCited);
  const pageSteps: GuideStep[] = g
    ? [{ key: 'guide:page:example', owner: 'Outreach', title: 'Introduce yourself to the writer of a page engines read', where: 'The page\'s publisher', minutes: 15,
        steps: ['Your Source coverage table lists the pages engines read for your category, most-cited first, and whether each names you.', 'For each page that does not name you yet, write a short new email to its author or publisher, using the draft below.'],
        copyTitle: 'Email draft', copy: emailDraft('Your company', 'your website', 'Your one-line description.', 'the page title', 'the page address', null), doneWhen: 'The email is sent. Mark it in your Record, and again if the page is updated.' }]
    : noRows.map((r) => ({
        key: `guide:page:${slug(r.url)}`, owner: 'Outreach' as const, title: r.title || r.host, where: r.host, minutes: 15,
        steps: [`Page: ${r.url}`, `Cited in ${r.timesCited} of your category answers.`, `Author or publisher: ${r.byline || fill(`author of ${r.host}`, 'author or publisher (the page does not show one)')}`],
        copyTitle: 'Email draft (adapt before sending)', copy: emailDraft(company, inp.domain, short, r.title || r.host, r.url, r.byline || null),
        doneWhen: 'The email is sent.',
      }));
  if (!g && !inp.coverage) { fillIns.push('pages engines read'); pageSteps.push({ key: 'guide:page:run-coverage', owner: 'Outreach', title: 'Check source coverage', where: 'Your Citation Sweep', minutes: 2, steps: [`${FILL} the pages engines read. Open your saved sweep, choose "Check source coverage", then download this guide again.`], doneWhen: 'Your sweep shows a Source coverage table.' }); }

  const copyBox = [
    `Name: ${product}`, `Company: ${company}`, `Website: ${website}`, `Short: ${short}`, `Long: ${long}`, `Category: ${category}`,
    `Pricing: link to ${g ? 'your pricing page' : `your pricing page on ${inp.domain}`}. Never type price figures.`,
  ];
  const parts: GuidePart[] = [
    { id: 'site', title: 'Part 1, Your website', owner: 'Site', intro: ['Hand this part to your web team. Highest impact first.', plat ? `Your site runs on ${plat[0].toUpperCase()}${plat.slice(1)}, so each step says where the setting lives there.` : 'Each step is written for any website; your web team will know where each setting lives.'], boxes: [{ title: 'One rule for every page', lines: [PRICE_RULE], tone: 'rules' }], tables: [], steps: siteSteps },
    { id: 'listings', title: 'Part 2, Your listings', owner: 'Outreach', intro: ['Hand Parts 2 to 4 to whoever handles PR and partnerships. Directories the engines already read for your category come first.', `Sign-up pages change; checked ${usDate(cat.verified_at)}.`, ...(needsBusinessType ? [`${FILL} your business type. Choose it in the app before downloading so this list matches your business.`] : [])], boxes: [{ title: g ? 'Copy this text (fill in your own)' : `Copy this text. ${DRAFT_LABEL}`, lines: copyBox, tone: 'copy' }, { title: 'Three rules on every site', lines: THREE_RULES, tone: 'rules' }], tables: [], steps: listingSteps },
    { id: 'wikidata', title: 'Part 3, Your knowledge-base entry', owner: 'Outreach', intro: ['Wikidata is a free, public database of facts that answer engines and search engines read. Your entry states who you are, with a source for each fact.'], boxes: [], tables: [{ title: `Company item: ${company}`, head: ['Property', 'Value', 'Reference URL'], rows: companyStatements }, ...(withProduct ? [{ title: `Product item: ${product}`, head: ['Property', 'Value', 'Reference URL'], rows: productStatements }] : [])], steps: [wikiStep] },
    { id: 'pages', title: 'Part 4, The pages engines read', owner: 'Outreach', intro: g ? ['The pages engines cite when buyers ask about your category. A short, useful note to the writer is the step; never ask to be ranked.'] : [noRows.length ? `The pages cited for your category questions that do not name you yet, most-cited first (fetched ${usDate(inp.coverage!.fetchedAt)}). Each email is new, short and offers something the writer can use. Never ask to be ranked.` : inp.coverage ? 'Every page we could read for your category already names you, or could not be read.' : ''].filter(Boolean), boxes: [], tables: [], steps: pageSteps, outro: ['Mark each one in your Record when you send it, and again if the page is updated.'] },
  ];

  const tracking: TrackingRow[] = parts.flatMap((p) => p.steps).filter((s) => !/:none$|:example$/.test(s.key)).map((s) => {
    const d = done(s.key);
    return { step: s.title, owner: s.owner, where: s.where, address: d?.link || '', date: d ? usDate(d.done_at, false) : '', inRecord: record === null ? 'Record on Pro and Business' : d ? 'Yes' : 'No' };
  });

  const date = usDate(inp.date);
  return {
    title: g ? 'Step-by-step guide' : `Your step-by-step guide: ${inp.domain}`,
    subtitle: g ? `AEO Analyzers · Measure. Act. Record. · Checked ${date}` : `${company} · ${date} · Prepared by AEO Analyzers`,
    fileStem: `Step-by-step-guide-${g ? 'generic' : inp.domain}-${new Date(inp.date).toISOString().slice(0, 10)}`,
    startHere: [...startHere, NO_GUARANTEE],
    order, parts, tracking, fillIns: [...new Set(fillIns)], businessType, needsBusinessType,
  };
}

/** A new email, two short paragraphs, offering something the writer can use. Never a ranking request. */
export function emailDraft(company: string, domain: string, short: string, title: string, url: string, byline: string | null): string[] {
  return [
    `Subject: A note on "${title}"`,
    `Hello ${byline || 'there'},`,
    `I read "${title}" (${url}). I work at ${company} (${domain}). ${short}`,
    `If it is useful for a future update, I can share ${FILL} one fact or finding you can stand behind, with its source. No need to reply if it is not a fit.`,
    `${FILL} your name, title and email`,
  ];
}

/** Every guide step as a Record action: the same text and owner tag. */
export function guideRecordActions(g: Guide): { key: string; title: string; owner: OwnerTag }[] {
  return g.parts.flatMap((p) => p.steps).filter((s) => !/:none$|:example$/.test(s.key)).map((s) => ({ key: s.key, title: s.title, owner: s.owner }));
}

// ── HTML (PDF via print, and the public pages) ───────────────────────────────────────────
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(https:\/\/[^\s)<]+[^\s).,<])/g, '<a href="$1">$1</a>');

export const GUIDE_CSS = `
.guide{font-family:Calibri,Carlito,"Segoe UI",Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:760px;overflow-wrap:anywhere}
.guide h1{font-size:26px;margin:0 0 4px}.guide .sub{color:#334155;margin:0 0 18px}
.guide h2{font-size:20px;margin:28px 0 8px;padding-bottom:4px;border-bottom:3px solid #1f7a4d}
.guide h3{font-size:16px;margin:20px 0 6px}
.guide .owner{display:inline-block;font-size:12px;font-weight:700;border:1px solid #1f7a4d;color:#14532d;border-radius:999px;padding:1px 8px;margin-left:6px;vertical-align:middle}
.guide .box{background:#eef7f1;border:1px solid #b7dcc5;border-radius:8px;padding:10px 14px;margin:10px 0}
.guide .box.rules{background:#f8fafc;border-color:#cbd5e1}
.guide .box p{margin:2px 0}.guide .box .bt{font-weight:700;margin-bottom:4px}
.guide pre{background:#eef7f1;border:1px solid #b7dcc5;border-radius:8px;padding:10px;white-space:pre-wrap;word-break:break-word;font-size:12px}
.guide .where,.guide .done{margin:6px 0}.guide .done{font-weight:600}
.guide table{border-collapse:collapse;width:100%;font-size:13px;margin:8px 0}
.guide th{background:#0b1f17;color:#fff;text-align:left;padding:6px}.guide td{border:1px solid #cbd5e1;padding:6px;vertical-align:top}
.guide .note{color:#1e293b;font-style:italic}
@media (max-width:640px){.guide table{display:block;overflow-x:auto;max-width:100%}}
@media print{.guide a{color:#0f172a}.guide h2{break-after:avoid}.guide table,.guide .box{break-inside:avoid}}
`;

export function guideBodyHtml(g: Guide, opts: { headings?: boolean } = {}): string {
  const o: string[] = [];
  if (opts.headings !== false) o.push(`<h1>${esc(g.title)}</h1><p class="sub">${esc(g.subtitle)}</p>`);
  o.push('<h2>Start here</h2>');
  for (const l of g.startHere) o.push(`<p>${inline(l)}</p>`);
  o.push('<p><strong>The order of work</strong></p><ol>' + g.order.map((l) => `<li>${inline(l)}</li>`).join('') + '</ol>');
  for (const p of g.parts) {
    o.push(`<h2>${esc(p.title)} <span class="owner">${p.owner}</span></h2>`);
    for (const l of p.intro) o.push(`<p>${inline(l)}</p>`);
    for (const b of p.boxes) o.push(`<div class="box${b.tone === 'rules' ? ' rules' : ''}"><p class="bt">${esc(b.title)}</p>${b.tone === 'rules' ? '<ol>' + b.lines.map((l) => `<li>${inline(l)}</li>`).join('') + '</ol>' : b.lines.map((l) => `<p>${inline(l)}</p>`).join('')}</div>`);
    for (const t of p.tables) o.push(`<h3>${esc(t.title)}</h3><table><thead><tr>${t.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
    p.steps.forEach((s, i) => {
      o.push(`<h3>${i + 1}. ${esc(s.title)}${s.minutes ? ` (about ${s.minutes} minutes)` : ''}</h3>`);
      if (s.whereToStart) o.push(`<p class="where"><strong>Where to start:</strong> ${inline(s.whereToStart)}</p>`);
      o.push('<ol>' + s.steps.map((l) => `<li>${inline(l)}</li>`).join('') + '</ol>');
      if (s.copy) o.push(`<div class="box"><p class="bt">${esc(s.copyTitle || 'Copy this text')}</p>${s.copy.map((l) => `<p>${inline(l)}</p>`).join('')}</div>`);
      if (s.code) o.push(`<p class="bt"><strong>${esc(s.copyTitle || 'Paste this')}</strong></p><pre>${esc(s.code)}</pre>`);
      for (const n of s.notes || []) o.push(`<p class="note">${inline(n)}</p>`);
      o.push(`<p class="done">Done when: ${inline(s.doneWhen)}</p>`);
    });
    for (const l of p.outro || []) o.push(`<p>${inline(l)}</p>`);
  }
  o.push('<h2>Tracking table</h2><p>Fill this in as you go. Marking a step done in your Record, with its date and the address once live, fills this table the next time you download the guide. Downloading does not mark anything done.</p>');
  o.push(`<table><thead><tr>${['Step', 'Owner', 'Where', 'Address once live', 'Date done', 'In your Record?'].map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${g.tracking.map((r) => `<tr><td>${esc(r.step)}</td><td>${r.owner}</td><td>${esc(r.where)}</td><td>${inline(r.address)}</td><td>${esc(r.date)}</td><td>${esc(r.inRecord)}</td></tr>`).join('')}</tbody></table>`);
  return `<div class="guide">${o.join('\n')}</div>`;
}

/** A complete printable document; its <title> is the file name browsers propose for the PDF. */
export function guidePrintHtml(g: Guide): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(g.fileStem)}</title><style>@page{size:Letter;margin:0.75in}body{margin:0;background:#fff}${GUIDE_CSS}</style></head><body>${guideBodyHtml(g)}</body></html>`;
}
