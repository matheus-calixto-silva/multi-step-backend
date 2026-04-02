import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Not, Repository } from 'typeorm';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { UpdateIdentificationDto } from './dto/update-identification.dto';
import { Registration, RegistrationStep } from './entities/registration.entity';
import { MfaService } from './mfa/mfa.service';

const STEP_ORDER: RegistrationStep[] = [
  RegistrationStep.IDENTIFICATION,
  RegistrationStep.DOCUMENT,
  RegistrationStep.CONTACT,
  RegistrationStep.ADDRESS,
  RegistrationStep.REVIEW,
];

const MFA_REQUIRED_STEPS: RegistrationStep[] = [
  RegistrationStep.DOCUMENT,
  RegistrationStep.CONTACT,
  RegistrationStep.ADDRESS,
  RegistrationStep.REVIEW,
];

function getNextStep(current: RegistrationStep): RegistrationStep {
  const index = STEP_ORDER.indexOf(current);
  const next = STEP_ORDER[index + 1];
  if (!next) {
    // REVIEW não deve chamar getNextStep — a transição para COMPLETED
    // ocorre exclusivamente via complete(), que também seta completedAt.
    throw new InternalServerErrorException(
      `getNextStep chamado para step sem próximo: ${current}`,
    );
  }
  return next;
}

export interface UpdateStepResult {
  registration: Registration;
  mfaEmailFailed: boolean;
}

@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    @InjectRepository(Registration)
    private readonly repo: Repository<Registration>,
    private readonly mfaService: MfaService,
  ) {}

  async create(): Promise<{ id: string }> {
    const registration = await this.repo.save(this.repo.create());
    this.logger.log(`Registro criado: ${registration.id}`);
    return { id: registration.id };
  }

  async findOne(id: string): Promise<Registration> {
    const registration = await this.repo.findOneBy({ id });
    if (!registration) {
      throw new NotFoundException(`Cadastro ${id} não encontrado`);
    }
    return registration;
  }

  async updateStep(
    id: string,
    step: RegistrationStep,
    body: Record<string, unknown>,
  ): Promise<UpdateStepResult> {
    const registration = await this.findOne(id);

    const isCurrentStep = registration.currentStep === step;
    const isReviewEdit =
      !isCurrentStep &&
      registration.currentStep === RegistrationStep.REVIEW &&
      STEP_ORDER.includes(step);

    if (!isCurrentStep && !isReviewEdit) {
      throw new BadRequestException(
        `Step inválido: esperado ${registration.currentStep}, recebido ${step}`,
      );
    }

    if (MFA_REQUIRED_STEPS.includes(step) && !registration.mfaVerifiedAt) {
      throw new ForbiddenException('MFA não verificado');
    }

    if (step === RegistrationStep.IDENTIFICATION) {
      await this.validateDto(UpdateIdentificationDto, body);
      const dto = plainToInstance(UpdateIdentificationDto, body);
      const normalizedEmail = dto.email.toLowerCase();
      await this.assertNoDuplicate(
        'email',
        normalizedEmail,
        id,
        'E-mail já cadastrado em outro registro ativo',
      );
      registration.name = dto.name;
      registration.email = normalizedEmail;
    } else if (step === RegistrationStep.DOCUMENT) {
      await this.validateDto(UpdateDocumentDto, body);
      const dto = plainToInstance(UpdateDocumentDto, body);
      await this.assertNoDuplicate(
        'document',
        dto.document,
        id,
        'Documento já cadastrado em outro registro ativo',
      );
      registration.documentType = dto.documentType;
      registration.document = dto.document;
    } else if (step === RegistrationStep.CONTACT) {
      await this.validateDto(UpdateContactDto, body);
      const dto = plainToInstance(UpdateContactDto, body);
      await this.assertNoDuplicate(
        'phone',
        dto.phone,
        id,
        'Telefone já cadastrado em outro registro ativo',
      );
      registration.phone = dto.phone;
    } else if (step === RegistrationStep.ADDRESS) {
      await this.validateDto(UpdateAddressDto, body);
      const dto = plainToInstance(UpdateAddressDto, body);
      registration.cep = dto.cep;
      registration.street = dto.street;
      registration.number = dto.number;
      registration.complement = dto.complement ?? null;
      registration.neighborhood = dto.neighborhood;
      registration.city = dto.city;
      registration.state = dto.state;
    } else if (step === RegistrationStep.REVIEW) {
      // REVIEW não recebe dados nem avança o step.
      // A conclusão ocorre exclusivamente via POST /complete.
      return { registration, mfaEmailFailed: false };
    }

    if (!isReviewEdit) {
      registration.currentStep = getNextStep(step);
    }
    const saved = await this.repo.save(registration);
    this.logger.log(`Registro ${id}: step ${step} → ${saved.currentStep}`);

    let mfaEmailFailed = false;
    if (step === RegistrationStep.IDENTIFICATION && !isReviewEdit) {
      try {
        await this.mfaService.sendMfa(saved);
      } catch {
        mfaEmailFailed = true;
        this.logger.warn(`Falha ao enviar MFA para registro ${id}`);
      }
    }

    return { registration: saved, mfaEmailFailed };
  }

  async complete(id: string): Promise<Registration> {
    const registration = await this.findOne(id);

    if (registration.currentStep === RegistrationStep.COMPLETED) {
      throw new ConflictException('Cadastro já foi concluído');
    }

    if (registration.currentStep !== RegistrationStep.REVIEW) {
      throw new BadRequestException(
        'Só é possível concluir quando o currentStep for REVIEW',
      );
    }

    registration.completedAt = new Date();
    registration.currentStep = RegistrationStep.COMPLETED;
    const saved = await this.repo.save(registration);
    this.logger.log(`Registro ${id} concluído`);
    return saved;
  }

  async recoverByEmail(email: string): Promise<Registration> {
    const normalized = email.toLowerCase().trim();
    const registration = await this.repo.findOne({
      where: {
        email: normalized,
        currentStep: Not(RegistrationStep.COMPLETED),
      },
    });

    if (!registration) {
      throw new NotFoundException(
        `Nenhum cadastro em andamento encontrado para ${email}`,
      );
    }

    return registration;
  }

  async resendMfa(id: string): Promise<void> {
    const registration = await this.findOne(id);
    if (registration.mfaVerifiedAt) {
      throw new BadRequestException('MFA já verificado');
    }
    if (!registration.email) {
      throw new BadRequestException('E-mail não cadastrado');
    }
    await this.mfaService.sendMfa(registration);
  }

  async verifyMfa(id: string, code: string): Promise<Registration> {
    const registration = await this.findOne(id);
    await this.mfaService.verifyMfa(registration, code);
    return this.findOne(id);
  }

  private async assertNoDuplicate(
    field: keyof Registration,
    value: string,
    currentId: string,
    errorMessage: string,
  ): Promise<void> {
    const existing = await this.repo.findOne({
      where: { [field]: value },
    });
    if (existing && existing.id !== currentId) {
      throw new ConflictException(errorMessage);
    }
  }

  private async validateDto<T extends object>(
    DtoClass: new () => T,
    body: Record<string, unknown>,
  ): Promise<void> {
    const instance = plainToInstance(DtoClass, body);
    const errors = await validate(instance as object);
    if (errors.length > 0) {
      const messages = errors.flatMap((e) =>
        Object.values(e.constraints ?? {}),
      );
      throw new BadRequestException(messages);
    }
  }
}
