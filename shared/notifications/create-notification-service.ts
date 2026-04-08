import type { NotificationService } from './types';
import { ConsoleNotificationProvider } from './console-notification-provider';
import { NoOpNotificationProvider } from './noop-notification-provider';

export type NotificationProviderName = 'console' | 'noop';

export function createNotificationService(
  provider?: NotificationProviderName,
): NotificationService {
  const selected =
    provider ?? (process.env.NODE_ENV === 'test' ? 'noop' : 'console');

  switch (selected) {
    case 'noop':
      return new NoOpNotificationProvider();
    case 'console':
      return new ConsoleNotificationProvider();
    default: {
      const _exhaustive: never = selected;
      throw new Error(`Unknown notification provider: ${_exhaustive}`);
    }
  }
}
