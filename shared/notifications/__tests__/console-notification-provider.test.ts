import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConsoleNotificationProvider } from '../console-notification-provider';
import type { Notification, NotificationRecipient } from '../types';

describe('ConsoleNotificationProvider', () => {
  const provider = new ConsoleNotificationProvider();

  const recipients: NotificationRecipient[] = [
    { userId: 'user-1', email: 'a@test.com' },
    { userId: 'user-2', email: 'b@test.com' },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('logs email notifications to console', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const notification: Notification = {
      channel: 'email',
      email: { subject: 'Test Subject', body: 'Hello' },
    };

    await provider.notify(recipients, notification);

    expect(logSpy).toHaveBeenCalledWith(
      '[NotificationService] EMAIL to [user-1, user-2] subject="Test Subject"',
    );
  });

  it('logs in-app notifications to console', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const notification: Notification = {
      channel: 'in-app',
      inApp: { title: 'Alert Title', body: 'Something happened' },
    };

    await provider.notify(recipients, notification);

    expect(logSpy).toHaveBeenCalledWith(
      '[NotificationService] IN-APP to [user-1, user-2] title="Alert Title"',
    );
  });

  it('warns on incomplete notification payload', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const notification: Notification = {
      channel: 'email',
      // missing email payload
    };

    await provider.notify(recipients, notification);

    expect(warnSpy).toHaveBeenCalledWith(
      '[NotificationService] Unknown or incomplete notification:',
      notification,
    );
  });

  it('returns success for every recipient', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});

    const notification: Notification = {
      channel: 'email',
      email: { subject: 'Test', body: 'Hello' },
    };

    const results = await provider.notify(recipients, notification);

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.success)).toBe(true);
  });
});
