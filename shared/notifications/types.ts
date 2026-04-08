export type NotificationChannel = 'email' | 'in-app';

export interface NotificationRecipient {
  userId: string;
  email?: string;
  name?: string;
}

export interface EmailPayload {
  subject: string;
  body: string;
  replyTo?: string;
}

export interface InAppPayload {
  title: string;
  body: string;
  link?: string;
}

export interface Notification {
  channel: NotificationChannel;
  email?: EmailPayload;
  inApp?: InAppPayload;
}

export interface NotificationResult {
  recipientId: string;
  channel: NotificationChannel;
  success: boolean;
  error?: string;
}

export interface NotificationService {
  notify(
    recipients: NotificationRecipient[],
    notification: Notification,
  ): Promise<NotificationResult[]>;
}
