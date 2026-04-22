import type {
  NotificationService,
  NotificationRecipient,
  Notification,
  NotificationResult,
} from './types';

/**
 * Google Chat notification provider.
 *
 * Outbound: posts cards to configured Google Chat spaces via incoming webhooks.
 * - Ticket notifications go to GOOGLE_CHAT_WEBHOOK_URL
 * - Monitoring alerts go to GOOGLE_CHAT_ALERTS_WEBHOOK_URL
 *
 * This provider operates on *all* notification channels — it translates the
 * payload into a Google Chat card regardless of whether the original channel
 * was 'email' or 'in-app'. The actual email/in-app delivery is handled by
 * other providers in the chain; this provider only cares about Chat delivery.
 */
export class GoogleChatNotificationProvider implements NotificationService {
  private webhookUrl: string;
  private alertsWebhookUrl: string;

  constructor(webhookUrl?: string, alertsWebhookUrl?: string) {
    this.webhookUrl = webhookUrl ?? process.env.GOOGLE_CHAT_WEBHOOK_URL ?? '';
    this.alertsWebhookUrl = alertsWebhookUrl ?? process.env.GOOGLE_CHAT_ALERTS_WEBHOOK_URL ?? '';
  }

  async notify(
    recipients: NotificationRecipient[],
    notification: Notification,
  ): Promise<NotificationResult[]> {
    // Determine the webhook URL: alerts use the alerts space, everything else uses the main space
    const isAlert = notification.email?.subject?.toLowerCase().includes('alert') ||
                    notification.inApp?.title?.toLowerCase().includes('alert');
    const targetUrl = isAlert ? this.alertsWebhookUrl : this.webhookUrl;

    if (!targetUrl) {
      // No webhook configured — succeed silently (not an error, just unconfigured)
      return recipients.map((r) => ({
        recipientId: r.userId,
        channel: notification.channel,
        success: true,
      }));
    }

    const card = this.buildCard(notification, recipients);

    try {
      const res = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify(card),
      });

      if (!res.ok) {
        const text = await res.text();
        return recipients.map((r) => ({
          recipientId: r.userId,
          channel: notification.channel,
          success: false,
          error: `Google Chat API ${res.status}: ${text}`,
        }));
      }

      return recipients.map((r) => ({
        recipientId: r.userId,
        channel: notification.channel,
        success: true,
      }));
    } catch (err) {
      return recipients.map((r) => ({
        recipientId: r.userId,
        channel: notification.channel,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }

  private buildCard(notification: Notification, recipients: NotificationRecipient[]) {
    const title = notification.email?.subject ?? notification.inApp?.title ?? 'CoDev ITMS Notification';
    const body = notification.email?.body ?? notification.inApp?.body ?? '';
    const mentionedNames = recipients.filter((r) => r.name).map((r) => r.name).join(', ');

    return {
      cardsV2: [
        {
          cardId: `codev-${Date.now()}`,
          card: {
            header: {
              title,
              subtitle: mentionedNames ? `Assigned: ${mentionedNames}` : 'CoDev ITMS',
            },
            sections: [
              {
                widgets: [
                  {
                    textParagraph: {
                      text: body,
                    },
                  },
                ],
              },
            ],
          },
        },
      ],
    };
  }
}
