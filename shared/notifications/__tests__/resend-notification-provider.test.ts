import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResendNotificationProvider } from '../resend-notification-provider';

// Mock the resend module
vi.mock('resend', () => {
  const mockSend = vi.fn();
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: { send: mockSend },
    })),
    __mockSend: mockSend,
  };
});

async function getMockSend() {
  const mod = await import('resend');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (mod as any).__mockSend as ReturnType<typeof vi.fn>;
}

describe('ResendNotificationProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends an email to a recipient with an email address', async () => {
    const mockSend = await getMockSend();
    mockSend.mockResolvedValue({ data: { id: 'msg_123' }, error: null });

    const provider = new ResendNotificationProvider('re_test_key', 'IT <no-reply@example.com>');
    const results = await provider.notify(
      [{ userId: 'u1', email: 'user@example.com', name: 'User' }],
      {
        channel: 'email',
        email: { subject: 'Test subject', body: '<p>Hello</p>' },
      },
    );

    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'IT <no-reply@example.com>',
        to: ['user@example.com'],
        subject: 'Test subject',
        html: '<p>Hello</p>',
      }),
    );
    expect(results).toEqual([
      { recipientId: 'u1', channel: 'email', success: true },
    ]);
  });

  it('returns failure for recipient without email address', async () => {
    const mockSend = await getMockSend();
    const provider = new ResendNotificationProvider('re_test_key');
    const results = await provider.notify(
      [{ userId: 'u2' }],
      { channel: 'email', email: { subject: 'Hi', body: 'body' } },
    );

    expect(mockSend).not.toHaveBeenCalled();
    expect(results[0]).toMatchObject({
      recipientId: 'u2',
      channel: 'email',
      success: false,
    });
  });

  it('returns failure when Resend API returns an error', async () => {
    const mockSend = await getMockSend();
    mockSend.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'Invalid from address' },
    });

    const provider = new ResendNotificationProvider('re_test_key');
    const results = await provider.notify(
      [{ userId: 'u3', email: 'user@example.com' }],
      { channel: 'email', email: { subject: 'Hi', body: 'body' } },
    );

    expect(results[0]).toMatchObject({
      recipientId: 'u3',
      success: false,
      error: 'Invalid from address',
    });
  });

  it('returns failure when Resend throws', async () => {
    const mockSend = await getMockSend();
    mockSend.mockRejectedValue(new Error('Network timeout'));

    const provider = new ResendNotificationProvider('re_test_key');
    const results = await provider.notify(
      [{ userId: 'u4', email: 'user@example.com' }],
      { channel: 'email', email: { subject: 'Hi', body: 'body' } },
    );

    expect(results[0]).toMatchObject({
      recipientId: 'u4',
      success: false,
      error: 'Network timeout',
    });
  });

  it('handles in-app notifications by succeeding without sending email', async () => {
    const mockSend = await getMockSend();
    const provider = new ResendNotificationProvider('re_test_key');
    const results = await provider.notify(
      [{ userId: 'u5', email: 'user@example.com' }],
      { channel: 'in-app', inApp: { title: 'New ticket', body: 'You have a new ticket' } },
    );

    expect(mockSend).not.toHaveBeenCalled();
    expect(results[0]).toMatchObject({ recipientId: 'u5', success: true });
  });

  it('sends to multiple recipients and collects all results', async () => {
    const mockSend = await getMockSend();
    mockSend
      .mockResolvedValueOnce({ data: { id: '1' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { name: 'err', message: 'Bounce' } });

    const provider = new ResendNotificationProvider('re_test_key');
    const results = await provider.notify(
      [
        { userId: 'a', email: 'a@example.com' },
        { userId: 'b', email: 'b@example.com' },
      ],
      { channel: 'email', email: { subject: 'Hi', body: 'body' } },
    );

    expect(results[0]).toMatchObject({ recipientId: 'a', success: true });
    expect(results[1]).toMatchObject({ recipientId: 'b', success: false, error: 'Bounce' });
  });
});
