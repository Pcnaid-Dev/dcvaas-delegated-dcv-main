#!/usr/bin/env node
/**
 * Multi-Brand Validation Script
 * Validates that brand-specific components are properly isolated
 */

const fs = require('fs');
const path = require('path');

// Root directory is the parent of scripts directory
const rootDir = path.resolve(__dirname, '..');

// File paths to validate
const files = {
  landingPage: path.join(rootDir, 'src', 'pages', 'LandingPage.tsx'),
  wizardLayout: path.join(rootDir, 'src', 'components', 'layouts', 'WizardLayout.tsx'),
  keylessLayout: path.join(rootDir, 'src', 'components', 'layouts', 'KeylessLayout.tsx'),
  agencyLayout: path.join(rootDir, 'src', 'components', 'layouts', 'AgencyLayout.tsx'),
  keylessMicrocopy: path.join(rootDir, 'keylessssl', 'microcopy.json'),
};

// Validation rules
const rules = [
  {
    name: 'AutoCertify: No TerminalWindow in WizardLayout',
    file: 'wizardLayout',
    shouldNotContain: ['TerminalWindow', '<Terminal'],
    severity: 'error',
  },
  {
    name: 'KeylessSSL: Dark mode enforced',
    file: 'keylessLayout',
    shouldContain: ['bg-[#0d1117]', 'font-mono'],
    severity: 'error',
  },
  {
    name: 'AgencyLayout: Deep navigation with Billing',
    file: 'agencyLayout',
    shouldContain: ['Clients', 'Brand Kits', 'Audit Log', 'Billing'],
    severity: 'error',
  },
  {
    name: 'AgencyLayout: Navigation has onClick handlers',
    file: 'agencyLayout',
    shouldContain: ['onClick={() => handleNavigation', 'handleNavigation(\'billing\')'],
    severity: 'error',
  },
  {
    name: 'LandingPage: Brand-specific CTAs from microcopy',
    file: 'landingPage',
    shouldContain: ['microcopy.cta_banner_button'],
    severity: 'error',
  },
  {
    name: 'LandingPage: No "3 free domains" for AutoCertify',
    file: 'landingPage',
    shouldContain: ["brand.brandId === 'keylessssl.dev'", '3 free domains'],
    severity: 'error',
  },
  {
    name: 'KeylessSSL: Hero shows RFC diagram (not TerminalWindow in hero)',
    file: 'landingPage',
    shouldContain: ['RFCArchitectureDiagram'],
    shouldNotContain: ["keylessssl.dev' && (\n                <div className=\"mx-auto max-w-4xl transform scale-100 hover:scale-105 transition-transform duration-500 shadow-2xl rounded-lg overflow-hidden\">\n                  <TerminalWindow"],
    severity: 'error',
  },
  {
    name: 'KeylessSSL: CTA button text is correct',
    file: 'keylessMicrocopy',
    shouldContain: ['"cta_banner_button": "Get API Key — Free for 3 Domains"'],
    severity: 'error',
  },
  {
    name: 'KeylessSSL: Hero pricing line present',
    file: 'keylessMicrocopy',
    shouldContain: ['"hero_pricing_line"', 'Free: 3 domains'],
    severity: 'error',
  },
];

function validateFile(filePath, rule) {
  const content = fs.readFileSync(filePath, 'utf8');
  const results = { passed: true, messages: [] };

  if (rule.shouldContain) {
    for (const text of rule.shouldContain) {
      if (!content.includes(text)) {
        results.passed = false;
        results.messages.push(`Missing expected text: "${text}"`);
      }
    }
  }

  if (rule.shouldNotContain) {
    for (const text of rule.shouldNotContain) {
      if (content.includes(text)) {
        results.passed = false;
        results.messages.push(`Found forbidden text: "${text}"`);
      }
    }
  }

  return results;
}

// Run validations
console.log('\n🔍 Multi-Brand Validation\n');
console.log('='.repeat(60));

let totalTests = 0;
let passedTests = 0;
const errors = [];

for (const rule of rules) {
  totalTests++;
  const filePath = files[rule.file];
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ [${rule.name}]`);
    console.log(`   File not found: ${filePath}\n`);
    errors.push({ rule: rule.name, error: 'File not found' });
    continue;
  }

  const result = validateFile(filePath, rule);
  
  if (result.passed) {
    console.log(`✅ [${rule.name}]`);
    passedTests++;
  } else {
    console.log(`❌ [${rule.name}]`);
    result.messages.forEach((msg) => console.log(`   ${msg}`));
    console.log('');
    errors.push({ rule: rule.name, messages: result.messages });
  }
}

console.log('='.repeat(60));
console.log(`\nResults: ${passedTests}/${totalTests} tests passed\n`);

if (errors.length > 0) {
  console.log('⚠️  Failed validations:');
  errors.forEach((err) => {
    console.log(`\n  • ${err.rule}`);
    if (err.messages) {
      err.messages.forEach((msg) => console.log(`    - ${msg}`));
    }
  });
  console.log('');
  process.exit(1);
}

console.log('✨ All validations passed!\n');
process.exit(0);
