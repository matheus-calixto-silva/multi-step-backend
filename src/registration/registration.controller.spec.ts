import { Test, TestingModule } from '@nestjs/testing';
import { Registration, RegistrationStep } from './entities/registration.entity';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';

const mockRegistration = (
  overrides: Partial<Registration> = {},
): Registration =>
  ({
    id: 'uuid-1',
    currentStep: RegistrationStep.DOCUMENT,
    ...overrides,
  }) as Registration;

describe('RegistrationController', () => {
  let controller: RegistrationController;
  let service: {
    create: jest.Mock;
    findOne: jest.Mock;
    updateStep: jest.Mock;
    complete: jest.Mock;
    recoverByEmail: jest.Mock;
    verifyMfa: jest.Mock;
    resendMfa: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findOne: jest.fn(),
      updateStep: jest.fn(),
      complete: jest.fn(),
      recoverByEmail: jest.fn(),
      verifyMfa: jest.fn(),
      resendMfa: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistrationController],
      providers: [{ provide: RegistrationService, useValue: service }],
    }).compile();

    controller = module.get<RegistrationController>(RegistrationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should return id from service.create', async () => {
      service.create.mockResolvedValue({ id: 'uuid-1' });
      expect(await controller.create()).toEqual({ id: 'uuid-1' });
    });
  });

  describe('findOne', () => {
    it('should delegate to service.findOne', async () => {
      const reg = mockRegistration();
      service.findOne.mockResolvedValue(reg);
      expect(await controller.findOne('uuid-1')).toBe(reg);
      expect(service.findOne).toHaveBeenCalledWith('uuid-1');
    });
  });

  describe('updateStep', () => {
    it('should return requiresMfa:true for IDENTIFICATION step', async () => {
      service.updateStep.mockResolvedValue({
        registration: mockRegistration({
          currentStep: RegistrationStep.DOCUMENT,
        }),
        mfaEmailFailed: false,
      });

      const result = await controller.updateStep(
        'uuid-1',
        RegistrationStep.IDENTIFICATION,
        { name: 'João', email: 'j@j.com' },
      );

      expect(result).toEqual({ requiresMfa: true });
    });

    it('should include mfaEmailWarning when mfaEmailFailed is true', async () => {
      service.updateStep.mockResolvedValue({
        registration: mockRegistration({
          currentStep: RegistrationStep.DOCUMENT,
        }),
        mfaEmailFailed: true,
      });

      const result = await controller.updateStep(
        'uuid-1',
        RegistrationStep.IDENTIFICATION,
        { name: 'João', email: 'j@j.com' },
      );

      expect(result).toHaveProperty('requiresMfa', true);
      expect(result).toHaveProperty('mfaEmailWarning');
    });

    it('should return registration for non-IDENTIFICATION steps', async () => {
      const reg = mockRegistration();
      service.updateStep.mockResolvedValue({
        registration: reg,
        mfaEmailFailed: false,
      });

      const result = await controller.updateStep(
        'uuid-1',
        RegistrationStep.DOCUMENT,
        { documentType: 'CPF', document: '52998224725' },
      );

      expect(result).toBe(reg);
    });
  });

  describe('complete', () => {
    it('should delegate to service.complete', async () => {
      const reg = mockRegistration({ currentStep: RegistrationStep.COMPLETED });
      service.complete.mockResolvedValue(reg);
      expect(await controller.complete('uuid-1')).toBe(reg);
      expect(service.complete).toHaveBeenCalledWith('uuid-1');
    });
  });

  describe('verifyMfa', () => {
    it('should delegate to service.verifyMfa', async () => {
      const reg = mockRegistration({
        mfaVerifiedAt: new Date(),
      } as Partial<Registration>);
      service.verifyMfa.mockResolvedValue(reg);
      const result = await controller.verifyMfa('uuid-1', { code: '123456' });
      expect(service.verifyMfa).toHaveBeenCalledWith('uuid-1', '123456');
      expect(result).toBe(reg);
    });
  });

  describe('recover', () => {
    it('should delegate to service.recoverByEmail', async () => {
      const reg = mockRegistration();
      service.recoverByEmail.mockResolvedValue(reg);
      expect(await controller.recover({ email: 'j@j.com' })).toBe(reg);
      expect(service.recoverByEmail).toHaveBeenCalledWith('j@j.com');
    });
  });

  describe('resendMfa', () => {
    it('should delegate to service.resendMfa and return void', async () => {
      service.resendMfa.mockResolvedValue(undefined);
      const result = await controller.resendMfa('uuid-1');
      expect(service.resendMfa).toHaveBeenCalledWith('uuid-1');
      expect(result).toBeUndefined();
    });
  });
});
