import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RecoverQueryDto } from './dto/recover-query.dto';
import { RegistrationResponseDto } from './dto/registration-response.dto';
import { Registration, RegistrationStep } from './entities/registration.entity';
import { VerifyMfaDto } from './mfa/verify-mfa.dto';
import { RegistrationService } from './registration.service';

@ApiTags('registrations')
@UseInterceptors(ClassSerializerInterceptor)
@Controller('registrations')
export class RegistrationController {
  constructor(private readonly service: RegistrationService) {}

  @Post()
  @ApiResponse({
    status: 201,
    schema: { properties: { id: { type: 'string', format: 'uuid' } } },
  })
  create(): Promise<{ id: string }> {
    return this.service.create();
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Get('recover')
  @ApiResponse({ status: 200, type: RegistrationResponseDto })
  recover(
    @Query(new ValidationPipe({ transform: true })) query: RecoverQueryDto,
  ): Promise<Registration> {
    return this.service.recoverByEmail(query.email);
  }

  @Get(':id')
  @ApiResponse({ status: 200, type: RegistrationResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Registration> {
    return this.service.findOne(id);
  }

  @Patch(':id/steps/:step')
  @ApiResponse({ status: 200, type: RegistrationResponseDto })
  async updateStep(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('step', new ParseEnumPipe(RegistrationStep)) step: RegistrationStep,
    @Body() body: Record<string, unknown>,
  ): Promise<Registration | { requiresMfa: true; mfaEmailWarning?: string }> {
    const result = await this.service.updateStep(id, step, body);
    if (step === RegistrationStep.IDENTIFICATION) {
      return {
        requiresMfa: true,
        ...(result.mfaEmailFailed && {
          mfaEmailWarning:
            'Não foi possível enviar o código MFA. Use o endpoint resend-mfa para reenviar.',
        }),
      };
    }
    return result.registration;
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: RegistrationResponseDto })
  complete(@Param('id', ParseUUIDPipe) id: string): Promise<Registration> {
    return this.service.complete(id);
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post(':id/verify-mfa')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200, type: RegistrationResponseDto })
  verifyMfa(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: VerifyMfaDto,
  ): Promise<Registration> {
    return this.service.verifyMfa(id, body.code);
  }

  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @Post(':id/resend-mfa')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendMfa(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.service.resendMfa(id);
  }
}
