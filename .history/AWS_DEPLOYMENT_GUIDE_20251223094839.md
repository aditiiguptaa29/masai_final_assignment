Conversation opened. 1 unread message.

Skip to content
Using Gmail with screen readers
Enable desktop notifications for Gmail.
   OK  No, thanks
23 of 3,356
Document from Aditi
Inbox

9762_Aditi_Gupta <crce.9762.ce@gmail.com>
Attachments
Sun 21 Dec, 14:18 (2 days ago)
to me

DEPLOYMENT_GUIDE.md 
 One attachment
  •  Scanned by Gmail
# 🚀 Fleet Management System - AWS Deployment Guide

## Part 4: Complete AWS Deployment Strategy

This guide covers the complete deployment of:
- **Backend** → Dockerized (Node + Redis) → ECR → Manual ECS
- **Next.js User App** → S3 Static Hosting
- **React Admin Portal** → S3 Static Hosting

---

## 📋 Prerequisites

### Required Tools
- [x] AWS Account with appropriate permissions
- [x] AWS CLI installed and configured
- [x] Docker Desktop installed
- [x] Node.js 18+ and npm/yarn
- [x] Git and GitHub account

### AWS Services Required
- [x] ECR (Elastic Container Registry)
- [x] ECS (Elastic Container Service)
- [x] EC2 (for ECS compute)
- [x] S3 (Static hosting)
- [x] IAM (Permissions)
- [x] VPC (Networking)

---

## 🐳 Phase 1: Backend Dockerization

### Step 1.1: Create Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

# Install Redis
RUN apk add --no-cache redis

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Expose ports
EXPOSE 5000 6379

# Create startup script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Start both Redis and Node.js
ENTRYPOINT ["docker-entrypoint.sh"]
```

### Step 1.2: Create Docker Entrypoint Script

Create `backend/docker-entrypoint.sh`:

```bash
#!/bin/sh
set -e

echo "Starting Redis server..."
redis-server --daemonize yes --bind 127.0.0.1 --port 6379

echo "Waiting for Redis to start..."
sleep 2

echo "Starting Node.js application..."
exec node dist/index.js
```

### Step 1.3: Create .dockerignore

Create `backend/.dockerignore`:

```
node_modules
npm-debug.log
.env
.env.local
.git
.gitignore
dist
*.md
src/__tests__
coverage
.vscode
```

### Step 1.4: Update Backend Environment Variables

Create `backend/.env.production`:

```env
NODE_ENV=production
PORT=5000

# MongoDB Atlas (Use your production cluster)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/fleet-management?retryWrites=true&w=majority

# Local Redis (inside Docker)
REDIS_URL=redis://127.0.0.1:6379

# JWT Secrets (Generate new secure secrets)
JWT_SECRET=your_production_jwt_secret_here_min_32_chars
JWT_EXPIRES_IN=1h
REFRESH_TOKEN_SECRET=your_production_refresh_secret_here_min_32_chars
REFRESH_TOKEN_EXPIRES_IN=7d

# Email Configuration (Use production SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# CORS Origins (Will be updated with S3 URLs)
CORS_ORIGIN=*
```

### Step 1.5: Test Docker Build Locally

```bash
cd backend

# Build the image
docker build -t fleet-backend:latest .

# Test run locally
docker run -p 5000:5000 -p 6379:6379 \
  -e MONGODB_URI="your_mongodb_uri" \
  -e JWT_SECRET="test_secret_min_32_characters_long" \
  -e REFRESH_TOKEN_SECRET="test_refresh_min_32_chars" \
  fleet-backend:latest

# Test the API
curl http://localhost:5000/api/health
```

---

## 🔐 Phase 2: AWS IAM Setup

### Step 2.1: Create IAM User for GitHub Actions

1. **Go to AWS Console → IAM → Users → Create User**
   - Username: `github-actions-deployer`
   - Access type: Programmatic access

2. **Attach Policies:**
   - `AmazonEC2ContainerRegistryFullAccess`
   - `AmazonS3FullAccess`
   - Create custom policy for ECS (optional for manual deployment)

3. **Save Credentials:**
   - Access Key ID: `AKIA...`
   - Secret Access Key: `wJal...`
   - ⚠️ **Keep these secure!**

### Step 2.2: Create Custom Policy for ECR

Create policy `ECR-Push-Policy`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:PutImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 📦 Phase 3: AWS ECR Setup

### Step 3.1: Create ECR Repository

```bash
# Configure AWS CLI
aws configure
# Enter: Access Key, Secret Key, Region (e.g., us-east-1), Output format (json)

