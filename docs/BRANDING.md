# DelegatedSSL Branding Guide

This document explains how the multi-brand system works in DCVaaS and how to add new brands or customize the DelegatedSSL brand.

## Brand Detection

The brand detection system automatically sets the appropriate brand theme based on the hostname:

- `delegatedssl.com` → DelegatedSSL brand
- `www.delegatedssl.com` → DelegatedSSL brand
- All other domains → DCVaaS brand (default)

### Development Testing

To test the DelegatedSSL brand during local development, add a query parameter:

```
http://localhost:5173/?brand=delegatedssl.com
```

## Theme System

### File Structure

```
src/
├── lib/
│   └── brand.ts                    # Brand detection logic
├── hooks/
│   └── useBrand.ts                 # React hook for brand config
└── styles/
    └── brands/
        └── delegatedssl.css        # DelegatedSSL theme tokens
```

### Brand Detection (src/lib/brand.ts)

The `initializeBrand()` function runs before the app renders and sets `data-brand` attribute on the document root:

```typescript
import { initializeBrand } from './lib/brand';

initializeBrand(); // Sets document.documentElement.dataset.brand
```

### Using Brand Config in Components

Use the `useBrand()` hook to access brand-specific configuration:

```typescript
import { useBrand, getBrandConfig } from '@/hooks/useBrand';

function MyComponent() {
  const brand = useBrand();
  const config = getBrandConfig(brand);
  
  return (
    <div>
      <h1>{config.tagline}</h1>
      <Button>{config.primaryCTA}</Button>
    </div>
  );
}
```

## DelegatedSSL Brand Tokens

### Color Tokens

The DelegatedSSL brand uses the following color system:

**Primary (Trust Blue)**
- `--color-primary-500`: #2563EB
- `--color-primary-600`: #1D4ED8 (hover)
- `--color-primary-700`: #1E40AF

**Secondary/Accent (Teal)** - Use sparingly, never for "success"
- `--color-accent-500`: #14B8A6
- `--color-accent-600`: #0F766E
- `--color-accent-700`: #115E59

**Status Colors (Traffic Light System)**
- Success (Green): `--color-success-600` (#16A34A)
- Warning (Amber): `--color-warning-600` (#F59E0B)
- Danger (Red): `--color-danger-600` (#DC2626)
- Neutral (Gray): `--color-neutral-600` (#64748B)

Each status has a corresponding background:
- `--color-success-bg`, `--color-warning-bg`, `--color-danger-bg`, `--color-neutral-bg`

### Typography

**Fonts**
- UI Font: `--font-sans` (Inter)
- Marketing Font: `--font-sans-alt` (Manrope, with Inter fallback)
- Code Font: `--font-mono` (System monospace)

**Font Sizes** (Marketing)
- H1: 48–56px / line-height 1.05
- H2: 32–36px / line-height 1.15
- H3: 20–24px / line-height 1.2

### Spacing

8pt spacing system with 4px micro-step:
- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 24px
- `--space-6`: 32px
- `--space-7`: 48px
- `--space-8`: 64px

### Border Radius

- `--radius-sm`: 10px
- `--radius-md`: 12px
- `--radius-lg`: 14px
- `--radius-pill`: 999px (for badges)

### Shadows

Dashboard stays flatter; marketing can use more depth:
- `--shadow-xs`: 0 1px 1px rgba(15, 23, 42, 0.04)
- `--shadow-sm`: 0 2px 6px rgba(15, 23, 42, 0.08)
- `--shadow-md`: 0 8px 24px rgba(15, 23, 42, 0.14)
- `--shadow-lg`: 0 16px 48px rgba(15, 23, 42, 0.18)

### Component Tokens

**Buttons**
- `--btn-height-sm`: 32px (dense/table action)
- `--btn-height-md`: 40px (default)
- `--btn-height-lg`: 44px (marketing CTA)

**Tables**
- `--table-row-hover-bg`: rgba(37, 99, 235, 0.04)
- `--table-row-selected-bg`: rgba(37, 99, 235, 0.08)

**Focus Rings** (A11y)
- `--focus-ring`: 0 0 0 3px rgba(37, 99, 235, 0.35)
- `--focus-ring-danger`: 0 0 0 3px rgba(220, 38, 38, 0.25)

## Status Badge System

The `StatusBadge` component implements the traffic-light system with:
- **Dot indicator** (1.5px colored dot)
- **Icon** (Phosphor Icons)
- **Label** (status text)
- **Tooltip** (detailed explanation on hover/focus)

### Status Mapping

- `pending_cname` → "Action Needed" (Yellow) - "Client DNS verification pending"
- `issuing` → "Pending" (Neutral) - "Provisioning in progress"
- `active` → "Active" (Green) - "Auto-renewing"
- `error` → "Blocked" (Red) - "CAA policy prevents issuance"

## Brand Voice & Copy

### DelegatedSSL Voice

- **Target persona**: Digital Agencies, MSPs, Website-as-a-Service teams
- **Tone**: Authoritative, operational, margin-focused
- **Style**: "Agency ops dashboard" - calm control, minimal fluff
- **Positioning**: White-label "set-it-and-forget-it" SSL console

### Key Phrases

- Primary CTA: "Start Your Agency Trial"
- Secondary CTA: "Schedule a Demo"
- Hero: "The Set-and-Forget SSL Dashboard for Agencies"
- Trust line: "No credit card. 10-minute setup. Cancel anytime."
- All Green motif: "All Green = All Good"

### Core Claims

1. **Stop Certificate Sprawl** - Single dashboard for all DNS providers
2. **Protect Your Margins** - Flat-rate pricing vs per-domain overages
3. **100% White Label** - Clients see your brand, not ours

## Adding a New Brand

To add a new brand:

1. **Create brand CSS file**: `src/styles/brands/yourbrand.css`
   ```css
   :root[data-brand="yourbrand.com"] {
     --color-primary-500: #your-color;
     /* ... define all tokens ... */
   }
   ```

2. **Import CSS in main.tsx**:
   ```typescript
   import './styles/brands/yourbrand.css';
   ```

3. **Add hostname mapping** in `src/lib/brand.ts`:
   ```typescript
   const brandMap: Record<string, string> = {
     'yourbrand.com': 'yourbrand.com',
     'delegatedssl.com': 'delegatedssl.com',
   };
   ```

4. **Add brand config** in `src/hooks/useBrand.ts`:
   ```typescript
   export const BRAND_CONFIG = {
     yourbrand: {
       name: 'YourBrand',
       tagline: 'Your tagline here',
       // ... other config ...
     },
   };
   ```

## Accessibility

The DelegatedSSL brand requires:

- ✅ Visible focus rings on all interactive elements
- ✅ WCAG-friendly contrast ratios (all colors tested)
- ✅ Keyboard navigation support
- ✅ Status indicators never rely on color alone (dot + icon + label + tooltip)
- ✅ Tooltips are keyboard-accessible

## Testing Checklist

- [ ] Build succeeds (`npm run build`)
- [ ] Brand detection works (`?brand=delegatedssl.com` in dev)
- [ ] Status badges show correctly with tooltips
- [ ] Focus rings visible on tab navigation
- [ ] Color contrast meets WCAG AA standards
- [ ] Copy buttons show confirmation toast
- [ ] Theme tokens apply to all components
- [ ] Dark mode works (if implemented)
- [ ] Mobile responsive
