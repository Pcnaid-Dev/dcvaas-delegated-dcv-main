#!/bin/bash
# Setup script for configuring secrets across all DCVaaS workers
# Usage: ./scripts/setup-secrets.sh

set -e

# Disable bash history to prevent secrets from being logged
set +o history

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
echo "Please enter your secrets (input hidden):"
echo ""

read -sp "Cloudflare API Token: " CLOUDFLARE_API_TOKEN
echo ""

# Validate Cloudflare API Token format (should be at least 32 chars)
if [ ${#CLOUDFLARE_API_TOKEN} -lt 32 ]; then
  echo "Error: Cloudflare API Token seems too short. Please check and try again."
  exit 1
fi

read -sp "Resend API Key: " RESEND_API_KEY
echo ""

# Validate Resend API Key format (should start with re_)
if [[ ! "$RESEND_API_KEY" =~ ^re_ ]]; then
  echo "Warning: Resend API Key should start with 're_'. Please verify your key."
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

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

# Re-enable bash history
set -o history

echo ""
echo "=================================="
echo "✅ All secrets configured successfully!"
echo "=================================="
echo ""
echo "Next steps:"
echo "  1. Deploy workers: ./scripts/deploy-workers.sh"
echo "  2. Verify domain in Resend dashboard"
echo "  3. Test email notifications"
echo ""
