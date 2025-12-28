// src/lib/pem-parser.ts
// Utility functions to parse PEM-encoded certificates and CSRs

export type CertificateInfo = {
  type: 'certificate';
  subject: Record<string, string>;
  issuer: Record<string, string>;
  sans: string[];
  keyType: string;
  keySize: number | null;
  signatureAlgorithm: string;
  validity: {
    notBefore: Date;
    notAfter: Date;
  };
  serialNumber: string;
};

export type CSRInfo = {
  type: 'csr';
  subject: Record<string, string>;
  sans: string[];
  keyType: string;
  keySize: number | null;
  signatureAlgorithm: string;
};

export type PEMInfo = CertificateInfo | CSRInfo;

// Parse a base64-encoded ASN.1 structure (simplified)
function parseBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Extract OIDs and values from ASN.1 DER (very simplified)
// This is a basic parser - for production, use a proper ASN.1 library
function parseDistinguishedName(bytes: Uint8Array, offset: number): { dn: Record<string, string>; nextOffset: number } {
  const dn: Record<string, string> = {};
  
  // OID mappings
  const oidMap: Record<string, string> = {
    '2.5.4.3': 'CN',
    '2.5.4.6': 'C',
    '2.5.4.7': 'L',
    '2.5.4.8': 'ST',
    '2.5.4.10': 'O',
    '2.5.4.11': 'OU',
  };

  // This is a simplified parser that won't work for all certificates
  // In production, use a proper ASN.1/X.509 library
  try {
    // Try to extract common name at minimum
    const str = new TextDecoder().decode(bytes.slice(offset, offset + 200));
    const cnMatch = str.match(/[\x00-\x1f]([a-zA-Z0-9\-\._*]+\.[a-zA-Z]{2,})/);
    if (cnMatch) {
      dn.CN = cnMatch[1];
    }
  } catch (e) {
    // Ignore parsing errors
  }

  return { dn, nextOffset: offset + 100 };
}

