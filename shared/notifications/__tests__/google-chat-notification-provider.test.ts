import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GoogleChatNotificationProvider } from '../google-chat-notification-provider';
import type { Notification, NotificationRecipient } from '../types';

describe('GoogleChatNotificationProvider', () => {
  let provider: GoogleChatNotificationProvider;
  const recipients: NotificationRecipient[] = [
    { userId: 'u1', email: 'alice@example.com', name: 'Alice' },
    { userId: 'u2', email: 'bob@example.com', name: 'Bob' },
  ];

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when webhook URL is configured', () => {
    beforeEach(() => {
      provider = new GoogleChatNotificationProvider(
        'https://chat.googleapis.com/v1/spaces/test/messages?key=k&token=t',
        'https://chat.googleapis.com/v1/spaces/alerts/messages?key=k&token=t',
      );
    });

    it('posts a card to the ticket webhook for email notifications', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('{}', { status: 200 }),
      );

      const notification: Notification = {
        channel: 'email',
        email: { subject: 'New Ticket: Printer broken', body: 'Printer on 3rd floor is down' },
      };

      const results = await provider.notify(recipients, notification);

      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, init] = mockFetch.mock.calls[0];
      expect(url).toContain('spaces/test/messages');
      const body = JSON.parse(init?.body as string);
      expect(body.cardsV2[0].card.header.title).toBe('New Ticket: Printer broken');
      expect(body.cardsV2[0].card.header.subtitle).toContain('Alice');

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
    });

    it('posts to the alerts webhook when subject contains "alert"', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('{}', { status: 200 }),
      );

      const notification: Notification = {
        channel: 'in-app',
        inApp: { title: 'Alert: DB Server down', body: 'Device db-primary is unreachable' },
      };

      await provider.notify(recipients, notification);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('spaces/alerts/messages');
    });

    it('returns failure when Google Chat API returns non-2xx', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('Rate limited', { status: 429 }),
      );

      const notification: Notification = {
        channel: 'email',
        email: { subject: 'Test', body: 'Test body' },
      };

      const results = await provider.notify(recipients, notification);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('429');
    });

    it('returns failure on network error', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'));

      const notification: Notification = {
        channel: 'email',
        email: { subject: 'Test', body: 'Test body' },
      };

      const results = await provider.notify(recipients, notification);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe('ECONNREFUSED');
    });
  });

  describe('when webhook URL is not configured', () => {
    beforeEach(() => {
      provider = new GoogleChatNotificationProvider('', '');
    });

    it('returns success (no-op) for all recipients', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch');

      const notification: Notification = {
        channel: 'email',
        email: { subject: 'Test', body: 'Test body' },
      };

      const results = await provider.notify(recipients, notification);

      expect(mockFetch).not.toHaveBeenCalled();
      expect(results).toHaveLength(2);
      expect(results.every((r) => r.success)).toBe(true);
    });
  });

  describe('in-app notifications', () => {
    beforeEach(() => {
      provider = new GoogleChatNotificationProvider(
        'https://chat.googleapis.com/v1/spaces/test/messages?key=k&token=t',
      );
    });

    it('posts in-app notifications as cards', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response('{}', { status: 200 }),
      );

      const notification: Notification = {
        channel: 'in-app',
        inApp: { title: 'Ticket updated', body: 'Status changed to resolved' },
      };

      const results = await provider.notify(recipients, notification);

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(body.cardsV2[0].card.header.title).toBe('Ticket updated');
      expect(results.every((r) => r.success)).toBe(true);
    });
  });
});