# Create ECR repository
aws ecr create-repository \
  --repository-name fleet-management-backend \
  --region us-east-1

# Output will contain:
# "repositoryUri": "123456789012.dkr.ecr.us-east-1.amazonaws.com/fleet-management-backend"
# Save this URI!
```

### Step 3.2: Test Push to ECR Manually

```bash
# Get login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Tag your image
docker tag fleet-backend:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/fleet-management-backend:latest

# Push to ECR
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/fleet-management-backend:latest
```

---

## ⚙️ Phase 4: GitHub Actions CI/CD

### Step 4.1: Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add the following secrets:
- `AWS_ACCESS_KEY_ID` → Your IAM access key
- `AWS_SECRET_ACCESS_KEY` → Your IAM secret key
- `AWS_REGION` → `us-east-1` (or your region)
- `ECR_REPOSITORY` → `fleet-management-backend`
- `ECR_REGISTRY` → `123456789012.dkr.ecr.us-east-1.amazonaws.com`

### Step 4.2: Create GitHub Actions Workflow

Create `.github/workflows/deploy-backend.yml`:

```yaml
name: Deploy Backend to ECR

on:
  push:
    branches:
      - main
    paths:
      - 'backend/**'
  workflow_dispatch:

env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  ECR_REGISTRY: ${{ secrets.ECR_REGISTRY }}
  ECR_REPOSITORY: ${{ secrets.ECR_REPOSITORY }}
  IMAGE_TAG: ${{ github.sha }}

jobs:
  build-and-push:
    name: Build and Push to ECR
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build Docker image
        working-directory: ./backend
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Push Docker image to ECR
        run: |
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Image digest
        run: echo "Image pushed with tag $IMAGE_TAG"

      - name: Deployment info
        run: |
          echo "✅ Image successfully pushed to ECR"
          echo "📦 Image URI: $ECR_REGISTRY/$ECR_REPOSITORY:latest"
          echo "🚀 Now deploy manually to ECS using this image"
```

### Step 4.3: Test GitHub Actions

```bash
# Commit and push the workflow
git add .github/workflows/deploy-backend.yml backend/
git commit -m "Add CI/CD for backend"
git push origin main

# Go to GitHub → Actions tab to monitor the workflow
# ✅ Should build and push to ECR successfully
```

---

## 🖥️ Phase 5: AWS ECS Manual Deployment

### Step 5.1: Create ECS Cluster

```bash
# Create ECS cluster
aws ecs create-cluster \
  --cluster-name fleet-management-cluster \
  --region us-east-1

# Or use AWS Console:
# ECS → Clusters → Create Cluster → EC2 Linux + Networking
# Cluster name: fleet-management-cluster
# Instance type: t3.medium (or t3.small for testing)
# Number of instances: 1
# Key pair: Select or create one
```

### Step 5.2: Create Task Definition

Create `backend/ecs-task-definition.json`:

```json
{
  "family": "fleet-backend-task",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "fleet-backend",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/fleet-management-backend:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "5000"
        },
        {
          "name": "REDIS_URL",
          "value": "redis://127.0.0.1:6379"
        }
      ],
      "secrets": [
        {
          "name": "MONGODB_URI",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:fleet/mongodb-uri"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:fleet/jwt-secret"
        },
        {
          "name": "REFRESH_TOKEN_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:fleet/refresh-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/fleet-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "essential": true
    }
  ],
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole"
}
```

### Step 5.3: Store Secrets in AWS Secrets Manager

```bash
# Store MongoDB URI
aws secretsmanager create-secret \
  --name fleet/mongodb-uri \
  --secret-string "mongodb+srv://user:pass@cluster.mongodb.net/fleet" \
  --region us-east-1

# Store JWT Secret
aws secretsmanager create-secret \
  --name fleet/jwt-secret \
  --secret-string "your_production_jwt_secret_min_32_chars" \
  --region us-east-1

# Store Refresh Token Secret
aws secretsmanager create-secret \
  --name fleet/refresh-secret \
  --secret-string "your_production_refresh_secret_min_32_chars" \
  --region us-east-1
