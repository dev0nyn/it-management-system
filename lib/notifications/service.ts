import * as repo from "./repository";

export async function sendInApp(
  userId: string,
  title: string,
  body: string,
  link?: string
) {
  try {
    await repo.createNotification({ userId, title, body, link });
  } catch (err) {
    console.error("[notifications] failed to persist in-app notification:", err);
  }
}
