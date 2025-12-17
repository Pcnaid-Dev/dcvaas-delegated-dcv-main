#!/bin/bash
# Setup script for configuring secrets across all DCVaaS workers
# Usage: ./scripts/setup-secrets.sh

set -e

echo "=================================="
echo "DCVaaS Secret Configuration Setup"
echo "=================================="
echo ""
echo "This script will help you configure secrets for all workers."
echo "You'll need:"
echo "  - Cloudflare API Token (with SSL for SaaS permissions)"
echo "  - Resend API Key (from resend.com)"
echo ""
read -p "Press Enter to continue..."

# Get secrets from user
echo ""
echo "Please enter your secrets:"
echo ""

read -sp "Cloudflare API Token: " CLOUDFLARE_API_TOKEN
echo ""

read -sp "Resend API Key: " RESEND_API_KEY
echo ""

echo ""
echo "Setting secrets for API worker..."
cd workers/api
echo "$CLOUDFLARE_API_TOKEN" | wrangler secret put CLOUDFLARE_API_TOKEN
echo "$RESEND_API_KEY" | wrangler secret put RESEND_API_KEY

echo ""
echo "Setting secrets for Consumer worker..."
cd ../consumer
echo "$CLOUDFLARE_API_TOKEN" | wrangler secret put CLOUDFLARE_API_TOKEN
echo "$RESEND_API_KEY" | wrangler secret put RESEND_API_KEY

echo ""
echo "Note: DLQ worker doesn't need secrets (it only queues jobs)"

cd ../..

echo ""
echo "=================================="
echo "✅ All secrets configured successfully!"
echo "=================================="
echo ""
echo "Next steps:"
echo "  1. Deploy workers: npm run deploy"
echo "  2. Verify domain in Resend dashboard"
echo "  3. Test email notifications"
echo ""
