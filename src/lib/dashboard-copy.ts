// src/lib/dashboard-copy.ts
// Brand-specific copy for dashboard and portal pages

import type { Brand } from '@/hooks/useBrandTheme';
import type { DomainStatus } from '@/types';

export interface DashboardCopy {
  // Status Messages
  statusSecure: string;
  statusActionNeeded: string;
  statusPending: string;
  statusError: string;
  
  // Verification Instructions
  verificationTitle: string;
  verificationInstructions: string;
  verificationReassurance: string;
  verificationButtonPrimary: string;
  verificationButtonHelp: string;
  helpWidgetMessage: string;
  
  // DNS Propagation
  dnsPropagationTitle: string;
  dnsPropagationReassurance: string;
  
  // Error Messages
  errorDomainNotFound: string;
  errorDNSFailed: string;
  errorGeneral: string;
}

export const AUTOCERTIFY_DASHBOARD_COPY: DashboardCopy = {
  // Status Messages
  statusSecure: 'Your Site is Secure.',
  statusActionNeeded: 'Action Needed: Please login to your domain registrar (like GoDaddy) and add this one record.',
  statusPending: '🟡 Action needed: one quick step',
  statusError: 'Action needed: We need your help to fix this',
  
  // Verification Instructions
  verificationTitle: 'Add one record to secure your site',
  verificationInstructions: 'Copy this record and paste it in your domain registrar (like GoDaddy, Namecheap, or Cloudflare). We\'ll guide you if you need help.',
  verificationReassurance: 'Add the record below. It\'s safe and reversible.',
  verificationButtonPrimary: 'Check Connection',
  verificationButtonHelp: 'I\'m stuck',
  helpWidgetMessage: 'AI Support: I see you use GoDaddy. Click here for a step-by-step guide on adding your CNAME record.',
  
  // DNS Propagation
  dnsPropagationTitle: 'Why is it taking a few minutes?',
  dnsPropagationReassurance: 'Changes can take a few minutes to show up. That\'s normal.',
  
  // Error Messages (non-blame)
  errorDomainNotFound: 'Hmm—can\'t find that domain. Try without https://',
  errorDNSFailed: 'No worries—DNS can take a few minutes. Try again.',
  errorGeneral: 'Something went wrong, but it\'s not your fault. Try again in a moment or chat with us.',
};

export const DCVAAS_DASHBOARD_COPY: DashboardCopy = {
  // Status Messages
  statusSecure: 'Active',
  statusActionNeeded: 'Pending CNAME',
  statusPending: 'Pending CNAME Verification',
  statusError: 'Error',
  
  // Verification Instructions
  verificationTitle: 'Configure DNS',
  verificationInstructions: 'Add the following CNAME record to your DNS provider to complete domain verification.',
  verificationReassurance: 'DNS propagation can take 5-15 minutes after adding the CNAME record.',
  verificationButtonPrimary: 'Check DNS Now',
  verificationButtonHelp: 'View Documentation',
  helpWidgetMessage: '',
  
  // DNS Propagation
  dnsPropagationTitle: 'DNS Propagation Tips',
  dnsPropagationReassurance: 'DNS propagation can take 5-15 minutes after adding the CNAME record.',
  
  // Error Messages
  errorDomainNotFound: 'Domain not found. Please check the domain name and try again.',
  errorDNSFailed: 'DNS verification failed. Please check your DNS configuration.',
  errorGeneral: 'An error occurred. Please try again.',
};

export function getDashboardCopy(brand: Brand): DashboardCopy {
  return brand === 'autocertify' ? AUTOCERTIFY_DASHBOARD_COPY : DCVAAS_DASHBOARD_COPY;
}

export function getStatusMessage(status: DomainStatus, brand: Brand): string {
  const copy = getDashboardCopy(brand);
  
  switch (status) {
    case 'active':
      return copy.statusSecure;
    case 'pending_cname':
      return copy.statusActionNeeded;
    case 'issuing':
      return copy.statusPending;
    case 'error':
      return copy.statusError;
    default:
      return status;
  }
}
