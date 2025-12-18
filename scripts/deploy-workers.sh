#!/bin/bash
# Deploy all DCVaaS workers
# Usage: ./scripts/deploy-workers.sh

set -e

echo "=================================="
echo "DCVaaS Worker Deployment"
echo "=================================="
echo ""

# Deploy API Worker
echo "📦 Deploying API worker..."
cd workers/api
npx wrangler deploy
echo "✅ API worker deployed"
echo ""

# Deploy Consumer Worker
echo "📦 Deploying Consumer worker..."
cd ../consumer
npx wrangler deploy
echo "✅ Consumer worker deployed"
echo ""

# Deploy Cron Worker
echo "📦 Deploying Cron worker..."
cd ../cron
npx wrangler deploy
echo "✅ Cron worker deployed"
echo ""

# Deploy DLQ Worker
echo "📦 Deploying DLQ worker..."
cd ../dlq
npx wrangler deploy
echo "✅ DLQ worker deployed"
echo ""

cd ../..

echo "=================================="
echo "✅ All workers deployed successfully!"
echo "=================================="
echo ""
echo "Workers deployed:"
echo "  - dcvaas-api: Handles API requests"
echo "  - dcvaas-consumer: Processes background jobs"
echo "  - dcvaas-cron: Runs scheduled tasks"
echo "  - dcvaas-dlq: Handles failed jobs"
echo ""
