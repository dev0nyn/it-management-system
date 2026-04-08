import type {
  NotificationService,
  NotificationRecipient,
  Notification,
  NotificationResult,
} from './types';

export class NoOpNotificationProvider implements NotificationService {
  async notify(
    recipients: NotificationRecipient[],
    notification: Notification,
  ): Promise<NotificationResult[]> {
    return recipients.map((r) => ({
      recipientId: r.userId,
      channel: notification.channel,
      success: true,
    }));
  }
}