```

### Step 5.4: Create CloudWatch Log Group

```bash
aws logs create-log-group \
  --log-group-name /ecs/fleet-backend \
  --region us-east-1
```

### Step 5.5: Register Task Definition

```bash
# Update task definition with your ECR URI and ARNs
aws ecs register-task-definition \
  --cli-input-json file://backend/ecs-task-definition.json
```

### Step 5.6: Create ECS Service

**Option A: Fargate (Recommended)**

```bash
# Create service with Fargate
aws ecs create-service \
  --cluster fleet-management-cluster \
  --service-name fleet-backend-service \
  --task-definition fleet-backend-task \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
  --region us-east-1
```

**Option B: EC2**

```bash
# Create service with EC2
aws ecs create-service \
  --cluster fleet-management-cluster \
  --service-name fleet-backend-service \
  --task-definition fleet-backend-task \
  --desired-count 1 \
  --launch-type EC2 \
  --region us-east-1
```

### Step 5.7: Create Application Load Balancer (Optional but Recommended)

1. **Create ALB in AWS Console:**
   - EC2 → Load Balancers → Create Load Balancer → Application Load Balancer
   - Name: `fleet-backend-alb`
   - Scheme: Internet-facing
   - VPC: Select your VPC
   - Subnets: Select at least 2 in different AZs

2. **Create Target Group:**
   - Target type: IP
   - Protocol: HTTP
   - Port: 5000
   - Health check path: `/api/health` (create this endpoint)

3. **Update ECS Service with Load Balancer:**

```bash
aws ecs update-service \
  --cluster fleet-management-cluster \
  --service fleet-backend-service \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:...,containerName=fleet-backend,containerPort=5000 \
  --region us-east-1
```

### Step 5.8: Get Backend URL

```bash
# Get service details
aws ecs describe-services \
  --cluster fleet-management-cluster \
  --services fleet-backend-service \
  --region us-east-1

# If using ALB, get ALB DNS:
aws elbv2 describe-load-balancers \
  --names fleet-backend-alb \
  --region us-east-1 --query 'LoadBalancers[0].DNSName' \
  --output text

# Your backend URL: http://fleet-backend-alb-123456789.us-east-1.elb.amazonaws.com
```

---

## 🌐 Phase 6: Frontend Deployment to S3

### Step 6.1: Configure Next.js for Static Export

Update `user-app/next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  },
  trailingSlash: true,
};

export default nextConfig;
```

### Step 6.2: Configure React Admin for Production

Update `admin-portal/.env.production`:

```env
VITE_API_BASE_URL=http://fleet-backend-alb-123456789.us-east-1.elb.amazonaws.com/api
```

### Step 6.3: Build Next.js User App

```bash
cd user-app

# Set backend API URL
export NEXT_PUBLIC_API_URL=http://fleet-backend-alb-123456789.us-east-1.elb.amazonaws.com/api

# Build for production
npm run build

# Output will be in 'out' directory
```

### Step 6.4: Build React Admin Portal

```bash
cd admin-portal

# Build for production
npm run build

# Output will be in 'dist' directory
```

### Step 6.5: Create S3 Buckets

```bash
# Create bucket for Next.js User App
aws s3 mb s3://fleet-user-app-prod --region us-east-1

# Create bucket for React Admin Portal
aws s3 mb s3://fleet-admin-portal-prod --region us-east-1

# Enable static website hosting for User App
aws s3 website s3://fleet-user-app-prod \
  --index-document index.html \
  --error-document 404.html

# Enable static website hosting for Admin Portal
aws s3 website s3://fleet-admin-portal-prod \
  --index-document index.html \
  --error-document index.html
```

### Step 6.6: Configure S3 Bucket Policies

**User App Bucket Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::fleet-user-app-prod/*"
    }
  ]
}
```

Apply policy:

```bash
aws s3api put-bucket-policy \
  --bucket fleet-user-app-prod \
  --policy file://user-app-bucket-policy.json
```

**Admin Portal Bucket Policy:** (Same structure, different bucket name)

### Step 6.7: Upload Frontend Files to S3

