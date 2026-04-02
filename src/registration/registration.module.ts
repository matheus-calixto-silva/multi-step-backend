import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailModule } from '../providers/email/email.module';
import { Registration } from './entities/registration.entity';
import { MfaService } from './mfa/mfa.service';
import { AbandonmentTask } from './tasks/abandonment.task';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';

@Module({
  imports: [TypeOrmModule.forFeature([Registration]), EmailModule],
  controllers: [RegistrationController],
  providers: [RegistrationService, MfaService, AbandonmentTask],
})
export class RegistrationModule {}
