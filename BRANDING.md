# Multi-Brand Architecture

## Overview

DCVaaS now supports domain-based multi-brand theming, allowing the same codebase to present different brand experiences based on the hostname. The first implementation is **AutoCertify** (autocertify.net) - a merchant-focused SSL security brand.

## Brand Detection

The system automatically detects which brand to display based on the current hostname:

- `autocertify.net` → AutoCertify brand (merchant/small business focus)
- Default → DCVaaS brand (enterprise/developer focus)

Brand detection happens in `src/lib/brands.ts` via the `detectBrand()` function.

## Architecture

### Core Components

1. **Brand Configuration** (`src/lib/brands.ts`)
   - Defines all brand configurations
   - Each brand includes:
     - Visual theme (colors, fonts, radius)
     - Hero copy (headline, subheadline, CTA)
     - Pricing configuration
     - Dashboard UI text
     - SEO keywords
     - Target persona and brand voice

2. **Brand Context** (`src/contexts/BrandContext.tsx`)
   - Makes brand configuration available throughout the app
   - Detects brand once on mount
   - Provides `useBrand()` hook for components

3. **Theme Provider** (`src/components/ThemeProvider.tsx`)
   - Applies brand-specific CSS variables
   - Sets custom colors based on brand configuration
   - Respects org-level brand color overrides

### Brand Configuration Structure

```typescript
type BrandConfig = {
  id: string;
  name: string;
  domain: string;
  targetPersona: string;
  valueProposition: string;
  brandVoice: string;
  theme: {
    fontSans: string;
    fontMono: string;
    colorPrimary: string;
    colorAccent: string;
    colorSuccess: string;
    colorWarning: string;
    colorDanger: string;
    radius: string;
  };
  hero: {
    headline: string;
    subheadline: string;
    cta: string;
  };
  pricing: {
    planName: string;
    price: string;
    period: string;
    description: string;
    features: string[];
  };
  dashboard: {
    secureStatus: string;
    actionNeeded: string;
    checkConnection: string;
  };
  keywords: {
    primary: string[];
    secondary: string[];
  };
};
```

## AutoCertify Brand Specifications

### Target Audience
- Small business owners
- Merchants
- Non-technical founders
- "Panic buyers" who need to fix "Not Secure" warnings

### Brand Voice
- Trust-oriented
- Calming and reassuring
- Simple language (no jargon)
- Urgency without overwhelming
- Step-by-step guidance

### Visual Theme
- Primary Color: `#2563EB` (blue)
- Accent Color: `#22C55E` (green - for success/secure states)
- Border Radius: `10px` (slightly more rounded than DCVaaS)

### Key Messaging

**Hero Section:**
- Headline: "Fix the 'Not Secure' Warning on Your Website Instantly"
- Subheadline: "Don't lose customers to a security error. Get the Green Padlock in less than 5 minutes. No coding required."
- CTA: "Secure My Site Now"

**Features:**
- "Losing Sales?" - Emphasizes the urgency
- "Zero Downtime" - Reassures no disruption
- "Works with Everything" - WordPress, ClickFunnels, etc.

**Status Messages:**
- Active: "Secure" (vs DCVaaS "Active")
- Pending: "Setup Required" (vs DCVaaS "Pending CNAME")
- Issuing: "Securing..." (vs DCVaaS "Issuing")
- Error: "Needs Attention" (vs DCVaaS "Error")

**Dashboard Copy:**
- Success: "Your Site is Secure"
- Action Needed: "Action Needed: Please login to your domain registrar (like GoDaddy) and add this one record"
- Check Button: "Check Connection" (vs DCVaaS "Check DNS Now")

### Pricing
- Single plan: **Business Pro** - $15/month
- Features highlight simplicity and 24/7 monitoring
- No technical jargon

## Branded Components

### Components Using Brand Context

1. **LandingPage** (`src/pages/LandingPage.tsx`)
   - Brand name in header and footer
   - Hero section uses brand configuration
   - Features section has brand-specific content
   - FAQ has merchant-focused questions
   - 3-step setup for AutoCertify vs 4-step for DCVaaS

2. **PricingPage** (`src/pages/PricingPage.tsx`)
   - Brand name in header
   - Single plan layout for AutoCertify
   - Brand-specific pricing from configuration

3. **StatusBadge** (`src/components/StatusBadge.tsx`)
   - Plain-English status labels for AutoCertify
   - Technical labels for DCVaaS

