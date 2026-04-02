import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResendEmailProvider } from './resend-email.provider';

const mockEmailsSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockEmailsSend },
  })),
}));

function makeConfigService(emailFrom = 'onboarding@resend.dev'): ConfigService {
  return {
    get: jest.fn().mockImplementation((key: string, defaultValue?: string) => {
      if (key === 'RESEND_API_KEY') return 'test-api-key';
      if (key === 'EMAIL_FROM') return emailFrom;
      return defaultValue;
    }),
  } as unknown as ConfigService;
}

describe('ResendEmailProvider', () => {
  let provider: ResendEmailProvider;

  beforeEach(() => {
    mockEmailsSend.mockReset();
    provider = new ResendEmailProvider(makeConfigService());
  });

  it('should call resend.emails.send with correct params', async () => {
    mockEmailsSend.mockResolvedValue({ id: 'msg-1' });

    await provider.send('user@example.com', 'Subject', '<p>Hello</p>');

    expect(mockEmailsSend).toHaveBeenCalledWith({
      from: 'onboarding@resend.dev',
      to: 'user@example.com',
      subject: 'Subject',
      html: '<p>Hello</p>',
    });
  });

  it('should use EMAIL_FROM from config', async () => {
    mockEmailsSend.mockResolvedValue({ id: 'msg-2' });
    const customProvider = new ResendEmailProvider(
      makeConfigService('noreply@mydomain.com'),
    );

    await customProvider.send('user@example.com', 'Subject', '<p>Hello</p>');

    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: 'noreply@mydomain.com' }),
    );
  });

  it('should throw InternalServerErrorException when resend.emails.send throws', async () => {
    mockEmailsSend.mockRejectedValue(new Error('SDK error'));

    await expect(
      provider.send('user@example.com', 'Subject', '<p>Hello</p>'),
    ).rejects.toThrow(InternalServerErrorException);
  });
});
