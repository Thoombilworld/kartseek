import { PasswordResetConsumer } from './password-reset.consumer';

describe('PasswordResetConsumer', () => {
  const makeConsumer = () => {
    const sendEmail = jest.fn().mockResolvedValue({ success: true });
    const consumer = new PasswordResetConsumer({ sendEmail } as any);
    return { consumer, sendEmail };
  };

  it('emails the reset link to the address on the event', async () => {
    const { consumer, sendEmail } = makeConsumer();
    await consumer.handle({
      userId: 'u-1',
      email: 'jane@example.com',
      resetUrl: 'http://localhost:3000/auth/reset-password?token=abc',
      expiresInSeconds: 1800,
    });

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const dto = sendEmail.mock.calls[0][0];
    expect(dto.to).toBe('jane@example.com');
    expect(dto.body).toContain('http://localhost:3000/auth/reset-password?token=abc');
    // The expiry is stated so the customer knows the link is not indefinite.
    expect(dto.body).toContain('30 minutes');
    // And an unsolicited request needs a reassuring way out.
    expect(dto.body).toMatch(/didn't request/i);
  });

  it('states the expiry in minutes derived from the event', async () => {
    const { consumer, sendEmail } = makeConsumer();
    await consumer.handle({
      userId: 'u-2',
      email: 'jane@example.com',
      resetUrl: 'https://kartseek.com/auth/reset-password?token=xyz',
      expiresInSeconds: 600,
    });
    expect(sendEmail.mock.calls[0][0].body).toContain('10 minutes');
  });

  it('drops malformed events instead of sending a broken email', async () => {
    const { consumer, sendEmail } = makeConsumer();
    await consumer.handle({ userId: 'u-3' } as any);
    await consumer.handle(undefined as any);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
