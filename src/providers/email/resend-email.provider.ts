import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { EmailProvider } from './email-provider.interface';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    this.resend = new Resend(configService.get<string>('RESEND_API_KEY'));
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    const from = this.configService.get<string>(
      'EMAIL_FROM',
      'onboarding@resend.dev',
    );
    let result: Awaited<ReturnType<typeof this.resend.emails.send>>;
    try {
      result = await this.resend.emails.send({ from, to, subject, html });
    } catch {
      throw new InternalServerErrorException('Falha ao enviar e-mail');
    }

    if (result.error) {
      throw new InternalServerErrorException(
        `Falha ao enviar e-mail: ${result.error.message}`,
      );
    }
  }
}