```bash
# Upload Next.js User App
aws s3 sync user-app/out s3://fleet-user-app-prod \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html" \
  --region us-east-1

# Upload HTML files separately (no cache)
aws s3 sync user-app/out s3://fleet-user-app-prod \
  --exclude "*" \
  --include "*.html" \
  --cache-control "public, max-age=0, must-revalidate" \
  --region us-east-1

# Upload React Admin Portal
aws s3 sync admin-portal/dist s3://fleet-admin-portal-prod \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html" \
  --region us-east-1

# Upload HTML files separately (no cache)
aws s3 sync admin-portal/dist s3://fleet-admin-portal-prod \
  --exclude "*" \
  --include "*.html" \
  --cache-control "public, max-age=0, must-revalidate" \
  --region us-east-1
```

### Step 6.8: Get S3 Website URLs

```bash
# User App URL
echo "User App: http://fleet-user-app-prod.s3-website-us-east-1.amazonaws.com"

# Admin Portal URL
echo "Admin Portal: http://fleet-admin-portal-prod.s3-website-us-east-1.amazonaws.com"
```

---

## 🔗 Phase 7: Connect Frontend to Backend

### Step 7.1: Update Backend CORS

Update `backend/src/index.ts`:

```typescript
const corsOptions = {
  origin: [
    'http://fleet-user-app-prod.s3-website-us-east-1.amazonaws.com',
    'http://fleet-admin-portal-prod.s3-website-us-east-1.amazonaws.com',
    'http://localhost:3000', // For local development
    'http://localhost:5173'  // For local admin development
  ],
  credentials: true
};

app.use(cors(corsOptions));
```

### Step 7.2: Rebuild and Redeploy Backend

```bash
# Commit changes
git add backend/src/index.ts
git commit -m "Update CORS for production frontends"
git push origin main

# GitHub Actions will build and push to ECR

# Update ECS service manually
aws ecs update-service \
  --cluster fleet-management-cluster \
  --service fleet-backend-service \
  --force-new-deployment \
  --region us-east-1
```

### Step 7.3: Test End-to-End Connectivity

```bash
# Test backend health
curl http://fleet-backend-alb-123456789.us-east-1.elb.amazonaws.com/api/health

# Test frontend can reach backend
# Open browser and navigate to S3 URLs
# Try to login and perform actions
```

---

## 📊 Phase 8: Update ECS Service (Manual Process)

### Step 8.1: When to Update

After GitHub Actions pushes a new image to ECR, manually update ECS:

```bash
# Force new deployment with latest image
aws ecs update-service \
  --cluster fleet-management-cluster \
  --service fleet-backend-service \
  --force-new-deployment \
  --region us-east-1

# Monitor deployment
aws ecs describe-services \
  --cluster fleet-management-cluster \
  --services fleet-backend-service \
  --region us-east-1 \
  --query 'services[0].deployments'
```

### Step 8.2: Rollback if Needed

```bash
# List task definitions
aws ecs list-task-definitions \
  --family-prefix fleet-backend-task \
  --region us-east-1

# Update to previous version
aws ecs update-service \
  --cluster fleet-management-cluster \
  --service fleet-backend-service \
  --task-definition fleet-backend-task:1 \
  --region us-east-1
```

---

## 🔍 Phase 9: Monitoring & Troubleshooting

### View ECS Logs

```bash
# View CloudWatch logs
aws logs tail /ecs/fleet-backend --follow --region us-east-1

# Or in AWS Console:
# CloudWatch → Log groups → /ecs/fleet-backend
```

### Check ECS Service Status

```bash
# Get service status
aws ecs describe-services \
  --cluster fleet-management-cluster \
  --services fleet-backend-service \
  --region us-east-1

# Get task ARN
aws ecs list-tasks \
  --cluster fleet-management-cluster \
  --service-name fleet-backend-service \
  --region us-east-1

# Describe task
aws ecs describe-tasks \
  --cluster fleet-management-cluster \
  --tasks <task-arn> \
  --region us-east-1
```

### Common Issues

**Issue 1: Task keeps stopping**
- Check CloudWatch logs for errors
- Verify environment variables and secrets
- Check MongoDB connection string
- Ensure proper IAM roles

**Issue 2: Frontend can't reach backend**
- Verify CORS settings
- Check ALB security group rules
- Ensure backend is running
- Check Network ACLs

