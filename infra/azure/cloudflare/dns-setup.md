# Cloudflare DNS Setup for VoiceAI on Azure

## Overview

Your DNS stays in Cloudflare. Azure provides the hostnames; Cloudflare proxies
and secures them. This guide covers DNS records, SSL configuration, WebSocket
support, and custom domain binding on Azure.

Run `bootstrap.sh` first — it prints the exact hostnames you need to paste into
the tables below.

---

## 1. SSL Mode

Set Cloudflare to **Full (strict)** before adding any DNS records:

```
Cloudflare Dashboard → your-domain.com → SSL/TLS → Overview → Full (strict)
```

**Why Full (strict)?**
Azure Container Apps and Static Web Apps always serve valid TLS certificates.
Full (strict) encrypts the Cloudflare → Azure leg using that certificate,
preventing any man-in-the-middle on the origin side. "Flexible" mode (the
default) leaves the origin connection unencrypted — do not use it.

---

## 2. DNS Records

Add these four CNAME records in Cloudflare:

```
Dashboard → your-domain.com → DNS → Records → Add record
```

| Type  | Name | Target | TTL  | Proxy status |
|-------|------|--------|------|--------------|
| CNAME | `@`    | `<static-web-app-name>.azurestaticapps.net` | Auto | Proxied (orange cloud) |
| CNAME | `www`  | `<static-web-app-name>.azurestaticapps.net` | Auto | Proxied (orange cloud) |
| CNAME | `app`  | `<web-container-app-fqdn>.azurecontainerapps.io` | Auto | Proxied (orange cloud) |
| CNAME | `api`  | `<api-container-app-fqdn>.azurecontainerapps.io` | Auto | Proxied (orange cloud) |

Replace the placeholders with the actual values printed by `bootstrap.sh`.
Example values:
- Static Web App: `stapp-voiceai-prod-abc123.azurestaticapps.net`
- Web FQDN: `ca-voiceai-web-prod.kindocean-1234abcd.eastus.azurecontainerapps.io`
- API FQDN: `ca-voiceai-api-prod.kindocean-1234abcd.eastus.azurecontainerapps.io`

> **Note on the `@` record:** If your registrar (where you bought the domain)
> is not Cloudflare, a CNAME on the root (`@`) may not be supported. In that
> case, use Cloudflare's **CNAME flattening** — it is enabled by default on all
> plans and works automatically for root records.

---

## 3. WebSocket Support (required for voice calls)

The voice API uses WebSockets (`wss://api.yourdomain.com/ws/...`). Cloudflare
proxies WebSocket connections by default on all paid plans and on the Free plan.

Verify it is enabled:
```
Dashboard → your-domain.com → Network → WebSockets → Enabled
```

If the toggle is off, enable it. No other configuration is needed — Cloudflare
will upgrade HTTP/HTTPS requests that include the `Upgrade: websocket` header
automatically.

**Connection timeout:** Cloudflare terminates idle WebSocket connections after
100 seconds. If your voice calls can be silent for longer, implement a
heartbeat ping in the client and server every 30 seconds.

---

## 4. Custom Domain on Azure Static Web Apps

After adding the DNS CNAME records above, register the custom domain in Azure
so it provisions a managed TLS certificate.

```bash
# Root domain
az staticwebapp hostname set \
  --name stapp-voiceai-prod-<suffix> \
  --resource-group rg-voiceai-prod \
  --hostname yourdomain.com

# www subdomain
az staticwebapp hostname set \
  --name stapp-voiceai-prod-<suffix> \
  --resource-group rg-voiceai-prod \
  --hostname www.yourdomain.com
```

Azure validates ownership via the CNAME record you already added, then
provisions a free managed certificate. This takes 1–5 minutes.

Verify in the portal: Static Web Apps → Custom domains → Status should show
"Ready" and "Secured".

---

## 5. Custom Domain on Azure Container Apps

Container Apps require a TXT validation record before the CNAME will work.
Repeat this process for both `api.yourdomain.com` and `app.yourdomain.com`.

### 5a. API subdomain (`api.yourdomain.com`)

**Step 1 — Get the validation token:**
```bash
az containerapp hostname add \
  --name ca-voiceai-api-prod \
  --resource-group rg-voiceai-prod \
  --hostname api.yourdomain.com
```

The command prints a `customDomainVerificationId`. Copy it.

**Step 2 — Add a TXT record in Cloudflare (DNS-only, NOT proxied):**

| Type | Name          | Value                          | Proxy |
|------|---------------|--------------------------------|-------|
| TXT  | `asuid.api`   | `<customDomainVerificationId>` | DNS only (grey cloud) |

Wait 1–2 minutes for DNS to propagate.

**Step 3 — Bind the managed certificate:**
```bash
az containerapp hostname bind \
  --name ca-voiceai-api-prod \
  --resource-group rg-voiceai-prod \
  --hostname api.yourdomain.com \
  --environment cae-voiceai-prod \
  --validation-method CNAME
```

