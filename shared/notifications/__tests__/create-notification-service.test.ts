import { describe, it, expect, vi } from 'vitest';
import { createNotificationService } from '../create-notification-service';
import { NoOpNotificationProvider } from '../noop-notification-provider';
import { ConsoleNotificationProvider } from '../console-notification-provider';

describe('createNotificationService', () => {
  it('returns NoOpNotificationProvider when provider is "noop"', () => {
    const service = createNotificationService('noop');
    expect(service).toBeInstanceOf(NoOpNotificationProvider);
  });

  it('returns ConsoleNotificationProvider when provider is "console"', () => {
    const service = createNotificationService('console');
    expect(service).toBeInstanceOf(ConsoleNotificationProvider);
  });

  it('defaults to noop in test environment', () => {
    const service = createNotificationService();
    expect(service).toBeInstanceOf(NoOpNotificationProvider);
  });

  it('defaults to console in non-test environment', () => {
    vi.stubEnv('NODE_ENV', 'development');

    const service = createNotificationService();
    expect(service).toBeInstanceOf(ConsoleNotificationProvider);

    vi.unstubAllEnvs();
  });
});
