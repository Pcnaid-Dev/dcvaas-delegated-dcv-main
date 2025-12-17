import type { Env } from '../env';
import type { SendEmailJob } from '../lib/types';
import { Resend } from 'resend';

/**
 * Handler for sending emails via Resend
 */
export async function handleSendEmail(job: SendEmailJob, env: Env): Promise<void> {
  const resend = new Resend(env.RESEND_API_KEY);
  const { emailParams } = job;
  
  const from = emailParams.from || 'DCVaaS <noreply@pcnaid.com>';
  
  try {
    const response = await resend.emails.send({
      from,
      to: emailParams.to,
      subject: emailParams.subject,
      html: emailParams.html,
    });
    
    console.log('Email sent successfully:', {
      id: job.id,
      to: emailParams.to,
      subject: emailParams.subject,
      resendId: response.data?.id,
    });
  } catch (error) {
    console.error('Failed to send email:', {
      id: job.id,
      to: emailParams.to,
      subject: emailParams.subject,
      error,
    });
    throw error;
  }
}
