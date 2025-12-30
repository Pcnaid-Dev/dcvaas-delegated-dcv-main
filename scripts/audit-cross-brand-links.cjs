#!/usr/bin/env node
/**
 * Cross-Brand Link Audit Script
 * 
 * Scans marketing pages for cross-brand links and ensures compliance
 * with the "max 1 cross-brand link per page" SEO safety requirement.
 * 
 * Usage: node scripts/audit-cross-brand-links.js
 */

const fs = require('fs');
const path = require('path');

// Brand hostnames
const BRANDS = {
  autocertify: {
    marketing: 'autocertify.net',
    app: 'wizard.autocertify.net',
  },
  delegatedssl: {
    marketing: 'delegatedssl.com',
    app: 'portal.delegatedssl.com',
  },
  keylessssl: {
    marketing: 'keylessssl.dev',
    app: 'app.keylessssl.dev',
  },
};

const ALL_BRAND_HOSTS = Object.values(BRANDS).flatMap(b => [b.marketing, b.app]);

// Marketing page files to audit
const PAGES_TO_AUDIT = [
  'src/pages/LandingPage.tsx',
  'src/pages/PricingPage.tsx',
  'src/pages/DocsPage.tsx',
];

/**
 * Extract hardcoded URLs from file content
 */
function extractHardcodedUrls(content) {
  const urls = [];
  
  // Match URLs in strings: "https://domain.com" or 'https://domain.com'
  const urlRegex = /(['"`])https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(\/[^'"`]*)?(['"`])/g;
  let match;
  
  while ((match = urlRegex.exec(content)) !== null) {
    const url = `${match[2]}${match[3] || ''}`;
    urls.push(url);
  }
  
  return urls;
}

/**
 * Check if URL belongs to a different brand
 */
function isCrossBrandLink(url, currentBrandHosts) {
  // Check if URL is from ANY brand
  const urlHost = url.split('/')[0];
  const isBrandHost = ALL_BRAND_HOSTS.some(host => urlHost.includes(host));
  
  if (!isBrandHost) {
    return false; // Not a brand URL at all (external link, ok)
  }
  
  // Check if it's from a DIFFERENT brand
  const isCurrentBrand = currentBrandHosts.some(host => urlHost.includes(host));
  return !isCurrentBrand;
}

/**
 * Audit a single file
 */
function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const urls = extractHardcodedUrls(content);
  
  const violations = [];
  
  // For each brand, check for cross-brand links
  for (const [brandName, hosts] of Object.entries(BRANDS)) {
    const brandHosts = [hosts.marketing, hosts.app];
    const crossBrandLinks = urls.filter(url => isCrossBrandLink(url, brandHosts));
    
    if (crossBrandLinks.length > 0) {
      violations.push({
        brand: brandName,
        count: crossBrandLinks.length,
        links: crossBrandLinks,
      });
    }
  }
  
  return {
    file: filePath,
    hardcodedUrls: urls,
    violations,
  };
}

/**
 * Main audit function
 */
function runAudit() {
  console.log('🔍 Cross-Brand Link Audit\n');
  console.log('Scanning marketing pages for hardcoded cross-brand URLs...\n');
  
  let totalViolations = 0;
  const results = [];
  
  for (const pagePath of PAGES_TO_AUDIT) {
    const fullPath = path.join(process.cwd(), pagePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${pagePath}`);
      continue;
    }
    
    const result = auditFile(fullPath);
    results.push(result);
    
    console.log(`📄 ${pagePath}`);
    
    if (result.hardcodedUrls.length === 0) {
      console.log('  ✅ No hardcoded URLs found (uses brand context)');
    } else {
      console.log(`  ℹ️  Found ${result.hardcodedUrls.length} hardcoded URL(s):`);
      result.hardcodedUrls.forEach(url => {
        console.log(`     - ${url}`);
      });
    }
    
    if (result.violations.length === 0) {
      console.log('  ✅ No cross-brand link violations');
    } else {
      result.violations.forEach(v => {
        console.log(`  ❌ VIOLATION for ${v.brand}: ${v.count} cross-brand link(s)`);
        v.links.forEach(link => {
          console.log(`     - ${link}`);
        });
        totalViolations += v.count;
      });
    }
    
    console.log('');
  }
  
  console.log('─'.repeat(60));
  console.log('📊 Audit Summary\n');
  
  if (totalViolations === 0) {
    console.log('✅ PASSED: No cross-brand link violations found!');
    console.log('All pages use brand context for URLs (brand.appHost, brand.marketingHost)');
    process.exit(0);
  } else {
    console.log(`❌ FAILED: Found ${totalViolations} cross-brand link violation(s)`);
    console.log('\nRecommendation: Replace hardcoded URLs with brand context variables:');
    console.log('  - brand.marketingHost');
    console.log('  - brand.appHost');
    console.log('  - useBrand() hook in React components');
    process.exit(1);
  }
}

// Run audit
runAudit();
