import type { NotificationService } from './types';
import { ConsoleNotificationProvider } from './console-notification-provider';
import { NoOpNotificationProvider } from './noop-notification-provider';
import { ResendNotificationProvider } from './resend-notification-provider';
import { GoogleChatNotificationProvider } from './google-chat-notification-provider';

export type NotificationProviderName = 'console' | 'noop' | 'resend' | 'google-chat';

export function createNotificationService(
  provider?: NotificationProviderName,
): NotificationService {
  const selected =
    provider ??
    (process.env.NODE_ENV === 'test'
      ? 'noop'
      : process.env.GOOGLE_CHAT_WEBHOOK_URL
        ? 'google-chat'
        : process.env.RESEND_API_KEY
          ? 'resend'
          : 'console');

  switch (selected) {
    case 'noop':
      return new NoOpNotificationProvider();
    case 'console':
      return new ConsoleNotificationProvider();
    case 'resend':
      return new ResendNotificationProvider();
    case 'google-chat':
      return new GoogleChatNotificationProvider();
    default: {
      const _exhaustive: never = selected;
      throw new Error(`Unknown notification provider: ${_exhaustive}`);
    }
  }
}
