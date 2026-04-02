import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AbandonmentTask } from './abandonment.task';
import { Registration } from '../entities/registration.entity';
import { RegistrationStep } from '../entities/registration.enums';
import { EMAIL_PROVIDER } from '../../providers/email/email-provider.interface';

const mockRepo = () => ({ find: jest.fn(), save: jest.fn() });
const mockEmail = () => ({ send: jest.fn() });
const mockConfig = () => ({
  get: jest.fn().mockReturnValue('http://localhost:3000'),
});

describe('AbandonmentTask', () => {
  let task: AbandonmentTask;
  let repo: ReturnType<typeof mockRepo>;
  let emailProvider: ReturnType<typeof mockEmail>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AbandonmentTask,
        { provide: getRepositoryToken(Registration), useFactory: mockRepo },
        { provide: EMAIL_PROVIDER, useFactory: mockEmail },
        { provide: ConfigService, useFactory: mockConfig },
      ],
    }).compile();

    task = module.get(AbandonmentTask);
    repo = module.get(getRepositoryToken(Registration));
    emailProvider = module.get(EMAIL_PROVIDER);
  });

  it('should send email and set abandonmentEmailSentAt for each abandoned registration', async () => {
    const reg = {
      id: 'uuid-1',
      email: 'user@test.com',
      currentStep: RegistrationStep.DOCUMENT,
      abandonmentEmailSentAt: null,
    } as Registration;
    repo.find.mockResolvedValue([reg]);
    repo.save.mockResolvedValue(reg);
    emailProvider.send.mockResolvedValue(undefined);

    await task.handleAbandonment();

    expect(emailProvider.send).toHaveBeenCalledWith(
      'user@test.com',
      expect.any(String),
      expect.stringContaining('uuid-1'),
    );
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ abandonmentEmailSentAt: expect.any(Date) }),
    );
  });

  it('should not send email when no abandoned registrations found', async () => {
    repo.find.mockResolvedValue([]);

    await task.handleAbandonment();

    expect(emailProvider.send).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('should continue processing remaining registrations when one email fails', async () => {
    const reg1 = {
      id: 'uuid-1',
      email: 'a@test.com',
      currentStep: RegistrationStep.CONTACT,
    } as Registration;
    const reg2 = {
      id: 'uuid-2',
      email: 'b@test.com',
      currentStep: RegistrationStep.DOCUMENT,
    } as Registration;
    repo.find.mockResolvedValue([reg1, reg2]);
    repo.save.mockResolvedValue({});
    emailProvider.send
      .mockRejectedValueOnce(new Error('SMTP error'))
      .mockResolvedValueOnce(undefined);

    await task.handleAbandonment();

    expect(emailProvider.send).toHaveBeenCalledTimes(2);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('should include registration id and frontend url in the email link', async () => {
    const reg = {
      id: 'my-uuid',
      email: 'x@test.com',
      currentStep: RegistrationStep.ADDRESS,
    } as Registration;
    repo.find.mockResolvedValue([reg]);
    repo.save.mockResolvedValue(reg);
    emailProvider.send.mockResolvedValue(undefined);

    await task.handleAbandonment();

    const htmlArg = emailProvider.send.mock.calls[0][2] as string;
    expect(htmlArg).toContain('my-uuid');
    expect(htmlArg).toContain('http://localhost:3000/register?id=my-uuid');
  });
});
