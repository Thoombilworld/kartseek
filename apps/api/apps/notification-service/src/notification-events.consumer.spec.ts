import { NotificationEventsConsumer } from './notification-events.consumer';
import { KAFKA_TOPICS } from '@app/kafka';

describe('NotificationEventsConsumer', () => {
  const makeConsumer = () => {
    const sendEmail = jest.fn().mockResolvedValue({ success: true });
    const sendSms = jest.fn().mockResolvedValue({ success: true });
    const consumer = new NotificationEventsConsumer({ sendEmail, sendSms } as any);
    return { consumer, sendEmail, sendSms };
  };

  it('emails what the platform published on the email topic', async () => {
    const { consumer, sendEmail, sendSms } = makeConsumer();
    await consumer.handle(KAFKA_TOPICS.NOTIFICATION_EMAIL, {
      to: 'a@b.c',
      subject: 'Your KARTSEEK sign-in code',
      body: '482910 is your KARTSEEK admin sign-in code.',
      templateId: 'staff-mfa-code',
      variables: { code: '482910' },
    });

    expect(sendSms).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledTimes(1);
    // Forwarded whole: the publisher already speaks EmailPayload, so rebuilding
    // the object here would only be a second place for the fields to drift.
    expect(sendEmail.mock.calls[0][0]).toMatchObject({
      to: 'a@b.c',
      subject: 'Your KARTSEEK sign-in code',
      body: '482910 is your KARTSEEK admin sign-in code.',
      templateId: 'staff-mfa-code',
      variables: { code: '482910' },
    });
  });

  it('texts what the platform published on the sms topic', async () => {
    const { consumer, sendEmail, sendSms } = makeConsumer();
    await consumer.handle(KAFKA_TOPICS.NOTIFICATION_SMS, {
      phone: '+97455512345',
      message: '482910 is your KARTSEEK admin sign-in code.',
    });

    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendSms).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '+97455512345', message: expect.any(String) }),
    );
  });

  it('drops an email with no recipient or no body rather than sending a blank one', async () => {
    const { consumer, sendEmail } = makeConsumer();
    await consumer.handle(KAFKA_TOPICS.NOTIFICATION_EMAIL, { subject: 'Hi', body: 'x' } as any);
    await consumer.handle(KAFKA_TOPICS.NOTIFICATION_EMAIL, { to: 'a@b.c' } as any);
    await consumer.handle(KAFKA_TOPICS.NOTIFICATION_EMAIL, undefined as any);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('drops an sms with no number or no message', async () => {
    const { consumer, sendSms } = makeConsumer();
    await consumer.handle(KAFKA_TOPICS.NOTIFICATION_SMS, { message: 'x' } as any);
    await consumer.handle(KAFKA_TOPICS.NOTIFICATION_SMS, { phone: '+974555' } as any);
    expect(sendSms).not.toHaveBeenCalled();
  });

  it('ignores a topic it did not subscribe to', async () => {
    const { consumer, sendEmail, sendSms } = makeConsumer();
    await consumer.handle('some.other.topic', { to: 'a@b.c', subject: 's', body: 'b' });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendSms).not.toHaveBeenCalled();
  });
});
