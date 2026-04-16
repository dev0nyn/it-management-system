import { Resend } from 'resend';
import type {
  NotificationService,
  NotificationRecipient,
  Notification,
  NotificationResult,
} from './types';

export class ResendNotificationProvider implements NotificationService {
  private client: Resend;
  private from: string;

  constructor(apiKey?: string, from?: string) {
    this.client = new Resend(apiKey ?? process.env.RESEND_API_KEY);
    this.from =
      from ?? process.env.NOTIFICATION_FROM ?? 'IT Management <no-reply@example.com>';
  }

  async notify(
    recipients: NotificationRecipient[],
    notification: Notification,
  ): Promise<NotificationResult[]> {
    if (notification.channel === 'in-app') {
      // In-app notifications are handled by the in-app layer; log and succeed.
      console.log(
        `[ResendProvider] IN-APP to [${recipients.map((r) => r.userId).join(', ')}] title="${notification.inApp?.title}"`,
      );
      return recipients.map((r) => ({
        recipientId: r.userId,
        channel: notification.channel,
        success: true,
      }));
    }

    const results: NotificationResult[] = [];

    for (const recipient of recipients) {
      if (!recipient.email) {
        results.push({
          recipientId: recipient.userId,
          channel: 'email',
          success: false,
          error: 'Recipient has no email address',
        });
        continue;
      }

      try {
        const { error } = await this.client.emails.send({
          from: this.from,
          to: [recipient.email],
          subject: notification.email!.subject,
          html: notification.email!.body,
          ...(notification.email!.replyTo
            ? { replyTo: notification.email!.replyTo }
            : {}),
        });

        if (error) {
          results.push({
            recipientId: recipient.userId,
            channel: 'email',
            success: false,
            error: error.message,
          });
        } else {
          results.push({
            recipientId: recipient.userId,
            channel: 'email',
            success: true,
          });
        }
      } catch (err) {
        results.push({
          recipientId: recipient.userId,
          channel: 'email',
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return results;
  }
}
