export interface JobMessage {
  id: string;
  type: 'sync_status' | 'dns_check';
  domain_id: string;
  attempts: number;
}