4. **DomainDetailPage** (`src/pages/DomainDetailPage.tsx`)
   - Simplified setup instructions for AutoCertify
   - Plain-English guidance and help text
   - Brand-specific toast notifications
   - "Check Connection" vs "Check DNS Now"

5. **ThemeProvider** (`src/components/ThemeProvider.tsx`)
   - Applies brand theme colors via CSS variables
   - Sets font families, colors, and border radius

## Adding a New Brand

To add a new brand:

1. **Define brand configuration** in `src/lib/brands.ts`:
   ```typescript
   const NEW_BRAND: BrandConfig = {
     id: 'newbrand',
     name: 'NewBrand',
     domain: 'newbrand.com',
     // ... complete all required fields
   };
   ```

2. **Add to brand registry**:
   ```typescript
   const BRANDS: BrandConfig[] = [
     DEFAULT_BRAND,
     AUTOCERTIFY_BRAND,
     NEW_BRAND, // Add here
   ];
   ```

3. **Test brand detection**:
   - Visit `newbrand.com` (or configure hosts file for local testing)
   - Verify brand configuration loads correctly
   - Check all branded pages for correct content

4. **Customize components** (if needed):
   - Use `useBrand()` hook in components
   - Check `brand.id === 'newbrand'` for brand-specific behavior
   - Follow existing patterns in LandingPage, PricingPage, etc.

## CSS Variables

Brand-specific CSS variables are applied to `:root`:

```css
--brand-font-sans: [brand font]
--brand-font-mono: [brand mono font]
--brand-color-primary: [brand primary color]
--brand-color-accent: [brand accent color]
--brand-color-success: [brand success color]
--brand-color-warning: [brand warning color]
--brand-color-danger: [brand danger color]
--brand-radius: [brand border radius]
--primary-color: [used by legacy components]
```

## Best Practices

1. **Keep backend unchanged**: Branding is UI-only. Backend logic remains the same.

2. **Maintain consistent structure**: Core features and functionality should be available across all brands.

3. **Use brand context everywhere**: Always use `useBrand()` hook rather than hardcoding brand checks.

4. **Plain English for AutoCertify**: Avoid technical terms like "ACME", "DNS-01", "CNAME propagation", etc.

5. **Default to DCVaaS**: When in doubt, maintain DCVaaS behavior as the default.

6. **Test both brands**: Always test changes on both DCVaaS and AutoCertify brands.

## Local Testing

To test AutoCertify brand locally:

1. **Add to hosts file**:
   ```
   127.0.0.1 autocertify.net
   ```

2. **Start dev server**:
   ```bash
   npm run dev
   ```

3. **Visit**: `http://autocertify.net:5173`

The brand detection will recognize the hostname and apply AutoCertify branding.

## SEO Considerations

Each brand has its own keyword strategy:

**AutoCertify Keywords:**
- Primary: "fix not secure site", "auto renew ssl", "secure my website"
- Secondary: "ssl certificate for website", "https site not secure", "wordpress ssl plugin", "buy ssl certificate"

**DCVaaS Keywords:**
- Primary: "ssl automation", "certificate management", "dns-01 validation"
- Secondary: "wildcard certificates", "acme protocol", "zero-touch renewals"

These keywords should guide meta tags, content strategy, and on-page SEO.

## Future Enhancements

Potential improvements:

1. **Custom domain support**: Allow brands to use completely custom domains
2. **Logo uploads**: Support custom logo images per brand
3. **Email templates**: Brand-specific transactional email templates
4. **Help content**: Brand-specific help articles and documentation
5. **Analytics**: Track metrics per brand separately
6. **A/B testing**: Test different brand messaging variants

## Troubleshooting

### Brand not detected
- Check hostname in browser
- Verify brand domain in `src/lib/brands.ts`
- Clear browser cache
- Check console for errors

### Incorrect styling
- Check CSS variables in DevTools
- Verify ThemeProvider is wrapping the app
- Look for hardcoded colors that should use CSS variables

### Wrong content displayed
- Verify `useBrand()` hook usage in component
- Check conditional logic (e.g., `isAutoCertify`)
- Ensure BrandProvider is in app hierarchy

## Support

For questions or issues with the branding system:
1. Check this documentation
2. Review existing brand implementations (AutoCertify)
3. Look at PRD.md for design specifications
4. Contact the development team
