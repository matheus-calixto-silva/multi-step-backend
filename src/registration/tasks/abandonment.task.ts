import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Not, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Registration } from '../entities/registration.entity';
import { RegistrationStep } from '../entities/registration.enums';
import {
  EMAIL_PROVIDER,
  EmailProvider,
} from '../../providers/email/email-provider.interface';
import {
  ABANDONMENT_EMAIL_SUBJECT,
  abandonmentEmailHtml,
} from '../../providers/email/email-templates';

@Injectable()
export class AbandonmentTask {
  private readonly logger = new Logger(AbandonmentTask.name);

  constructor(
    @InjectRepository(Registration)
    private readonly repo: Repository<Registration>,
    @Inject(EMAIL_PROVIDER) private readonly emailProvider: EmailProvider,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleAbandonment(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const abandoned = await this.repo.find({
      where: {
        currentStep: Not(RegistrationStep.COMPLETED),
        updatedAt: LessThan(oneHourAgo),
        abandonmentEmailSentAt: IsNull(),
        email: Not(IsNull()),
      },
    });

    this.logger.log(
      `Cron abandono: ${abandoned.length} registro(s) encontrado(s)`,
    );

    const frontendUrl = this.config.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );

    for (const registration of abandoned) {
      try {
        await this.emailProvider.send(
          registration.email!, // garantido pelo where: email IS NOT NULL
          ABANDONMENT_EMAIL_SUBJECT,
          abandonmentEmailHtml(registration.id, frontendUrl),
        );
        registration.abandonmentEmailSentAt = new Date();
        await this.repo.save(registration);
        this.logger.log(`E-mail de abandono enviado: ${registration.email}`);
      } catch (err) {
        this.logger.error(
          `Falha ao enviar e-mail para ${registration.email}`,
          err,
        );
      }
    }
  }
}
