import type {
  NotificationService,
  NotificationRecipient,
  Notification,
  NotificationResult,
} from './types';

export class ConsoleNotificationProvider implements NotificationService {
  async notify(
    recipients: NotificationRecipient[],
    notification: Notification,
  ): Promise<NotificationResult[]> {
    const recipientIds = recipients.map((r) => r.userId).join(', ');

    if (notification.channel === 'email' && notification.email) {
      console.log(
        `[NotificationService] EMAIL to [${recipientIds}] subject="${notification.email.subject}"`,
      );
    } else if (notification.channel === 'in-app' && notification.inApp) {
      console.log(
        `[NotificationService] IN-APP to [${recipientIds}] title="${notification.inApp.title}"`,
      );
    } else {
      console.warn(
        `[NotificationService] Unknown or incomplete notification:`,
        notification,
      );
    }

    return recipients.map((r) => ({
      recipientId: r.userId,
      channel: notification.channel,
      success: true,
    }));
  }
}
