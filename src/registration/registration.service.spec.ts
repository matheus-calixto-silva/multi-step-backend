import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Registration, RegistrationStep } from './entities/registration.entity';
import { MfaService } from './mfa/mfa.service';
import { RegistrationService } from './registration.service';

const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOneBy: jest.fn(),
  findOne: jest.fn(),
});

const mockMfaService = () => ({
  sendMfa: jest.fn(),
  verifyMfa: jest.fn(),
});

describe('RegistrationService', () => {
  let service: RegistrationService;
  let repo: jest.Mocked<
    Pick<Repository<Registration>, 'create' | 'save' | 'findOneBy' | 'findOne'>
  >;
  let mfaService: { sendMfa: jest.Mock; verifyMfa: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        { provide: getRepositoryToken(Registration), useFactory: mockRepo },
        { provide: MfaService, useFactory: mockMfaService },
      ],
    }).compile();

    service = module.get<RegistrationService>(RegistrationService);
    repo = module.get(getRepositoryToken(Registration));
    mfaService = module.get(MfaService) as unknown as typeof mfaService;
  });

  describe('create', () => {
    it('should return an id with currentStep IDENTIFICATION', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.IDENTIFICATION,
      } as Registration;
      repo.create.mockReturnValue(reg);
      repo.save.mockResolvedValue(reg);

      const result = await service.create();

      expect(result).toEqual({ id: 'uuid-1' });
    });
  });

  describe('findOne', () => {
    it('should return a registration when found', async () => {
      const reg = { id: 'uuid-1' } as Registration;
      repo.findOneBy.mockResolvedValue(reg);

      const result = await service.findOne('uuid-1');

      expect(result).toBe(reg);
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.findOne('uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStep', () => {
    it('should advance step after IDENTIFICATION and call sendMfa', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.IDENTIFICATION,
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);
      repo.save.mockResolvedValue({
        ...reg,
        currentStep: RegistrationStep.DOCUMENT,
      });
      mfaService.sendMfa.mockResolvedValue(undefined);

      const result = await service.updateStep(
        'uuid-1',
        RegistrationStep.IDENTIFICATION,
        { name: 'João Silva', email: 'joao@email.com' },
      );

      expect(result.registration.currentStep).toBe(RegistrationStep.DOCUMENT);
      expect(result.mfaEmailFailed).toBe(false);
      expect(mfaService.sendMfa).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'uuid-1' }),
      );
    });

    it('should set mfaEmailFailed=true when sendMfa throws', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.IDENTIFICATION,
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);
      repo.save.mockResolvedValue({
        ...reg,
        currentStep: RegistrationStep.DOCUMENT,
      });
      mfaService.sendMfa.mockRejectedValue(new Error('SMTP failure'));

      const result = await service.updateStep(
        'uuid-1',
        RegistrationStep.IDENTIFICATION,
        { name: 'João Silva', email: 'joao@email.com' },
      );

      expect(result.mfaEmailFailed).toBe(true);
    });

    it('should throw ForbiddenException on DOCUMENT step when mfaVerifiedAt is null', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.DOCUMENT,
        mfaVerifiedAt: null,
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);

      await expect(
        service.updateStep('uuid-1', RegistrationStep.DOCUMENT, {
          documentType: 'CPF',
          document: '52998224725',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow DOCUMENT step when mfaVerifiedAt is set', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.DOCUMENT,
        mfaVerifiedAt: new Date(),
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);
      repo.save.mockResolvedValue({
        ...reg,
        currentStep: RegistrationStep.CONTACT,
      });

      const result = await service.updateStep(
        'uuid-1',
        RegistrationStep.DOCUMENT,
        {
          documentType: 'CPF',
          document: '52998224725',
        },
      );

      expect(result.registration.currentStep).toBe(RegistrationStep.CONTACT);
    });

    it('should throw BadRequestException when step does not match currentStep', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.IDENTIFICATION,
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);

      await expect(
        service.updateStep('uuid-1', RegistrationStep.DOCUMENT, {
          documentType: 'CPF',
          document: '52998224725',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should check email uniqueness against all registrations including completed', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.IDENTIFICATION,
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);
      repo.findOne.mockResolvedValue(null);
      repo.save.mockResolvedValue({
        ...reg,
        currentStep: RegistrationStep.DOCUMENT,
      });
      mfaService.sendMfa.mockResolvedValue(undefined);

      await service.updateStep('uuid-1', RegistrationStep.IDENTIFICATION, {
        name: 'João Silva',
        email: 'joao@email.com',
      });

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { email: 'joao@email.com' },
      });
    });

    it('should check document uniqueness against all registrations including completed', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.DOCUMENT,
        mfaVerifiedAt: new Date(),
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);
      repo.findOne.mockResolvedValue(null);
      repo.save.mockResolvedValue({
        ...reg,
        currentStep: RegistrationStep.CONTACT,
      });

      await service.updateStep('uuid-1', RegistrationStep.DOCUMENT, {
        documentType: 'CPF',
        document: '52998224725',
      });

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { document: '52998224725' },
      });
    });

    it('should check phone uniqueness against all registrations including completed', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.CONTACT,
        mfaVerifiedAt: new Date(),
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);
      repo.findOne.mockResolvedValue(null);
      repo.save.mockResolvedValue({
        ...reg,
        currentStep: RegistrationStep.ADDRESS,
      });

      await service.updateStep('uuid-1', RegistrationStep.CONTACT, {
        phone: '11987654321',
      });

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { phone: '11987654321' },
      });
    });

    it('should throw ConflictException when email already exists in another active registration', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.IDENTIFICATION,
      } as Registration;
      const duplicate = {
        id: 'uuid-other',
        email: 'joao@email.com',
        currentStep: RegistrationStep.DOCUMENT,
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);
      repo.findOne.mockResolvedValue(duplicate);

      await expect(
        service.updateStep('uuid-1', RegistrationStep.IDENTIFICATION, {
          name: 'João Silva',
          email: 'joao@email.com',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should normalize email to lowercase on IDENTIFICATION step', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.IDENTIFICATION,
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);
      repo.findOne.mockResolvedValue(null);
      repo.save.mockImplementation(async (r) => r as Registration);
      mfaService.sendMfa.mockResolvedValue(undefined);

      const result = await service.updateStep(
        'uuid-1',
        RegistrationStep.IDENTIFICATION,
        { name: 'João Silva', email: 'Joao@Email.COM' },
      );

      expect(result.registration.email).toBe('joao@email.com');
    });

    it('should throw ConflictException when document already exists in another active registration', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.DOCUMENT,
        mfaVerifiedAt: new Date(),
      } as Registration;
      const duplicate = {
        id: 'uuid-other',
        document: '52998224725',
        currentStep: RegistrationStep.CONTACT,
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);
      repo.findOne.mockResolvedValue(duplicate);

      await expect(
        service.updateStep('uuid-1', RegistrationStep.DOCUMENT, {
          documentType: 'CPF',
          document: '52998224725',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when phone already exists in another active registration', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.CONTACT,
        mfaVerifiedAt: new Date(),
      } as Registration;
      const duplicate = {
        id: 'uuid-other',
        phone: '11987654321',
        currentStep: RegistrationStep.DOCUMENT,
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);
      repo.findOne.mockResolvedValue(duplicate);

      await expect(
        service.updateStep('uuid-1', RegistrationStep.CONTACT, {
          phone: '11987654321',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when DTO is invalid', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.IDENTIFICATION,
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);

      await expect(
        service.updateStep('uuid-1', RegistrationStep.IDENTIFICATION, {
          name: 'Jo',
          email: 'not-an-email',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow editing a past step when currentStep is REVIEW without advancing', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.REVIEW,
        mfaVerifiedAt: new Date(),
        name: 'Old Name',
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);
      repo.findOne.mockResolvedValue(null);
      repo.save.mockImplementation(async (r) => r as Registration);

      const result = await service.updateStep(
        'uuid-1',
        RegistrationStep.IDENTIFICATION,
        { name: 'New Name', email: 'new@email.com' },
      );

      expect(result.registration.name).toBe('New Name');
      expect(result.registration.currentStep).toBe(RegistrationStep.REVIEW);
      expect(mfaService.sendMfa).not.toHaveBeenCalled();
    });

    it('should return registration unchanged on REVIEW step without saving', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.REVIEW,
        mfaVerifiedAt: new Date(),
        completedAt: null,
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);

      const result = await service.updateStep(
        'uuid-1',
        RegistrationStep.REVIEW,
        {},
      );

      expect(result.registration.currentStep).toBe(RegistrationStep.REVIEW);
      expect(result.registration.completedAt).toBeNull();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('should NOT advance to COMPLETED via updateStep — only complete() can do that', async () => {
      // Garante que PATCH /steps/REVIEW nunca produz currentStep=COMPLETED com completedAt=null.
      // A transição para COMPLETED ocorre exclusivamente via POST /complete.
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.REVIEW,
        mfaVerifiedAt: new Date(),
        completedAt: null,
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);

      const result = await service.updateStep(
        'uuid-1',
        RegistrationStep.REVIEW,
        {},
      );

      expect(result.registration.currentStep).not.toBe(
        RegistrationStep.COMPLETED,
      );
      expect(result.registration.completedAt).toBeNull();
    });

    it('should save phone on CONTACT step and advance to ADDRESS', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.CONTACT,
        mfaVerifiedAt: new Date(),
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);
      repo.findOne.mockResolvedValue(null);
      repo.save.mockImplementation(async (r) => r as Registration);

      const result = await service.updateStep(
        'uuid-1',
        RegistrationStep.CONTACT,
        { phone: '11987654321' },
      );

      expect(result.registration.phone).toBe('11987654321');
      expect(result.registration.currentStep).toBe(RegistrationStep.ADDRESS);
    });

    it('should save address fields on ADDRESS step and advance to REVIEW', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.ADDRESS,
        mfaVerifiedAt: new Date(),
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);
      repo.save.mockImplementation(async (r) => r as Registration);

      const result = await service.updateStep(
        'uuid-1',
        RegistrationStep.ADDRESS,
        {
          cep: '01310100',
          street: 'Avenida Paulista',
          number: '1000',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
        },
      );

      expect(result.registration.cep).toBe('01310100');
      expect(result.registration.street).toBe('Avenida Paulista');
      expect(result.registration.number).toBe('1000');
      expect(result.registration.city).toBe('São Paulo');
      expect(result.registration.state).toBe('SP');
      expect(result.registration.currentStep).toBe(RegistrationStep.REVIEW);
    });
  });

  describe('complete', () => {
    it('should set completedAt and currentStep to COMPLETED', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.REVIEW,
        completedAt: null,
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);
      repo.save.mockImplementation(async (r) => r as Registration);

      const result = await service.complete('uuid-1');

      expect(result.completedAt).toBeInstanceOf(Date);
      expect(result.currentStep).toBe(RegistrationStep.COMPLETED);
    });

    it('should throw BadRequestException when currentStep is not REVIEW', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.CONTACT,
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);

      await expect(service.complete('uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when registration is already COMPLETED', async () => {
      const reg = {
        id: 'uuid-1',
        currentStep: RegistrationStep.COMPLETED,
        completedAt: new Date(),
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);

      await expect(service.complete('uuid-1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('recoverByEmail', () => {
    it('should return registration when found by email', async () => {
      const reg = {
        id: 'uuid-1',
        email: 'joao@email.com',
        currentStep: RegistrationStep.CONTACT,
      } as Registration;
      repo.findOne.mockResolvedValue(reg);

      const result = await service.recoverByEmail('joao@email.com');

      expect(result).toBe(reg);
    });

    it('should throw NotFoundException when no in-progress registration found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.recoverByEmail('joao@email.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('resendMfa', () => {
    it('should call mfaService.sendMfa when email is set and mfa not verified', async () => {
      const reg = {
        id: 'uuid-1',
        email: 'joao@email.com',
        mfaVerifiedAt: null,
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);
      mfaService.sendMfa.mockResolvedValue(undefined);

      await service.resendMfa('uuid-1');

      expect(mfaService.sendMfa).toHaveBeenCalledWith(reg);
    });

    it('should throw BadRequestException when mfa already verified', async () => {
      const reg = {
        id: 'uuid-1',
        email: 'joao@email.com',
        mfaVerifiedAt: new Date(),
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);

      await expect(service.resendMfa('uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when email is missing', async () => {
      const reg = {
        id: 'uuid-1',
        email: null,
        mfaVerifiedAt: null,
      } as Registration;
      repo.findOneBy.mockResolvedValue(reg);

      await expect(service.resendMfa('uuid-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyMfa', () => {
    it('should delegate to mfaService.verifyMfa and return updated registration', async () => {
      const reg = {
        id: 'uuid-1',
        mfaCode: '123456',
        mfaVerifiedAt: null,
      } as Registration;
      const regVerified = { ...reg, mfaVerifiedAt: new Date() } as Registration;

      repo.findOneBy
        .mockResolvedValueOnce(reg)
        .mockResolvedValueOnce(regVerified);
      mfaService.verifyMfa.mockResolvedValue(undefined);

      const result = await service.verifyMfa('uuid-1', '123456');

      expect(mfaService.verifyMfa).toHaveBeenCalledWith(reg, '123456');
      expect(result.mfaVerifiedAt).toBeInstanceOf(Date);
    });
  });
});