**Issue 3: Redis connection fails**
- Redis should be on 127.0.0.1:6379 (localhost)
- Check docker-entrypoint.sh is executable
- View container logs

---

## 💰 Cost Optimization

### Estimated Monthly Costs

| Service | Configuration | Estimated Cost |
|---------|--------------|----------------|
| ECS Fargate | 0.5 vCPU, 1GB RAM | ~$15-20/month |
| ECR | <500MB images | ~$1/month |
| S3 | 2 buckets, <1GB | ~$0.50/month |
| CloudWatch Logs | 5GB/month | ~$2.50/month |
| ALB (optional) | 1 ALB | ~$16/month |
| **Total** | | **~$20-35/month** |

### Cost Saving Tips

1. **Use t3.micro for testing** (ECS EC2)
2. **Set up lifecycle policies** for ECR images
3. **Enable S3 intelligent tiering**
4. **Use CloudWatch log retention** (7-14 days)
5. **Stop ECS service when not in use** (dev/test)

```bash
# Stop ECS service
aws ecs update-service \
  --cluster fleet-management-cluster \
  --service fleet-backend-service \
  --desired-count 0 \
  --region us-east-1

# Start ECS service
aws ecs update-service \
  --cluster fleet-management-cluster \
  --service fleet-backend-service \
  --desired-count 1 \
  --region us-east-1
```

---

## 🔒 Security Checklist

- [ ] All secrets stored in AWS Secrets Manager
- [ ] IAM users follow least privilege principle
- [ ] Security groups properly configured (only port 5000 from ALB)
- [ ] S3 buckets have proper policies (public read for static assets only)
- [ ] MongoDB uses authentication and SSL
- [ ] JWT secrets are strong (32+ characters)
- [ ] CORS properly configured (specific origins)
- [ ] Environment variables not committed to Git
- [ ] ECR images scanned for vulnerabilities
- [ ] CloudWatch monitoring enabled

---

## 🚀 Quick Deployment Commands

### Initial Setup (One-time)

```bash
# 1. Create ECR repository
aws ecr create-repository --repository-name fleet-management-backend --region us-east-1

# 2. Create ECS cluster
aws ecs create-cluster --cluster-name fleet-management-cluster --region us-east-1

# 3. Create S3 buckets
aws s3 mb s3://fleet-user-app-prod
aws s3 mb s3://fleet-admin-portal-prod

# 4. Store secrets
aws secretsmanager create-secret --name fleet/mongodb-uri --secret-string "your-uri"
aws secretsmanager create-secret --name fleet/jwt-secret --secret-string "your-secret"
aws secretsmanager create-secret --name fleet/refresh-secret --secret-string "your-secret"

# 5. Register task definition
aws ecs register-task-definition --cli-input-json file://backend/ecs-task-definition.json

# 6. Create ECS service
aws ecs create-service --cluster fleet-management-cluster --service-name fleet-backend-service --task-definition fleet-backend-task --desired-count 1 --launch-type FARGATE
```

### Regular Deployment

```bash
# Backend: Automatically via GitHub Actions on push to main

# Frontend: Rebuild and upload
cd user-app && npm run build
aws s3 sync out s3://fleet-user-app-prod --delete

cd ../admin-portal && npm run build
aws s3 sync dist s3://fleet-admin-portal-prod --delete

# Update ECS service manually
aws ecs update-service --cluster fleet-management-cluster --service fleet-backend-service --force-new-deployment
```

---

## 📝 Environment URLs Summary

After deployment, save these URLs:

```
Backend API: http://fleet-backend-alb-XXXXXXXX.us-east-1.elb.amazonaws.com
User App:    http://fleet-user-app-prod.s3-website-us-east-1.amazonaws.com
Admin Portal: http://fleet-admin-portal-prod.s3-website-us-east-1.amazonaws.com
ECR Repo:    123456789012.dkr.ecr.us-east-1.amazonaws.com/fleet-management-backend
```

---

## ✅ Post-Deployment Verification

### Backend Health Check

```bash
curl http://your-alb-url.elb.amazonaws.com/api/health
# Expected: {"status": "ok"}
```

### Frontend Tests

1. Open User App URL
2. Try to sign up as customer
3. Try to login
4. Book a trip
5. Check dashboard

6. Open Admin Portal URL
7. Login as admin
8. View vehicles
9. View trips
10. Check analytics


