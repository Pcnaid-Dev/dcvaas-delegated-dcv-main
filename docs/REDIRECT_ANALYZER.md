# Redirect Chain Analyzer Tool

## Overview

The Redirect Chain Analyzer is a public-facing tool that helps users understand how redirect chains can break HTTP-01 certificate validation. It analyzes any domain or URL, following all HTTP redirects and identifying scenarios that would cause validation failures.

## Purpose

Certificate Authorities use HTTP-01 validation to verify domain ownership by making an HTTP request to `http://<domain>/.well-known/acme-challenge/<token>`. However, many websites use redirects (e.g., apex to www, HTTP to HTTPS) that can break this validation process.

This tool:
1. **Educates users** about redirect-related validation failures
2. **Diagnoses issues** with their current redirect configuration
3. **Promotes DNS-01 validation** as a more reliable alternative
4. **Drives adoption** of DCVaaS as the solution

## Features

### Redirect Chain Detection
- Follows all HTTP redirects (status codes 300-399)
- Handles both relative and absolute redirect URLs
- Shows each hop with protocol, host, and status code
- Detects redirect loops (configurable max hops: 10 default, 50 max)

### Validation Break Identification
The tool identifies several scenarios that break HTTP-01 validation:

1. **Host Changes**: When redirects jump between different hosts
   - Example: `example.com` → `www.example.com`
   - Why it breaks: CA only tries the exact domain, doesn't follow redirects to different hosts

2. **Cross-Domain Redirects**: Redirects to completely different domains
   - Example: `old-domain.com` → `new-domain.com`
   - Why it breaks: Validation challenge is for the original domain only

3. **Redirect Loops**: Circular redirect patterns
   - Example: URL A → URL B → URL A
   - Why it breaks: Validation times out

4. **Network Errors**: DNS failures, connection timeouts, etc.
   - Why it breaks: CA cannot reach the validation endpoint

### User Experience

#### Input Form
- Accepts domain name (e.g., `example.com`) or full URL (e.g., `https://example.com`)
- Real-time validation feedback
- Enter key support for quick analysis

#### Results Display

**Summary Card**
- Color-coded status (red for errors, yellow for warnings, green for success)
- Key metrics: total redirects, host changes, protocol changes
- Input and final URL comparison

**Redirect Chain Visualization**
- Hop-by-hop breakdown with status codes
- Visual indicators for each redirect type
- Protocol and host information for each hop
- Error messages for failed hops

**Validation Breaks Section** (if any)
- Detailed explanation of each issue
- Clear indication of why it breaks validation
- Contextual information to help understand the problem

**Warnings Section** (if any)
- Less critical issues that may cause problems
- Educational information about common patterns

**Recommendation CTA**
- Personalized based on analysis results
- Strong call-to-action promoting DCVaaS DNS-01 method
- Links to get started or learn more

#### Educational Content

**How It Works**
- 3-step process explanation
- Visual numbered cards
- Simple, non-technical language

**HTTP-01 vs DNS-01 Comparison**
- Side-by-side comparison table
- Clear advantages of DNS-01
- Limitations of HTTP-01 highlighted

## Technical Implementation

### Frontend

**Component**: `src/pages/RedirectAnalyzerPage.tsx`

```typescript
// Main page component
export function RedirectAnalyzerPage({ onNavigate }: RedirectAnalyzerPageProps)

// Individual hop display
function RedirectHopCard({ hop, isFirst, isLast, hopNumber })
```

**State Management**:
- `input`: User's domain/URL input
- `analysis`: Full redirect analysis results
- `isAnalyzing`: Loading state during API call

**UI Components Used**:
- `Card` - Container components
- `Input` - Domain/URL input field
- `Button` - Analyze button and CTAs
- Phosphor Icons - Visual indicators (Warning, CheckCircle, Globe, etc.)
- Toast notifications - User feedback (via Sonner)

### Backend

**Library**: `workers/api/src/lib/redirect-analyzer.ts`

```typescript
// Main analysis function
export async function analyzeRedirectChain(input: string): Promise<RedirectAnalysis>

// Helper: Follow redirect chain
async function followRedirects(startUrl: string, maxHops: number = 10): Promise<RedirectHop[]>

// Helpers: URL parsing
function normalizeUrl(input: string): string
function getHost(url: string): string
function getProtocol(url: string): string
```

**Key Logic**:
1. Normalize input (add protocol if missing)
2. Follow redirects using HEAD requests with `redirect: 'manual'`
3. Build hop array with details for each redirect
4. Analyze hops for validation breaks
5. Generate warnings and recommendations

**API Endpoint**: `POST /api/analyze-redirects`

```typescript
// Request
{
  "input": "example.com"
}

// Response
{
  "analysis": {
    "inputUrl": "example.com",
    "normalizedInput": "http://example.com",
    "hops": [
      {
        "url": "http://example.com",
        "statusCode": 301,
        "location": "https://www.example.com",
        "protocol": "http",
        "host": "example.com"
      },
      {
        "url": "https://www.example.com",
        "statusCode": 200,
        "protocol": "https",
        "host": "www.example.com"
      }
    ],
    "finalUrl": "https://www.example.com",
    "totalHops": 2,
    "hasHostChange": true,
    "hasProtocolChange": true,
    "validationBreaks": [
      "Host changed from example.com to www.example.com at hop 2. HTTP-01 validation will fail because the validation request won't follow this redirect."
    ],
    "warnings": [
      "Redirects from HTTP to HTTPS at hop 2. This is safe for HTTP-01 if the host remains the same."
    ],
    "recommendation": "⚠️ **Use DCVaaS DNS-01 Method**: Your redirect chain will break HTTP-01 validation..."
  }
}
```

