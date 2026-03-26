# Cloud Run SSL Validation & Domain Fix Guide

This document outlines the specific troubleshooting steps and configurations required to bypass HTTPS redirection loops and successfully validate an SSL certificate for **aeoanalyzers.com** on Google Cloud Run.

## 1. The Core Conflict
Google’s Custom Domain Mapping (Preview) uses an **HTTP-01 ACME challenge**. This requires the verification bot to reach your server over raw HTTP (Port 80). If the Nginx sidecar or the Google Frontend (GFE) forces a **302 Redirect** to HTTPS before the challenge is met, validation will fail indefinitely.

## 2. Troubleshooting & Validation Workflow

### Step 1: Grant Public Access
The service must allow unauthenticated requests for the Google Certificate Bridge to reach the challenge path.
**Command:**
```bash
gcloud run services add-iam-policy-binding aeo-analyzers \
    --member="allUsers" \
    --role="roles/run.invoker" \
    --region=us-west1
```

### Step 2: Disable Global HTTPS Redirection
The Google Frontend must be told to stop intercepting HTTP traffic at the edge.
**Command:**
```bash
gcloud run services update aeo-analyzers \
    --update-annotations=run.googleapis.com/https-redirection=disabled \
    --region=us-west1
```

### Step 3: The "Port Swap" Bypass (The Nuclear Fix)
If Nginx continues to redirect internally, temporarily move the Node.js App to the front (Port 8080) to answer the challenge directly.
**Action:** Set `containerPort: 8080` for the `app-container` and remove all ports from the `nginx-container` in the YAML.

### Step 4: Reset Domain Mapping
To clear the GFE cache and force a fresh handshake:
1. Delete the existing domain mapping for `aeoanalyzers.com`.
2. Wait 2 minutes.
3. Re-add the mapping in the Cloud Run Console.

## 3. Verification Commands
Run these from a local terminal (PowerShell/Bash) to monitor the "Truth-Teller" status.

| Command | Goal | Successful Response |
| :--- | :--- | :--- |
| `curl.exe -I http://aeoanalyzers.com/.well-known/acme-challenge/test` | Verify no 302/403 | `HTTP/1.1 200 OK` or `404` |
| `curl.exe -I https://aeoanalyzers.com` | Verify SSL active | `HTTP/1.1 200 OK` |

## 4. Final Production YAML (Post-Validation)
Once the certificate is **Active (Green)**, restore the Nginx sidecar to the primary ingress position.

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: aeo-analyzers
  annotations:
    run.googleapis.com/ingress: all
    run.googleapis.com/https-redirection: enabled # Restored for production
spec:
  template:
    metadata:
      annotations:
        run.googleapis.com/container-dependencies: '{"nginx-container":["app-container"]}'
    spec:
      containers:
      # --- NGINX: Primary Ingress ---
      - name: nginx-container
        image: us-west1-docker.pkg.dev/[IMAGE_PATH]
        ports:
        - name: http1
          containerPort: 8080 
        env:
        - name: NGINX_PORT
          value: '8080'
        - name: PROXY_CONFIG
          value: |
            {
              "requiredModels": ["gemini-3-flash-preview"],
              "requiredResponseMimeTypes": ["application/json"]
            }
      # --- APP: Sidecar ---
      - name: app-container
        image: scratch
        # No 'ports' block allowed here (Cloud Run 'One Port' Rule)
        env:
        - name: SECURE_COOKIES
          value: 'true'
        - name: APP_URL
          value: https://aeoanalyzers.com
        startupProbe:
          tcpSocket:
            port: 3000
```

## 5. Summary of Key Fixes
*   **Cloud Run Limitation:** Only one container can expose a port. In production, this must be Nginx (8080).
*   **Reserved Names:** Never manually define `PORT` in the `env:` section; let Cloud Run inject it.
*   **Port Naming:** All named ports in YAML must be exactly `http1` or `h2c`.
*   **Redirection:** SSL validation requires `https-redirection: disabled` until the status turns Green.
