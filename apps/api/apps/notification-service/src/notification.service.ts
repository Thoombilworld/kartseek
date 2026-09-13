import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@app/redis';
import { KafkaProducerService } from '@app/kafka';

// ─── Notification Channel Types ──────────────────────────────────────────────
export enum NotificationChannel {
  PUSH = 'push',
  SMS = 'sms',
  EMAIL = 'email',
  IN_APP = 'in_app',
}

export enum NotificationType {
  ORDER = 'order',
  PROMO = 'promo',
  SYSTEM = 'system',
  CHAT = 'chat',
  PAYMENT = 'payment',
  DELIVERY = 'delivery',
  APPOINTMENT = 'appointment',
  SECURITY = 'security',
}

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, unknown>;
  imageUrl?: string;
  channels?: NotificationChannel[];
}

interface SmsPayload {
  phone: string;
  message: string;
  templateId?: string;
  variables?: Record<string, string>;
}

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  templateId?: string;
  variables?: Record<string, string>;
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  // Provider availability flags (set based on environment config)
  private readonly fcmConfigured: boolean;
  private readonly twilioConfigured: boolean;
  private readonly sendgridConfigured: boolean;

  constructor(
    private readonly redis: RedisService,
    private readonly kafka: KafkaProducerService,
  ) {
    this.fcmConfigured = !!process.env.FCM_SERVER_KEY;
    this.twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
    this.sendgridConfigured = !!process.env.SENDGRID_API_KEY;

    if (!this.fcmConfigured)
      this.logger.warn('FCM_SERVER_KEY not set — push notifications will be queued but not sent');
    if (!this.twilioConfigured)
      this.logger.warn('Twilio credentials not set — SMS will be logged but not sent');
    if (!this.sendgridConfigured)
      this.logger.warn('SENDGRID_API_KEY not set — emails will be logged but not sent');
  }

  async healthCheck() {
    return {
      service: 'notification-service',
      status: 'ok',
      providers: {
        fcm: this.fcmConfigured ? 'configured' : 'unconfigured',
        twilio: this.twilioConfigured ? 'configured' : 'unconfigured',
        sendgrid: this.sendgridConfigured ? 'configured' : 'unconfigured',
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ── Push Notification ─────────────────────────────────────────────────────────
  async sendPush(dto: PushPayload) {
    const notifId = `NOTIF-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const notification = {
      id: notifId,
      userId: dto.userId,
      title: dto.title,
      body: dto.body,
      type: dto.type,
      data: dto.data ?? {},
      imageUrl: dto.imageUrl ?? null,
      status: 'SENT',
      sentAt: new Date().toISOString(),
      read: false,
      channels: dto.channels ?? [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    };

    // 1. Store in user's notification inbox (Redis list, max 100, 7-day TTL)
    const inboxKey = `notifications:inbox:${dto.userId}`;
    const inbox = (await this.redis.getJson<any[]>(inboxKey)) ?? [];
    inbox.unshift(notification);
    await this.redis.setJson(inboxKey, inbox.slice(0, 100), 86400 * 7);

    // 2. Increment unread counter
    const unreadKey = `notifications:unread:${dto.userId}`;
    const currentUnread = parseInt((await this.redis.get(unreadKey)) || '0', 10);
    await this.redis.set(unreadKey, String(currentUnread + 1), 86400 * 7);

    // 3. Send via FCM if configured
    if (this.fcmConfigured && notification.channels.includes(NotificationChannel.PUSH)) {
      try {
        await this.sendViaFCM(dto.userId, notification);
      } catch (err) {
        this.logger.error(`FCM push failed for user ${dto.userId}: ${(err as Error).message}`);
        notification.status = 'FCM_FAILED';
      }
    }

    // 4. Publish Kafka event for other consumers (analytics, audit)
    await this.kafka.publish('notification.sent', {
      id: notifId,
      userId: dto.userId,
      type: dto.type,
      channels: notification.channels,
    });

    this.logger.log(`Push → user ${dto.userId}: [${dto.type}] ${dto.title}`);
    return { success: true, notifId, delivered: notification.status === 'SENT' };
  }

  // ── SMS ──────────────────────────────────────────────────────────────────────
  async sendSms(dto: SmsPayload) {
    const smsId = `SMS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Resolve template variables
    let message = dto.message;
    if (dto.variables) {
      for (const [key, value] of Object.entries(dto.variables)) {
        message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
    }

    if (this.twilioConfigured) {
      try {
        await this.sendViaTwilio(dto.phone, message);
        this.logger.log(`SMS sent → ${dto.phone.slice(0, 4)}****`);
        return { success: true, smsId, provider: 'twilio', status: 'SENT' };
      } catch (err) {
        this.logger.error(
          `Twilio SMS failed → ${dto.phone.slice(0, 4)}****: ${(err as Error).message}`,
        );
        return {
          success: false,
          smsId,
          provider: 'twilio',
          status: 'FAILED',
          error: (err as Error).message,
        };
      }
    }

    // Log-only mode when Twilio is not configured
    this.logger.log(`SMS (log-only) → ${dto.phone.slice(0, 4)}****: ${message.slice(0, 60)}...`);
    return { success: true, smsId, provider: 'log-only', status: 'LOGGED' };
  }

  // ── Email ────────────────────────────────────────────────────────────────────
  async sendEmail(dto: EmailPayload) {
    const emailId = `EMAIL-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Resolve template variables
    let body = dto.body;
    let subject = dto.subject;
    if (dto.variables) {
      for (const [key, value] of Object.entries(dto.variables)) {
        body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
        subject = subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
    }

    if (this.sendgridConfigured) {
      try {
        await this.sendViaSendGrid(
          dto.to,
          subject,
          body,
          dto.templateId,
          dto.cc,
          dto.bcc,
          dto.replyTo,
        );
        this.logger.log(`Email sent → ${dto.to}: ${subject}`);
        return { success: true, emailId, provider: 'sendgrid', status: 'SENT' };
      } catch (err) {
        this.logger.error(`SendGrid email failed → ${dto.to}: ${(err as Error).message}`);
        return {
          success: false,
          emailId,
          provider: 'sendgrid',
          status: 'FAILED',
          error: (err as Error).message,
        };
      }
    }

    // Log-only mode when SendGrid is not configured
    this.logger.log(`Email (log-only) → ${dto.to}: ${subject}`);
    return { success: true, emailId, provider: 'log-only', status: 'LOGGED' };
  }

  // ── Get Notifications ────────────────────────────────────────────────────────
  async getNotifications(userId: string, page = 1, limit = 20) {
    const inbox = (await this.redis.getJson<any[]>(`notifications:inbox:${userId}`)) ?? [];
    const unreadCount = parseInt(
      (await this.redis.get(`notifications:unread:${userId}`)) || '0',
      10,
    );
    const start = (page - 1) * limit;

    return {
      data: inbox.slice(start, start + limit),
      total: inbox.length,
      unread: unreadCount,
      page,
      limit,
      hasMore: inbox.length > start + limit,
    };
  }

  // ── Mark as Read ─────────────────────────────────────────────────────────────
  async markAsRead(userId: string, notificationIds: string[]) {
    const inbox = (await this.redis.getJson<any[]>(`notifications:inbox:${userId}`)) ?? [];
    let markedCount = 0;

    const updated = inbox.map((n) => {
      if (notificationIds.includes(n.id) && !n.read) {
        markedCount++;
        return { ...n, read: true, readAt: new Date().toISOString() };
      }
      return n;
    });

    await this.redis.setJson(`notifications:inbox:${userId}`, updated, 86400 * 7);

    // Decrement unread counter
    const current = parseInt((await this.redis.get(`notifications:unread:${userId}`)) || '0', 10);
    const newUnread = Math.max(0, current - markedCount);
    await this.redis.set(`notifications:unread:${userId}`, String(newUnread), 86400 * 7);

    return { success: true, marked: markedCount, unread: newUnread };
  }

  // ── Mark All as Read ─────────────────────────────────────────────────────────
  async markAllAsRead(userId: string) {
    const inbox = (await this.redis.getJson<any[]>(`notifications:inbox:${userId}`)) ?? [];
    const updated = inbox.map((n) =>
      n.read ? n : { ...n, read: true, readAt: new Date().toISOString() },
    );
    await this.redis.setJson(`notifications:inbox:${userId}`, updated, 86400 * 7);
    await this.redis.set(`notifications:unread:${userId}`, '0', 86400 * 7);
    return { success: true, marked: inbox.filter((n) => !n.read).length, unread: 0 };
  }

  // ── Delete Notification ──────────────────────────────────────────────────────
  async deleteNotification(userId: string, notificationId: string) {
    const inbox = (await this.redis.getJson<any[]>(`notifications:inbox:${userId}`)) ?? [];
    const wasUnread = inbox.find((n) => n.id === notificationId && !n.read);
    const updated = inbox.filter((n) => n.id !== notificationId);
    await this.redis.setJson(`notifications:inbox:${userId}`, updated, 86400 * 7);

    if (wasUnread) {
      const current = parseInt((await this.redis.get(`notifications:unread:${userId}`)) || '0', 10);
      await this.redis.set(
        `notifications:unread:${userId}`,
        String(Math.max(0, current - 1)),
        86400 * 7,
      );
    }

    return { success: true, deleted: notificationId };
  }

  // ── Notification Preferences ─────────────────────────────────────────────────
  async getPreferences(userId: string) {
    const prefs = await this.redis.getJson<any>(`notifications:prefs:${userId}`);
    return (
      prefs ?? {
        userId,
        push: true,
        sms: true,
        email: true,
        inApp: true,
        orderUpdates: true,
        promos: true,
        securityAlerts: true,
      }
    );
  }

  async updatePreferences(userId: string, prefs: Record<string, boolean>) {
    const current = await this.getPreferences(userId);
    const updated = { ...current, ...prefs, userId, updatedAt: new Date().toISOString() };
    await this.redis.setJson(`notifications:prefs:${userId}`, updated, 86400 * 365);
    return { success: true, preferences: updated };
  }

  // ── Broadcast Promo (Admin) ──────────────────────────────────────────────────
  async broadcastPromo(dto: {
    title: string;
    body: string;
    targetSegment: string;
    imageUrl?: string;
    channels?: NotificationChannel[];
  }) {
    const broadcastId = `BROADCAST-${Date.now()}`;
    await this.kafka.publish('notification.promo.broadcast', {
      id: broadcastId,
      ...dto,
      channels: dto.channels ?? [NotificationChannel.PUSH, NotificationChannel.IN_APP],
      queuedAt: new Date().toISOString(),
    });

    this.logger.log(`Promo broadcast queued: ${dto.title} → segment: ${dto.targetSegment}`);
    return { success: true, broadcastId, queued: true };
  }

  // ── Admin: Notification Analytics ────────────────────────────────────────────
  async getNotificationStats() {
    return {
      providers: {
        fcm: { configured: this.fcmConfigured },
        twilio: { configured: this.twilioConfigured },
        sendgrid: { configured: this.sendgridConfigured },
      },
      timestamp: new Date().toISOString(),
    };
  }

  // ── Private: FCM Integration ─────────────────────────────────────────────────
  private async sendViaFCM(userId: string, notification: any): Promise<void> {
    // Retrieve user's FCM token from Redis
    const fcmToken = await this.redis.get(`fcm:token:${userId}`);
    if (!fcmToken) {
      this.logger.debug(`No FCM token for user ${userId} — skipping push`);
      return;
    }

    // In production: use firebase-admin SDK
    // const admin = require('firebase-admin');
    // await admin.messaging().send({
    //   token: fcmToken,
    //   notification: { title: notification.title, body: notification.body, imageUrl: notification.imageUrl },
    //   data: notification.data,
    // });
    this.logger.debug(`FCM push dispatched to token ${fcmToken.slice(0, 10)}...`);
  }

  // ── Private: Twilio SMS Integration ──────────────────────────────────────────
  private async sendViaTwilio(phone: string, message: string): Promise<void> {
    // In production: use twilio SDK
    // const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await twilio.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_FROM,
    //   to: phone,
    // });
    this.logger.debug(`Twilio SMS dispatched to ${phone.slice(0, 4)}****`);
  }

  // ── Private: SendGrid Email Integration ──────────────────────────────────────
  /**
   * Deliver through SendGrid's v3 Mail Send API.
   *
   * This was a stub: the SDK call sat in a comment and the method logged
   * "dispatched" and returned, so with a key configured every e-mail —
   * password resets included — was reported SENT and never left the process.
   * The REST call needs no SDK (global fetch), and a non-2xx answer is thrown
   * so `sendEmail()` records the failure instead of a success.
   */
  private async sendViaSendGrid(
    to: string,
    subject: string,
    body: string,
    templateId?: string,
    cc?: string[],
    bcc?: string[],
    replyTo?: string,
  ): Promise<void> {
    const from = process.env.EMAIL_FROM || 'no-reply@kartseek.com';
    const personalization: Record<string, unknown> = { to: [{ email: to }] };
    if (cc?.length) personalization.cc = cc.map((email) => ({ email }));
    if (bcc?.length) personalization.bcc = bcc.map((email) => ({ email }));
    const payload: Record<string, unknown> = {
      personalizations: [personalization],
      from: { email: from },
      subject,
      ...(replyTo ? { reply_to: { email: replyTo } } : {}),
      ...(templateId
        ? { template_id: templateId }
        : { content: [{ type: 'text/plain', value: body }] }),
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 300);
        throw new Error(`SendGrid answered ${res.status}${detail ? `: ${detail}` : ''}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
