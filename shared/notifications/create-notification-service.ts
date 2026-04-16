import type { NotificationService } from './types';
import { ConsoleNotificationProvider } from './console-notification-provider';
import { NoOpNotificationProvider } from './noop-notification-provider';
import { ResendNotificationProvider } from './resend-notification-provider';

export type NotificationProviderName = 'console' | 'noop' | 'resend';

export function createNotificationService(
  provider?: NotificationProviderName,
): NotificationService {
  const selected =
    provider ??
    (process.env.NODE_ENV === 'test'
      ? 'noop'
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
    default: {
      const _exhaustive: never = selected;
      throw new Error(`Unknown notification provider: ${_exhaustive}`);
    }
  }
}
