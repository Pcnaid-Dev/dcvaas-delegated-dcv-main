export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export interface BaseJobMessage {
  id: string;
  attempts: number;
}

export interface SyncStatusJob extends BaseJobMessage {
  type: 'sync_status';
  domain_id: string;
}

export interface SendEmailJob extends BaseJobMessage {
  type: 'send_email';
  emailParams: SendEmailParams;
}

export type JobMessage = SyncStatusJob | SendEmailJob;
