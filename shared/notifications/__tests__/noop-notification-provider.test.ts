import { describe, it, expect } from 'vitest';
import { NoOpNotificationProvider } from '../noop-notification-provider';
import type { Notification, NotificationRecipient } from '../types';

describe('NoOpNotificationProvider', () => {
  const provider = new NoOpNotificationProvider();

  const recipients: NotificationRecipient[] = [
    { userId: 'user-1', email: 'a@test.com' },
    { userId: 'user-2', email: 'b@test.com' },
  ];

  const emailNotification: Notification = {
    channel: 'email',
    email: { subject: 'Test', body: 'Hello' },
  };

  it('returns success for every recipient', async () => {
    const results = await provider.notify(recipients, emailNotification);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      recipientId: 'user-1',
      channel: 'email',
      success: true,
    });
    expect(results[1]).toEqual({
      recipientId: 'user-2',
      channel: 'email',
      success: true,
    });
  });

  it('handles empty recipients array', async () => {
    const results = await provider.notify([], emailNotification);
    expect(results).toEqual([]);
  });

  it('returns correct channel for in-app notifications', async () => {
    const inAppNotification: Notification = {
      channel: 'in-app',
      inApp: { title: 'Alert', body: 'Something happened' },
    };

    const results = await provider.notify(
      [{ userId: 'user-1' }],
      inAppNotification,
    );

    expect(results[0].channel).toBe('in-app');
    expect(results[0].success).toBe(true);
  });
});
