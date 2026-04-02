export interface EmailProvider {
  send(to: string, subject: string, html: string): Promise<void>;
}

export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';
