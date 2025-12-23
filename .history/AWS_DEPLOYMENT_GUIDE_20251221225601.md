# AWS Deployment Guide — Fleet Management System (MERN)

This guide provides a complete, step-by-step process to deploy the Fleet Management System to AWS, covering frontend deployments (Next.js user app and React Admin portal), backend containerization (Node.js + Redis in a single image), CI/CD push to ECR (no automatic ECS deploy), manual ECS deployment, connectivity, and IAM credentials/secrets.

---

## 0) Prerequisites

- AWS account with administrative access (temporary)
- macOS with Homebrew (or equivalent): `awscli`, `docker`, `node`, `npm`, `yarn`
- GitHub repository connected to this codebase
- Domain (optional, recommended) for CloudFront
- MongoDB (Atlas or AWS DocumentDB) connection string reachable from AWS ECS

Install AWS CLI and login:

```bash
brew install awscli
aws configure
# Enter AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, default region (e.g., us-east-1), output json
```

---

## 1) Architecture Overview

- Frontends (Next.js user app, React Admin portal):
  - Built into static assets
  - Hosted on AWS S3 with optional CloudFront CDN
  - Use ECS backend URL for all API calls
- Backend (Node.js + Express API + Redis):
  - Single Docker image containing Node and Redis
  - Hosted on AWS ECS (Fargate or EC2) behind an Application Load Balancer (ALB)
  - Image stored in AWS ECR via GitHub Actions

---

## 2) AWS Setup (S3, ECR, IAM)

### 2.1 Create S3 Buckets

Create two buckets in the same AWS region as ECS:
- `fleet-user-frontend-<env>` (e.g., `fleet-user-frontend-prod`)
- `fleet-admin-frontend-<env>` (e.g., `fleet-admin-frontend-prod`)

Enable static website hosting (S3 console → Properties → Static website hosting):
- Index document: `index.html`
- Error document: `index.html` (for SPA routing)

Optional: Use CloudFront to front S3, set default root object to `index.html`, add SPA routing behavior.

### 2.2 Create ECR Repository

In AWS Console → ECR:
- Create repository: `fleet-backend`
- Note the repository URI: `ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/fleet-backend`

### 2.3 Create IAM For CI/CD (GitHub Actions)

Option A — IAM User (as requested):
- Create IAM user: `github-actions-ecr-s3`
- Attach policies:
  - ECR push policy (see JSON below)
  - S3 deploy policy (limited to your two buckets)
- Generate Access Key ID and Secret Access Key
- Store in GitHub Secrets:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION` (e.g., `us-east-1`)
  - `ECR_REPOSITORY` = `fleet-backend`
  - `ECR_REGISTRY` = `ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com`
  - `USER_BUCKET` = `fleet-user-frontend-<env>` (optional, for FE deploy jobs)
  - `ADMIN_BUCKET` = `fleet-admin-frontend-<env>` (optional)

Option B — GitHub OIDC (recommended, optional): use `aws-actions/configure-aws-credentials@v4` with role trust policy; not required for this project based on current requirements.

Minimal ECR push policy JSON:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:CompleteLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:InitiateLayerUpload",
        "ecr:BatchGetImage",
        "ecr:PutImage"
      ],
      "Resource": "*"
    }
  ]
}
```

