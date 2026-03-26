# AEO Analyzer: Cloud Run & Custom Domain Setup

This guide provides instructions for deploying the **AEO Analyzer** on your own domain while keeping the hosting on **Google Cloud Run**.

---

## 1. Recommended Domain Names (GoDaddy)
For a professional and authoritative AEO tool, consider these domains:

*   **Brand Focused:** `aeoanalyzer.com`, `aeo-analyzer.com`, `getaeo.com`
*   **AI & Tech Focused:** `aeoanalyzer.ai`, `brandcitations.ai`, `aeo-score.ai`
*   **Action Oriented:** `aeo-audit.com`, `aeo-report.com`, `aeo-check.com`
*   **Enterprise Focused:** `aeo-platform.com`, `aeo-suite.com`, `aeo-pro.com`

---

## 2. Cloud Run Custom Domain Mapping

To map your custom domain to your Cloud Run service:

1.  **Open Google Cloud Console:** Go to the [Cloud Run](https://console.cloud.google.com/run) page.
2.  **Select Service:** Click on your service name (e.g., `aeo-analyzer`).
3.  **Manage Custom Domains:** Click on **Manage Custom Domains** in the top navigation bar.
4.  **Add Mapping:**
    *   Click **Add Mapping**.
    *   Select the service you want to map.
    *   Select **Verified Domain** (you may need to verify ownership via Google Search Console first).
    *   Enter the subdomain (e.g., `www.aeoanalyzer.com` or leave empty for the root domain).
    *   **Troubleshooting:** If your domain is stuck in "Provisioning" or "Waiting for Certificate", see the [Cloud Run SSL Validation & Domain Fix Guide](./CLOUD-RUN-SSL-DOMAIN-FIX-GUIDE.md).
5.  **Update DNS in GoDaddy:**
    *   Google Cloud will provide **A** and **AAAA** records (or a **CNAME** record for subdomains).
    *   Log in to your **GoDaddy** account.
    *   Navigate to **DNS Management** for your domain.
    *   Add the provided records.
    *   *Note: DNS propagation can take up to 24-48 hours.*

---

## 3. Required Code & Configuration Changes

When moving to a custom domain, you must update these settings to ensure security and functionality:

### A. Firebase Authentication (Authorized Domains)
Firebase will block login attempts from your new domain until it is authorized.
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Navigate to **Authentication** > **Settings** > **Authorized Domains**.
3.  Add your new domain (e.g., `aeoanalyzer.com`) to the list.

### B. OAuth Redirect URIs
If you use Google or other third-party login providers:
1.  Go to the [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials) page.
2.  Find your **OAuth 2.0 Client ID**.
3.  Add `https://your-new-domain.com/__/auth/handler` to the **Authorized redirect URIs**.

### C. Environment Variables
Update your application's environment variables in the **AI Studio Settings** or your deployment configuration:
1.  `APP_URL`: Set to `https://www.your-new-domain.com`.
2.  `SHARED_APP_URL`: Set to `https://www.your-new-domain.com`.

### D. Firebase Config (`firebase-applet-config.json`)
You can optionally update the `authDomain` in `firebase-applet-config.json` to your custom domain once it is fully connected and verified.

---

## 4. Summary Checklist
- [ ] Buy domain on **GoDaddy**.
- [ ] Map domain in **Google Cloud Run** console.
- [ ] Update **DNS records** in GoDaddy.
- [ ] Authorize domain in **Firebase Auth** settings.
- [ ] Update **OAuth Redirect URIs** in Google Cloud Console.
- [ ] Update **Environment Variables** in AI Studio.
