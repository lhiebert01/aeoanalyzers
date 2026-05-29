// Test fixtures derived from the AEOANALYZERS_IMPROVEMENT_BRIEF.md audit of
// getmacrolens.com (2026-05-29). Macro Lens is an editorial brand: a calibrated
// daily market brief with a founder byline, dated articles, and a free
// newsletter — the exact register the tool used to damage with SaaS-style
// voice rewrites.

export const MACROLENS_EDITORIAL_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Macro Lens — Anxiety-free investing for the rest of us</title>
  <meta name="description" content="A five-minute daily brief that tells you what's actually happening in the markets — calmly, in plain English." />
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Article","headline":"Today's Brief","datePublished":"2026-05-29","author":{"@type":"Person","name":"Jordan Wells"}}
  </script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"ProfilePage"}
  </script>
</head>
<body>
  <header><nav>Home · Archive · About</nav></header>
  <main>
    <h1>Anxiety-free investing for the rest of us</h1>
    <p>You just have to read a five-minute brief every morning that tells you what's
    actually happening — calmly, calibrated, in plain English.</p>
    <p>GPS doesn't make you a better navigator. It makes navigation a non-issue.
    Macro Lens does the same for market context.</p>
    <article>
      <time datetime="2026-05-29">May 29, 2026</time>
      <p>By Jordan Wells. We read the tape so you don't have to. Our daily brief
      distills the day into one of five regime states: bullish, mixed_bullish,
      transitional, mixed_bearish, and bearish.</p>
    </article>
    <section>
      <h2>The Daily Brief</h2>
      <p>Free. Forever. No paywall on the daily brief.</p>
      <form><input type="email" placeholder="your@email.com" /><button>Subscribe</button></form>
    </section>
    <section>
      <h2>Should I Worry?</h2>
      <p>An on-demand interactive tool that reads current conditions for you.</p>
    </section>
    <footer>Free. Forever. Founded by Jordan Wells. <a href="https://linkedin.com/in/jordanwells">LinkedIn</a></footer>
  </main>
</body>
</html>
`;

// A SaaS landing page — pricing table, signup + separate login, features grid.
export const SAAS_HTML = `
<!DOCTYPE html>
<html><head><title>Linearish — Project tracking</title>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"Linearish"}</script>
</head>
<body>
  <nav><a href="/login">Log in</a> <a href="/signup">Sign up</a></nav>
  <h1>Plan and build products</h1>
  <section class="features grid"><div class="card">Issues</div><div class="card">Cycles</div></section>
  <section id="pricing"><h2>Pricing</h2><p>$8 / user / month. Start free trial.</p></section>
</body></html>
`;

// An ecommerce page — Product schema, cart, buy button with price.
export const ECOMMERCE_HTML = `
<!DOCTYPE html>
<html><head><title>Shop</title>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Wool Runner"}</script>
</head>
<body>
  <header><a class="cart" href="/cart">Your cart</a></header>
  <h1>Wool Runner</h1>
  <p>$98</p><button>Add to cart</button>
</body></html>
`;

// The seven "services" the tool over-extracted from Macro Lens (Failure 3).
// Only the first and third are real, user-facing offerings.
export const MACROLENS_SEVEN_OFFERS = [
  { itemOffered: { '@type': 'Service', name: 'Daily Market Briefing' } },        // real
  { itemOffered: { '@type': 'Service', name: 'Market Regime Analysis' } },       // internal framework
  { itemOffered: { '@type': 'Service', name: 'Should I Worry Diagnostic Tool' } }, // real
  { itemOffered: { '@type': 'Service', name: 'Deterministic Six-Signal Market Read' } }, // architecture
  { itemOffered: { '@type': 'Service', name: 'AI Synthesis Layer' } },           // architecture
  { itemOffered: { '@type': 'Service', name: 'Historical Market Archive' } },    // a page
  { itemOffered: { '@type': 'Service', name: 'Sector Rotation Framework' } },    // architecture
];