function extractSANs(bytes: Uint8Array): string[] {
  const sans: string[] = [];
  
  try {
    // Look for DNS names in the SAN extension
    // This is a simplified approach
    const str = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    
    // Match DNS names (simplified pattern)
    const dnsPattern = /[\x82][\x00-\xff]([a-zA-Z0-9\-\._*]+\.[a-zA-Z]{2,})/g;
    let match;
    while ((match = dnsPattern.exec(str)) !== null) {
      if (match[1] && !sans.includes(match[1])) {
        sans.push(match[1]);
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }

  return sans;
}

function detectKeyType(bytes: Uint8Array): { keyType: string; keySize: number | null } {
  const str = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  
  // RSA detection
  if (str.includes('\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01')) {
    // Try to detect key size from modulus length
    // This is approximate
    if (bytes.length > 500) {
      return { keyType: 'RSA', keySize: 4096 };
    } else if (bytes.length > 300) {
      return { keyType: 'RSA', keySize: 2048 };
    } else {
      return { keyType: 'RSA', keySize: 1024 };
    }
  }
  
  // ECDSA detection
  if (str.includes('\x06\x07\x2a\x86\x48\xce\x3d\x02\x01')) {
    if (str.includes('\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07')) {
      return { keyType: 'ECDSA', keySize: 256 };
    } else if (str.includes('\x06\x05\x2b\x81\x04\x00\x22')) {
      return { keyType: 'ECDSA', keySize: 384 };
    } else if (str.includes('\x06\x05\x2b\x81\x04\x00\x23')) {
      return { keyType: 'ECDSA', keySize: 521 };
    }
    return { keyType: 'ECDSA', keySize: null };
  }
  
  // Ed25519 detection
  if (str.includes('\x06\x03\x2b\x65\x70')) {
    return { keyType: 'Ed25519', keySize: 256 };
  }
  
  return { keyType: 'Unknown', keySize: null };
}

function detectSignatureAlgorithm(bytes: Uint8Array): string {
  const str = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  
  // SHA256 with RSA
  if (str.includes('\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x0b')) {
    return 'SHA256-RSA';
  }
  
  // SHA384 with RSA
  if (str.includes('\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x0c')) {
    return 'SHA384-RSA';
  }
  
  // SHA512 with RSA
  if (str.includes('\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x0d')) {
    return 'SHA512-RSA';
  }
  
  // ECDSA with SHA256
  if (str.includes('\x06\x08\x2a\x86\x48\xce\x3d\x04\x03\x02')) {
    return 'ECDSA-SHA256';
  }
  
  // ECDSA with SHA384
  if (str.includes('\x06\x08\x2a\x86\x48\xce\x3d\x04\x03\x03')) {
    return 'ECDSA-SHA384';
  }
  
  // ECDSA with SHA512
  if (str.includes('\x06\x08\x2a\x86\x48\xce\x3d\x04\x03\x04')) {
    return 'ECDSA-SHA512';
  }
  
  return 'Unknown';
}

function extractDates(bytes: Uint8Array): { notBefore: Date; notAfter: Date } | null {
  try {
    // Look for UTCTime or GeneralizedTime patterns in the certificate
    // This is a simplified approach
    const str = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    
    // Pattern for dates in certificates (very approximate)
    // Look for sequences that might be dates
    const datePattern = /(\d{12,14}Z)/g;
    const matches = str.match(datePattern);
    
    if (matches && matches.length >= 2) {
      // Parse dates (YYMMDDHHMMSSZ or YYYYMMDDHHMMSSZ format)
      const parseDate = (dateStr: string): Date => {
        if (dateStr.length === 13) {
          // YYMMDDHHmmssZ
          const year = parseInt(dateStr.substring(0, 2));
          const fullYear = year < 50 ? 2000 + year : 1900 + year;
          return new Date(Date.UTC(
            fullYear,
            parseInt(dateStr.substring(2, 4)) - 1,
            parseInt(dateStr.substring(4, 6)),
            parseInt(dateStr.substring(6, 8)),
            parseInt(dateStr.substring(8, 10)),
            parseInt(dateStr.substring(10, 12))
          ));
        } else {
          // YYYYMMDDHHmmssZ
          return new Date(Date.UTC(
            parseInt(dateStr.substring(0, 4)),
            parseInt(dateStr.substring(4, 6)) - 1,
            parseInt(dateStr.substring(6, 8)),
            parseInt(dateStr.substring(8, 10)),
            parseInt(dateStr.substring(10, 12)),
            parseInt(dateStr.substring(12, 14))
          ));
        }
      };
      
      return {
        notBefore: parseDate(matches[0]),
        notAfter: parseDate(matches[1]),
      };
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return null;
}

/**
 * Parse a PEM-encoded certificate or CSR
 * This is a simplified parser that extracts basic information
 * For production use, consider using a proper X.509 parsing library
 */
export function parsePEM(pem: string): PEMInfo {
  // Clean up the PEM string
  const cleanPem = pem.trim();
  
  // Detect type
  const isCertificate = cleanPem.includes('BEGIN CERTIFICATE');
  const isCSR = cleanPem.includes('BEGIN CERTIFICATE REQUEST') || cleanPem.includes('BEGIN NEW CERTIFICATE REQUEST');
  
  if (!isCertificate && !isCSR) {
    throw new Error('Invalid PEM format. Expected a certificate or CSR.');
  }
  
  // Extract base64 content
  const lines = cleanPem.split('\n');
  const base64Lines = lines.filter(line => 
    !line.includes('BEGIN') && 
    !line.includes('END') && 
    line.trim().length > 0
  );
  const base64 = base64Lines.join('');
  
  if (!base64) {
    throw new Error('No base64 content found in PEM');
  }
  
  // Parse base64 to bytes
  const bytes = parseBase64(base64);
  
  // Extract information
  const { dn: subject } = parseDistinguishedName(bytes, 0);
  const sans = extractSANs(bytes);
  const { keyType, keySize } = detectKeyType(bytes);
  const signatureAlgorithm = detectSignatureAlgorithm(bytes);
  
  if (isCertificate) {
    const { dn: issuer } = parseDistinguishedName(bytes, 50);
    const validity = extractDates(bytes);
    
    // Try to extract serial number (simplified)
    let serialNumber = 'Unknown';
    try {
      const serialMatch = bytes.slice(0, 100).indexOf(0x02);
      if (serialMatch > 0) {
        const serialBytes = bytes.slice(serialMatch + 2, serialMatch + 10);
        serialNumber = Array.from(serialBytes)
          .map(b => b.toString(16).padStart(2, '0'))
          .join(':');
      }
    } catch (e) {
      // Ignore
    }
    
    return {
      type: 'certificate',
      subject,
      issuer,
      sans,
      keyType,
      keySize,
      signatureAlgorithm,
      validity: validity || {
        notBefore: new Date(),
        notAfter: new Date(),
      },
      serialNumber,
    };
  } else {
    return {
      type: 'csr',
      subject,
      sans,
      keyType,
      keySize,
      signatureAlgorithm,
    };
  }
}

/**
 * Validate if a string is a valid PEM format
 */
export function isValidPEM(pem: string): boolean {
  const hasCertificateMarkers = 
    pem.includes('-----BEGIN CERTIFICATE-----') && 
    pem.includes('-----END CERTIFICATE-----');
  
  const hasCSRMarkers = 
    (pem.includes('-----BEGIN CERTIFICATE REQUEST-----') && 
     pem.includes('-----END CERTIFICATE REQUEST-----')) ||
    (pem.includes('-----BEGIN NEW CERTIFICATE REQUEST-----') && 
     pem.includes('-----END NEW CERTIFICATE REQUEST-----'));
  
  return hasCertificateMarkers || hasCSRMarkers;
}