### Data Flow

1. User enters domain/URL in frontend
2. Frontend validates input (non-empty)
3. API call to `/api/analyze-redirects`
4. Backend normalizes input and follows redirects
5. Backend analyzes chain for validation breaks
6. Results returned to frontend
7. Frontend displays results with color-coding
8. User sees recommendation and CTA

## Configuration

### Backend Configuration

**Max Hops**: Default 10, configurable up to 50
- Prevents infinite redirect loops
- Validated on each call
- Throws error if outside bounds

**Request Timeout**: Managed by Cloudflare Workers
- Default worker timeout: 30 seconds (CPU time)
- Each fetch has standard browser timeout

**User Agent**: `DCVaaS-RedirectAnalyzer/1.0`
- Identifies tool in server logs
- Helps with debugging issues

### CORS Configuration

The endpoint is public and requires CORS to be configured:

```typescript
// In workers/api/src/index.ts
const CORS_ALLOW_ORIGINS = env.CORS_ALLOW_ORIGINS || '*';
```

Set `CORS_ALLOW_ORIGINS` environment variable to restrict origins if needed.

## Security Considerations

### Input Validation
- Frontend: Non-empty validation
- Backend: URL format validation
- maxHops parameter bounded (1-50)

### No Authentication Required
- Public tool by design
- No sensitive data exposed
- No user data stored
- Rate limiting handled by Cloudflare

### Type Safety
- TypeScript throughout
- Proper error handling with `unknown` type
- No `any` types in error paths

### Resource Protection
- Bounded redirect following (max 50 hops)
- HEAD requests (no body download)
- Manual redirect mode (no auto-follow)
- Worker timeout protection

## Testing

### Manual Testing

Test with these example domains:

1. **No redirects**: `https://github.com` (200 OK)
2. **HTTP to HTTPS**: `http://github.com` → `https://github.com`
3. **Apex to www**: `http://example.com` → `http://www.example.com`
4. **Multiple redirects**: `http://bit.ly/...` (URL shortener)

### Automated Testing

See `/tmp/test-redirect-analyzer.js` for unit tests of core logic.

Run tests:
```bash
node /tmp/test-redirect-analyzer.js
```

Expected output: All tests pass

## Deployment

### Prerequisites
- Cloudflare Workers account
- wrangler CLI installed
- API worker configured with CORS

### Deploy Steps

1. **Deploy API Worker**:
   ```bash
   cd workers/api
   npx wrangler deploy
   ```

2. **Verify Endpoint**:
   ```bash
   curl -X POST https://dcv.pcnaid.com/api/analyze-redirects \
     -H "Content-Type: application/json" \
     -d '{"input": "example.com"}'
   ```

3. **Update Frontend Config** (if needed):
   - Ensure `VITE_API_BASE_URL` points to deployed worker
   - Default: `https://dcv.pcnaid.com`

4. **Deploy Frontend**:
   ```bash
   npm run build
   npx wrangler deploy
   ```

### Verification

1. Navigate to deployed frontend
2. Click "Tools" in navigation
3. Enter test domain (e.g., `github.com`)
4. Verify results display correctly
5. Check that CTA buttons work

## Future Enhancements

Potential improvements for future versions:

1. **GET Request Support**: Option to use GET instead of HEAD for more accurate simulation
2. **Caching**: Cache results for common domains (24 hour TTL)
3. **Batch Analysis**: Analyze multiple domains at once
4. **Export Results**: Download analysis as JSON or PDF
5. **Historical Tracking**: Store and display changes over time
6. **SSL/TLS Details**: Show certificate info for each hop
7. **Performance Metrics**: Show response times for each hop
8. **DNS Resolution**: Show DNS resolution details
9. **Redirect Recommendations**: Suggest fixes for common issues
10. **API Rate Limiting**: Implement rate limiting per IP

## Troubleshooting

### Common Issues

**"Failed to analyze redirects"**
- Check network connectivity
- Verify API worker is deployed
- Check CORS configuration
- Look at browser console for details

**"Redirect loop detected" for valid sites**
- May be actual redirect loop
- Check maxHops setting (default 10)
- Try with different protocol (http vs https)

**Empty results or missing hops**
- Site may block HEAD requests
- Firewall may block requests
- Check worker logs for errors

### Debug Mode

Enable debug logging in browser console:
```javascript
localStorage.setItem('DEBUG', 'redirect-analyzer');
```

Check API worker logs:
```bash
npx wrangler tail --env production
```

## Related Documentation

- [DCVaaS Architecture](./ARCHITECTURE.md)
- [Security Guidelines](./SECURITY.md)
- [API Documentation](./API.md)
- [Contributing Guide](../CONTRIBUTING.md)

## Support

For issues or questions:
- Open GitHub issue
- Email: support@dcvaas.io
- Documentation: https://dcvaas.io/docs
