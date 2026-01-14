# ☁️ GCP Agent Start Pack for SirTrav-A2A-Studio

This pack contains everything you need to deploy your agent pipeline to **Google Cloud Run**.

## 📦 Contents

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build for a lightweight production container. |
| `service.yaml` | Cloud Run service configuration (resources, scaling). |
| `cloudbuild.yaml` | CI/CD pipeline steps for Google Cloud Build. |

## 🚀 Quick Start

### 1. Prerequisites

-   Install [Google Cloud CLI](https://cloud.google.com/sdk/docs/install)
-   Authenticate:
    ```bash
    gcloud auth login
    gcloud config set project YOUR_PROJECT_ID
    ```
-   Enable APIs:
    ```bash
    gcloud services enable run.googleapis.com cloudbuild.googleapis.com
    ```

### 2. Manual Deployment (One-Liners)

**Build & Push Image:**
```bash
gcloud builds submit --config gcp/cloudbuild.yaml .
```

**Deploy from Service YAML:**
```bash
# Update IMAGE_URL in gcp/service.yaml first!
gcloud run services replace gcp/service.yaml
```

### 3. Continuous Deployment

1.  Connect your GitHub repo to **Cloud Build**.
2.  Set the Trigger to watch for pushes to `main`.
3.  Point the trigger to `gcp/cloudbuild.yaml`.

## ⚙️ Configuration

-   **Environment Variables**: Add your API keys (ElevenLabs, Suno) via **Secret Manager** and map them in `service.yaml` or the Cloud Run console.
-   **Resources**: Default is 1 vCPU / 1GB RAM. Adjust in `service.yaml` for heavy FFmpeg loads.

## 🛡️ Security Note

The default configuration allows unauthenticated invocation (`--allow-unauthenticated`) for easy testing. For production, **remove this flag** and set up IAM roles.