Minimal S3 deploy policy JSON (replace bucket names):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3DeployFrontend",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::fleet-user-frontend-prod",
        "arn:aws:s3:::fleet-admin-frontend-prod"
      ]
    },
    {
      "Sid": "S3PutObjects",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::fleet-user-frontend-prod/*",
        "arn:aws:s3:::fleet-admin-frontend-prod/*"
      ]
    }
  ]
}
```

---

## 3) Backend Dockerization (Node + Redis in one image)

The backend must package Node and Redis together. Use Alpine and install Redis, then launch both processes.

### 3.1 Dockerfile (single image)

Update `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

# Install Redis
RUN apk add --no-cache redis curl

WORKDIR /app

# Copy package files and install production deps
COPY package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm run build

# Expose API port
EXPOSE 5000

# Health check hits API
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S backend -u 1001
USER backend

# Start Redis then Node (simple supervisor)
CMD sh -c "redis-server --daemonize yes && npm start"
```

Notes:
- `REDIS_URL` should be `redis://localhost:6379` in ECS task env since Redis runs inside the same container.
- For production-grade supervision, consider `s6` or `supervisord`. The above is sufficient for the stated requirement.

### 3.2 Backend Environment

Set ECS task environment variables:

- `PORT=5000`
- `NODE_ENV=production`
- `MONGODB_URI=<your managed MongoDB URI>`
- `REDIS_URL=redis://localhost:6379`
- `JWT_SECRET=<strong-secret>`
- `JWT_EXPIRES_IN=7d`

---

## 4) CI/CD: Build and Push to ECR (No ECS Deploy)

Create GitHub Actions workflow `.github/workflows/ecr-push.yml` that builds the backend image and pushes to ECR when you push to `main` or manually trigger.

```yaml
name: Build and Push Backend to ECR

on:
  push:
    branches: ["main"]
  workflow_dispatch: {}

env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  ECR_REPOSITORY: ${{ secrets.ECR_REPOSITORY }} # e.g., fleet-backend
  IMAGE_TAG: ${{ github.sha }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build image
        run: |
          ECR_REGISTRY=${{ steps.login-ecr.outputs.registry }}
          docker build -t $ECR_REGISTRY/${{ env.ECR_REPOSITORY }}:${{ env.IMAGE_TAG }} -f backend/Dockerfile backend

      - name: Push image
        run: |
          ECR_REGISTRY=${{ steps.login-ecr.outputs.registry }}
          docker push $ECR_REGISTRY/${{ env.ECR_REPOSITORY }}:${{ env.IMAGE_TAG }}

      - name: Output image URI
        run: |
          echo "IMAGE_URI=${{ steps.login-ecr.outputs.registry }}/${{ env.ECR_REPOSITORY }}:${{ env.IMAGE_TAG }}" >> $GITHUB_OUTPUT
```

Important:
- This workflow does NOT deploy to ECS. You will deploy manually (Section 5).
- Add the GitHub Secrets listed in Section 2.3.

---

## 5) Manual ECS Deployment (Fargate or EC2)

### 5.1 Networking
- Create a VPC (or use default) with 2+ public subnets
- Security groups:
  - ALB SG: allow inbound 80/443 from Internet, allow outbound to ECS
  - ECS SG: allow inbound from ALB SG on port 5000, allow outbound all

### 5.2 Load Balancer
- Create Application Load Balancer (ALB)
- Target group: HTTP, port 5000, health check path `/api/health`
- Listener 80 → forward to target group (and optionally 443 with ACM cert)

### 5.3 ECS Cluster and Task Definition
- Create ECS Cluster (Fargate recommended)
- Task Definition:
  - Launch type: Fargate
  - Task memory/CPU: e.g., 1GB/0.5vCPU
  - Container:
    - Image: `ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/fleet-backend:<IMAGE_TAG>` (from GitHub Actions output)
    - Port mapping: `5000`
    - Env vars: set from Section 3.2
    - Health check: HTTP `/api/health`
  - Task role: if your app accesses AWS services, configure IAM role

### 5.4 ECS Service
- Create Service:
  - Desired count: 1+
  - Attach to ALB target group
  - Deployment type: rolling update
  - Auto-scaling (optional)

### 5.5 Manual Update Procedure
Each time CI/CD pushes a new image:
- Update Task Definition with new image tag
- Update ECS Service to use the new Task Definition revision
- Verify ALB health checks and that `/api/health` returns 200

---

## 6) Frontend: Next.js User App → S3

Your Next.js app must use the ECS backend URL. The project reads `process.env.NEXT_PUBLIC_BACKEND_URL` (see `frontend/src/lib/api.ts`).

### 6.1 Configure Next.js Static Export
Add static export in `frontend/next.config.js`:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
    domains: ['localhost', 'images.unsplash.com'],
  },
};
module.exports = nextConfig;
```

Note: If you rely on SSR/ISR pages, pure static export may not work. This project is primarily client-side with API calls, so export is acceptable.

### 6.2 Build with ECS URL

```bash
cd frontend
# Replace with your ALB DNS or custom domain
export NEXT_PUBLIC_BACKEND_URL="https://<ALB-or-domain>/api"
# Optional NextAuth production vars if used
export NEXTAUTH_URL="https://<your-frontend-domain>"
export NEXTAUTH_SECRET="<strong-secret>"

# Build and export static site
yarn install
yarn build
yarn export
# Output in ./out/
```

### 6.3 Upload to S3

```bash
aws s3 sync ./out s3://fleet-user-frontend-prod --delete
```

If using CloudFront:
- Point distribution origin to S3 bucket
- Set default root object `index.html`
- Create behavior with SPA routing (custom 404 → `/index.html`)
- Invalidate cache after deploy:

```bash
aws cloudfront create-invalidation \
  --distribution-id <DIST_ID> \
  --paths "/*"
```

---

## 7) Frontend: React Admin Portal → S3

Admin portal reads `process.env.REACT_APP_API_URL` (see `admin/fleet-admin-portal/src/api/admin.ts`).

### 7.1 Build with ECS URL

```bash
cd admin/fleet-admin-portal
# Use ALB URL
export REACT_APP_API_URL="https://<ALB-or-domain>/api"

npm install
npm run build
# Output in ./build/
```

### 7.2 Upload to S3

```bash
aws s3 sync ./build s3://fleet-admin-frontend-prod --delete
```

If using CloudFront, replicate steps from Section 6.3.

---

## 8) Connectivity Requirement (FE → BE)

After deployment, both S3-hosted frontends must call the ECS backend via the ALB URL:
- Next.js: `NEXT_PUBLIC_BACKEND_URL` → `https://<ALB-or-domain>/api`
- Admin: `REACT_APP_API_URL` → `https://<ALB-or-domain>/api`

Checklist:
- ALB listener 80/443 routes to ECS
- CORS on backend allows your FE origins (update backend CORS config if restrictive)
- Health check `/api/health` returns 200

---

## 9) IAM Credentials, Permissions & GitHub Secrets

- Create IAM user and attach policies from Section 2.3
- Store secrets in GitHub:
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`
  - `ECR_REPOSITORY`
  - Optionally: `USER_BUCKET`, `ADMIN_BUCKET`

Test ECR login locally (optional):

```bash
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
```

---

## 10) Validation & Smoke Tests

- Open FE URLs (S3 or CloudFront) and log in
- Browse vehicles, create bookings
- Admin portal: log in as admin, manage vehicles/trips
- Confirm network calls hit ALB domain and return 200/OK

CLI checks:

```bash
curl -I https://<ALB-or-domain>/api/health
curl https://<ALB-or-domain>/api/vehicles | head
```

---

## 11) Troubleshooting

- S3 SPA routing shows XML error → Set error document to `index.html`
- 403 on S3 objects → Bucket policy or CloudFront OAI missing
- 5xx from ALB → ECS task failing; check logs & env vars (`MONGODB_URI`, `JWT_SECRET`)
- Rate limiting/Redis errors → Ensure `REDIS_URL=redis://localhost:6379` and Redis started in container
- CORS blocked → Configure backend CORS to include FE origins/domains

---

## 12) Optional Enhancements

- CloudFront + ACM for HTTPS on FE
- Route 53 for custom domains
- OIDC for GitHub Actions (no static secrets)
- Separate Redis container/task (best practice), though requirement mandates single image
- Secrets Manager for backend secrets

---

## Quick Reference Commands

Build and push backend locally:

```bash
cd backend
docker build -t fleet-backend:local -f Dockerfile .
# Tag and push (if logged in)
docker tag fleet-backend:local ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/fleet-backend:local
docker push ACCOUNT_ID.dkr.ecr.REGION.amazonaws.com/fleet-backend:local
```

Deploy Next.js FE:

```bash
cd frontend
export NEXT_PUBLIC_BACKEND_URL="https://<ALB-or-domain>/api"
yarn install && yarn build && yarn export
aws s3 sync ./out s3://fleet-user-frontend-prod --delete
```

Deploy Admin FE:

```bash
cd admin/fleet-admin-portal
export REACT_APP_API_URL="https://<ALB-or-domain>/api"
npm install && npm run build
aws s3 sync ./build s3://fleet-admin-frontend-prod --delete
```
