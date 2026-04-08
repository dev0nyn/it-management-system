export type {
  NotificationChannel,
  NotificationRecipient,
  EmailPayload,
  InAppPayload,
  Notification,
  NotificationResult,
  NotificationService,
} from './types';

export { ConsoleNotificationProvider } from './console-notification-provider';
export { NoOpNotificationProvider } from './noop-notification-provider';

export { createNotificationService } from './create-notification-service';
export type { NotificationProviderName } from './create-notification-service';