Azure provisions a free managed certificate and binds it. After ~5 minutes the
HTTPS endpoint becomes live.

### 5b. Web subdomain (`app.yourdomain.com`)

Repeat the same three steps, replacing `ca-voiceai-api-prod` with
`ca-voiceai-web-prod` and `api` with `app`:

```bash
az containerapp hostname add \
  --name ca-voiceai-web-prod \
  --resource-group rg-voiceai-prod \
  --hostname app.yourdomain.com

# Add TXT record: asuid.app → <verificationId>  (DNS only)

az containerapp hostname bind \
  --name ca-voiceai-web-prod \
  --resource-group rg-voiceai-prod \
  --hostname app.yourdomain.com \
  --environment cae-voiceai-prod \
  --validation-method CNAME
```

---

## 6. Recommended Cloudflare Security Settings

Apply these in: **Dashboard → your-domain.com → Security**

| Setting | Value | Reason |
|---------|-------|--------|
| Security Level | Medium | Blocks known bad actors without false-positive risk |
| Bot Fight Mode | ON | Reduces scraping and credential stuffing |
| Always Use HTTPS | ON | Redirects HTTP → HTTPS at the edge |
| Min TLS Version | 1.2 | Blocks TLS 1.0/1.1 (deprecated) |

**HSTS** (HTTP Strict Transport Security):
```
Dashboard → SSL/TLS → Edge Certificates → HTTP Strict Transport Security (HSTS)
```
- Enable HSTS: ON
- Max Age: 31536000 (1 year)
- Include subdomains: ON
- Preload: ON (only after you are confident in your HTTPS setup)

> Warning: once HSTS preload is submitted, removing it takes months. Enable it
> only when your HTTPS setup is stable.

---

## 7. Rate Limiting Rules (recommended)

Add these in: **Dashboard → Security → WAF → Rate limiting rules**

### General API rate limit

```
Rule name: API rate limit
If:  hostname equals api.yourdomain.com
     AND path starts with /api/
Then: Rate limit — 100 requests per 1 minute per IP
Action: Block (return 429)
```

### Auth endpoint rate limit (stricter)

```
Rule name: Auth rate limit
If:  hostname equals api.yourdomain.com
     AND path starts with /api/v1/auth/
Then: Rate limit — 10 requests per 1 minute per IP
Action: Block (return 429)
```

### WebSocket endpoint (skip rate limiting)

```
Rule name: Allow WebSocket
If:  hostname equals api.yourdomain.com
     AND path starts with /ws/
Then: Skip — rate limiting rules
```

---

## 8. Caching Rules

Configure in: **Dashboard → Caching → Cache Rules → Create rule**

### Rule 1 — Static Next.js assets (long cache)

```
If:  hostname equals yourdomain.com or app.yourdomain.com
     AND path contains /_next/static/
Then:
  Cache eligibility: Eligible for cache
  Edge TTL: 1 year (ignore origin)
  Browser TTL: 1 year
```

### Rule 2 — Landing page HTML (short cache)

```
If:  hostname equals yourdomain.com or www.yourdomain.com
     AND path equals /
Then:
  Cache eligibility: Eligible for cache
  Edge TTL: 1 hour
  Browser TTL: 5 minutes
```

### Rule 3 — API responses (bypass cache)

```
If:  hostname equals api.yourdomain.com
Then:
  Cache eligibility: Bypass cache
```

### Rule 4 — WebSocket connections (bypass cache)

```
If:  hostname equals api.yourdomain.com
     AND path starts with /ws/
Then:
  Cache eligibility: Bypass cache
```

---

## 9. Troubleshooting

**"SSL handshake failed" or 525 error:**
- Ensure Cloudflare SSL mode is set to Full (strict), not Flexible
- Azure Container Apps certificates are valid — Flexible mode should not be needed

**WebSocket connections dropping after 100 seconds:**
- Add a client-side heartbeat ping every 30 seconds
- Server must respond to ping frames (FastAPI/Starlette does this automatically)

**"Too many redirects" (ERR_TOO_MANY_REDIRECTS):**
- Usually caused by Cloudflare set to "Flexible" SSL while the origin redirects HTTP to HTTPS
- Fix: set Cloudflare SSL to "Full (strict)"

**Custom domain showing "Pending" in Azure:**
- Verify the TXT record (`asuid.api`) is set and propagated: `dig TXT asuid.api.yourdomain.com`
- Ensure the CNAME record is NOT proxied (grey cloud) until after certificate is bound
- After binding, switch the CNAME back to proxied (orange cloud)

**CORS errors from browser:**
- The API Container App has CORS configured for `https://yourdomain.com` and `https://app.yourdomain.com`
- If you add additional origins, update the `corsPolicy.allowedOrigins` in `bicep/modules/container-apps.bicep` and redeploy
