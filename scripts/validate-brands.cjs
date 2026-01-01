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
};

// Validation rules
const rules = [
  {
    name: 'AutoCertify: No TerminalWindow in WizardLayout',
    file: 'wizardLayout',
    shouldNotContain: ['TerminalWindow', '<Terminal'],
    severity: 'error'
  },
  {
    name: 'LandingPage: Conditional TerminalWindow rendering',
    file: 'landingPage',
    shouldContain: ["brand.brandId === 'keylessssl.dev'", 'TerminalWindow'],
    severity: 'error'
  },
  {
    name: 'KeylessSSL: Dark mode enforced',
    file: 'keylessLayout',
    shouldContain: ['bg-[#0d1117]', 'font-mono'],
    severity: 'error'
  },
  {
    name: 'AgencyLayout: Deep navigation',
    file: 'agencyLayout',
    shouldContain: ['Clients', 'Brand Kits', 'Audit Log'],
    severity: 'error'
  },
  {
    name: 'LandingPage: Brand-specific CTAs',
    file: 'landingPage',
    shouldContain: ['Secure My Site Now', 'Start Your Agency Trial', 'Get Started Free'],
    severity: 'error'
  },
  {
    name: 'LandingPage: No "3 free domains" for AutoCertify',
    file: 'landingPage',
    shouldContain: ["brand.brandId === 'keylessssl.dev'", '3 free domains'],
    severity: 'error'
  }
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
console.log('=' .repeat(60));

let totalTests = 0;
let passedTests = 0;
let errors = [];

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
    result.messages.forEach(msg => console.log(`   ${msg}`));
    console.log('');
    errors.push({ rule: rule.name, messages: result.messages });
  }
}

console.log('=' .repeat(60));
console.log(`\nResults: ${passedTests}/${totalTests} tests passed\n`);

if (errors.length > 0) {
  console.log('⚠️  Failed validations:');
  errors.forEach(err => {
    console.log(`\n  • ${err.rule}`);
    if (err.messages) {
      err.messages.forEach(msg => console.log(`    - ${msg}`));
    }
  });
  console.log('');
  process.exit(1);
}

console.log('✨ All validations passed!\n');
process.exit(0);
