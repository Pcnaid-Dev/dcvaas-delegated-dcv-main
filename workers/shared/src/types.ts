// Shared types for Cloudflare API responses
// Used across API, Consumer, and Cron workers

export interface CustomHostname {
  id: string;
  hostname: string;
  status: string;
  ssl: {
    status: string;
    method: string;
    type: string;
    expires_on?: string;
    validation_errors?: { message: string }[];
    // Information needed for TXT verification if CNAME isn't used immediately
    ownership_verification?: {
        name: string;
        value: string;
        type: string; 
    };
  };
}
