# Vercel Domain & SSL Configuration Guide

This document covers domain configuration, SSL management, and troubleshooting for **aeoanalyzers.com** hosted on Vercel.

## 1. How Vercel Handles SSL

Unlike the previous Cloud Run setup (which required manual ACME challenge handling, Nginx sidecar configuration, and port-swap workarounds), Vercel handles SSL **fully automatically**:

- SSL certificates are provisioned via **Let's Encrypt** once DNS records are verified.
- Certificates are **automatically renewed** before expiration.
- **HTTPS is enforced** by default -- all HTTP requests are redirected to HTTPS.
- No manual certificate management, Nginx configuration, or YAML manifests required.

## 2. Domain Setup

### Production Domains

| Domain | Type | Status |
| :--- | :--- | :--- |
| `www.aeoanalyzers.com` | Primary (CNAME) | Active |
| `aeoanalyzers.com` | Redirect to www (A record) | Active |
| `aeo-app1.vercel.app` | Vercel default | Active |

### DNS Records (Network Solutions)

| Type | Host | Value | Purpose |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `76.76.21.21` | Root domain to Vercel |
| **CNAME** | `www` | `cname.vercel-dns.com` | www subdomain to Vercel |

## 3. Troubleshooting

### Domain Not Resolving

1. **Verify DNS records** in Network Solutions match the values above.
2. **Check propagation** using an online tool like [dnschecker.org](https://dnschecker.org/).
3. **Wait for propagation** -- DNS changes can take up to 48 hours, though they typically resolve in minutes.
4. In Vercel Dashboard, go to **Settings > Domains** and check for any error messages.

### SSL Certificate Not Provisioning

If the SSL certificate shows as "Pending" in Vercel:

1. **Verify DNS records** are correct and have propagated.
2. **Check for CAA records** -- if your domain has CAA DNS records, ensure `letsencrypt.org` is permitted.
3. **Remove conflicting records** -- ensure no other A/AAAA/CNAME records conflict with Vercel's required records.
4. **Wait** -- Vercel will automatically retry certificate provisioning. It usually completes within minutes of DNS verification.

### Mixed Content Warnings

If you see mixed content warnings in the browser:

1. Ensure all API calls use `https://` URLs.
2. Check that `VITE_APP_URL` is set to `https://www.aeoanalyzers.com` (not `http://`).
3. Verify Supabase URL uses `https://`.

## 4. Verification Commands

Run these from a local terminal to verify the domain is working correctly:

| Command | Expected Result |
| :--- | :--- |
| `curl -I https://www.aeoanalyzers.com` | `HTTP/2 200` with valid SSL headers |
| `curl -I http://aeoanalyzers.com` | `HTTP/2 308` redirect to `https://www.aeoanalyzers.com` |
| `nslookup aeoanalyzers.com` | Returns `76.76.21.21` |
| `nslookup www.aeoanalyzers.com` | Returns CNAME to `cname.vercel-dns.com` |

## 5. Key Differences from Previous Setup (Cloud Run)

| Aspect | Cloud Run (Old) | Vercel (Current) |
| :--- | :--- | :--- |
| **SSL Provisioning** | Manual ACME challenge, required disabling HTTPS redirect | Fully automatic |
| **Nginx Sidecar** | Required for ingress routing | Not needed |
| **Port Configuration** | Complex YAML with port-swap workarounds | Not applicable |
| **Cost** | ~$200/day for Cloud Run + Nginx | $0 (Vercel free tier) or $20/mo (Pro) |
| **HTTPS Redirect** | Had to be manually toggled during cert provisioning | Always on, automatic |
| **Domain Mapping** | Required `gcloud` CLI commands | Vercel dashboard UI |
| **Certificate Renewal** | Required monitoring | Fully automatic |

## 6. Summary

With Vercel, domain and SSL management is dramatically simpler than the previous Cloud Run setup. There are no YAML manifests, no Nginx sidecars, no port-swap workarounds, and no manual certificate provisioning. If DNS records are correctly configured in Network Solutions, everything else is handled automatically by Vercel.
