import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { EMAIL_PROVIDER } from '../../providers/email/email-provider.interface';
import { Registration } from '../entities/registration.entity';
import { MfaService } from './mfa.service';

const mockEmailProvider = () => ({ send: jest.fn() });
const mockRepo = () => ({ save: jest.fn() });

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

describe('MfaService', () => {
  let service: MfaService;
  let emailProvider: { send: jest.Mock };
  let repo: { save: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        { provide: EMAIL_PROVIDER, useFactory: mockEmailProvider },
        { provide: getRepositoryToken(Registration), useFactory: mockRepo },
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);
    emailProvider = module.get(EMAIL_PROVIDER);
    repo = module.get(getRepositoryToken(Registration));
  });

  describe('generateCode', () => {
    it('should return a 6-digit numeric string', () => {
      expect(service.generateCode()).toMatch(/^\d{6}$/);
    });

    it('should not always return the same code', () => {
      const codes = new Set(
        Array.from({ length: 20 }, () => service.generateCode()),
      );
      expect(codes.size).toBeGreaterThan(1);
    });
  });

  describe('sendMfa', () => {
    it('should set mfaCode as sha256 hash, set expiry and send email', async () => {
      const registration = {
        id: 'uuid-1',
        email: 'joao@email.com',
        mfaCode: null,
        mfaCodeExpiresAt: null,
      } as Registration;

      repo.save.mockImplementation(async (r: Registration) => r);
      emailProvider.send.mockResolvedValue(undefined);

      const before = new Date();
      await service.sendMfa(registration);
      const after = new Date();

      // mfaCode stored as 64-char hex SHA-256 hash
      expect(registration.mfaCode).toMatch(/^[0-9a-f]{64}$/);
      expect(registration.mfaCodeExpiresAt).toBeInstanceOf(Date);
      const tenMin = 10 * 60 * 1000;
      expect(registration.mfaCodeExpiresAt!.getTime()).toBeGreaterThanOrEqual(
        before.getTime() + tenMin - 1000,
      );
      expect(registration.mfaCodeExpiresAt!.getTime()).toBeLessThanOrEqual(
        after.getTime() + tenMin + 1000,
      );
      expect(repo.save).toHaveBeenCalledWith(registration);
      expect(emailProvider.send).toHaveBeenCalledWith(
        'joao@email.com',
        expect.any(String),
        expect.any(String),
      );
    });

    it('should throw BadRequestException when email is missing', async () => {
      const registration = {
        id: 'uuid-1',
        email: null,
        mfaCode: null,
        mfaCodeExpiresAt: null,
      } as Registration;

      await expect(service.sendMfa(registration)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('verifyMfa', () => {
    it('should set mfaVerifiedAt and clear mfaCode on valid code', async () => {
      const code = '123456';
      const registration = {
        id: 'uuid-1',
        mfaCode: sha256(code),
        mfaCodeExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        mfaVerifiedAt: null,
      } as Registration;

      repo.save.mockImplementation(async (r: Registration) => r);

      await service.verifyMfa(registration, code);

      expect(registration.mfaVerifiedAt).toBeInstanceOf(Date);
      expect(registration.mfaCode).toBeNull();
      expect(repo.save).toHaveBeenCalledWith(registration);
    });

    it('should throw BadRequestException when code is expired', async () => {
      const code = '123456';
      const registration = {
        id: 'uuid-1',
        mfaCode: sha256(code),
        mfaCodeExpiresAt: new Date(Date.now() - 1000),
        mfaVerifiedAt: null,
      } as Registration;

      await expect(service.verifyMfa(registration, code)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when code does not match', async () => {
      const registration = {
        id: 'uuid-1',
        mfaCode: sha256('123456'),
        mfaCodeExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
        mfaVerifiedAt: null,
      } as Registration;

      await expect(service.verifyMfa(registration, '999999')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when mfaCode is null', async () => {
      const registration = {
        id: 'uuid-1',
        mfaCode: null,
        mfaCodeExpiresAt: null,
        mfaVerifiedAt: null,
      } as Registration;

      await expect(service.verifyMfa(registration, '123456')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
