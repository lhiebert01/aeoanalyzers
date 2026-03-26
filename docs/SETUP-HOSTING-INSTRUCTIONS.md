# AEO Analyzer: Vercel Hosting & Custom Domain Setup

This guide provides instructions for deploying the **AEO Analyzer** on Vercel with a custom domain managed through **Network Solutions**.

---

## 1. Domain Configuration

The production domain is **aeoanalyzers.com**, registered and managed through **Network Solutions**.

- **Production URL**: https://www.aeoanalyzers.com
- **Vercel Default URL**: https://aeo-app1.vercel.app
- **DNS Provider**: Network Solutions
- **Registrar**: Network Solutions

---

## 2. Vercel Deployment Setup

### A. Connect GitHub Repository

1. Log in to [Vercel](https://vercel.com/).
2. Click **Add New Project**.
3. Import the GitHub repository: `https://github.com/lhiebert01/aeoanalyzers`.
4. Vercel will auto-detect the Vite framework and configure build settings.
5. Deploy.

### B. Build Configuration

Vercel should auto-detect these, but verify in **Project Settings > General**:

| Setting | Value |
| :--- | :--- |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Node.js Version** | 18.x or 20.x |

### C. Environment Variables

Set these in **Vercel Dashboard > Project Settings > Environment Variables**:

| Variable | Description | Required |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `STRIPE_SECRET_KEY` | Stripe secret key | For payments |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | For payments |
| `VITE_STRIPE_PRICE_ID_PRO` | Stripe Pro plan price ID | For payments |
| `VITE_STRIPE_PRICE_ID_BUSINESS` | Stripe Business plan price ID | For payments |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | For payments |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) | For webhooks |
| `VITE_APP_URL` | `https://www.aeoanalyzers.com` | Yes |

---

## 3. Custom Domain Mapping (Network Solutions DNS)

### A. Add Domain in Vercel

1. Go to **Vercel Dashboard > Project > Settings > Domains**.
2. Add `aeoanalyzers.com`.
3. Add `www.aeoanalyzers.com`.
4. Vercel will provide the required DNS records.

### B. Update DNS Records in Network Solutions

1. Log in to your **Network Solutions** account.
2. Navigate to **DNS Management** for `aeoanalyzers.com`.
3. Add the following records:

| Type | Host | Value | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `76.76.21.21` (Vercel IP) | 3600 |
| **CNAME** | `www` | `cname.vercel-dns.com` | 3600 |

4. DNS propagation typically completes within minutes, but can take up to 24-48 hours.

### C. SSL Certificate

Vercel **automatically provisions and renews** SSL certificates via Let's Encrypt once DNS records are verified. No manual SSL configuration is required.

---

## 4. Supabase Auth Configuration

Ensure your custom domain is authorized in Supabase:

1. Go to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to **Authentication > URL Configuration**.
3. Set the **Site URL** to `https://www.aeoanalyzers.com`.
4. Add redirect URLs:
   - `https://www.aeoanalyzers.com/**`
   - `https://aeoanalyzers.com/**`
   - `https://aeo-app1.vercel.app/**` (for preview deployments)
   - `http://localhost:5173/**` (for local development)

---

## 5. Serverless API Routes

The Vercel deployment includes serverless API routes in the `/api` directory:

| Route | Purpose |
| :--- | :--- |
| `/api/fetch-site` | HTML proxy with spoofed User-Agent for AEO analysis |
| `/api/create-checkout-session` | Stripe checkout session creation |
| `/api/create-portal-session` | Stripe billing portal access |
| `/api/webhook` | Stripe webhook handler (updates Supabase via service role key) |

These are automatically deployed as serverless functions by Vercel.

---

## 6. Summary Checklist

- [ ] Connect GitHub repo (`lhiebert01/aeoanalyzers`) to Vercel.
- [ ] Set all **environment variables** in Vercel dashboard.
- [ ] Add custom domain `aeoanalyzers.com` and `www.aeoanalyzers.com` in Vercel.
- [ ] Update **DNS records** in Network Solutions.
- [ ] Verify **SSL certificate** is provisioned (automatic).
- [ ] Configure **redirect URLs** in Supabase Auth settings.
- [ ] Set **Site URL** in Supabase to `https://www.aeoanalyzers.com`.
- [ ] Verify Stripe webhook endpoint points to `https://www.aeoanalyzers.com/api/webhook`.
