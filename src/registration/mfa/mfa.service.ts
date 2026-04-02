import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import {
  EMAIL_PROVIDER,
  EmailProvider,
} from '../../providers/email/email-provider.interface';
import {
  MFA_EMAIL_SUBJECT,
  mfaEmailHtml,
} from '../../providers/email/email-templates';
import { Registration } from '../entities/registration.entity';

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: EmailProvider,
    @InjectRepository(Registration)
    private readonly repo: Repository<Registration>,
  ) {}

  generateCode(): string {
    return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  }

  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  async sendMfa(registration: Registration): Promise<void> {
    if (!registration.email) {
      throw new BadRequestException('E-mail é obrigatório para envio de MFA');
    }
    const code = this.generateCode();
    registration.mfaCode = this.hashCode(code);
    registration.mfaCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.repo.save(registration);
    await this.emailProvider.send(
      registration.email,
      MFA_EMAIL_SUBJECT,
      mfaEmailHtml(code),
    );
    this.logger.log(`MFA enviado para registro ${registration.id}`);
  }

  async verifyMfa(registration: Registration, code: string): Promise<void> {
    if (!registration.mfaCode || !registration.mfaCodeExpiresAt) {
      throw new BadRequestException('Código MFA inválido ou não solicitado');
    }
    if (registration.mfaCodeExpiresAt < new Date()) {
      throw new BadRequestException('Código MFA expirado');
    }
    if (registration.mfaCode !== this.hashCode(code)) {
      throw new BadRequestException('Código MFA incorreto');
    }
    registration.mfaVerifiedAt = new Date();
    registration.mfaCode = null;
    registration.mfaCodeExpiresAt = null;
    await this.repo.save(registration);
    this.logger.log(`MFA verificado para registro ${registration.id}`);
  }
}
