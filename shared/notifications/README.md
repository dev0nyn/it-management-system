# Shared Notification Service

Interface for sending notifications (email and in-app) consumed by the Tickets and Monitoring modules.

## Usage

```ts
import { createNotificationService } from '@/shared/notifications';
import type { NotificationService } from '@/shared/notifications';

const notificationService = createNotificationService();

await notificationService.notify(
  [{ userId: 'user-1', email: 'user@example.com' }],
  {
    channel: 'email',
    email: {
      subject: 'New ticket assigned',
      body: 'Ticket #42 has been assigned to you.',
    },
  },
);
```

## Available Providers

| Provider  | Env       | Behavior                              |
| --------- | --------- | ------------------------------------- |
| `console` | dev       | Logs notifications to stdout          |
| `noop`    | test / CI | Returns success silently, no side effects |
| `smtp`    | prod      | _(not yet implemented)_               |

The factory auto-selects `noop` in test and `console` otherwise. Override explicitly:

```ts
const service = createNotificationService('console');
```

## Adding a New Provider

1. Create a class implementing `NotificationService` from `./types.ts`.
2. Add the provider name to the `NotificationProviderName` union in `create-notification-service.ts`.
3. Add a `case` in the factory switch.
4. Export the class from `index.ts`.

## Design Principles

- **Consumers depend on the interface, not a concrete implementation.** Import `NotificationService` type only.
- **Notification failures never fail requests.** Callers should catch and log errors from `notify()`.
- **Swapping providers is a one-file change** (`create-notification-service.ts`).
