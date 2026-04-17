import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import * as ticketService from '@/lib/tickets/service';
import * as assetService from '@/lib/assets/service';
import * as monitoringService from '@/lib/monitoring/service';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema/users';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

interface GoogleChatEvent {
  type: string;
  message?: { text: string; sender: { name: string } };
  user?: { name: string; displayName: string };
}

/**
 * POST /api/v1/integrations/google-chat/webhook
 *
 * Handles inbound slash commands from Google Chat.
 * Verifies signature, resolves caller identity, dispatches to service layer.
 */
export async function POST(req: NextRequest) {
  // 1. Verify signature
  const signature = req.headers.get('X-Goog-Signature');
  const signingSecret = process.env.GOOGLE_CHAT_SIGNING_SECRET;

  if (!signingSecret) {
    return NextResponse.json(
      { error: { code: 'CONFIG_ERROR', message: 'Signing secret not configured' } },
      { status: 500 },
    );
  }

  const rawBody = await req.text();

  if (!signature || !verifySignature(rawBody, signature, signingSecret)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid or missing signature' } },
      { status: 401 },
    );
  }

  const event: GoogleChatEvent = JSON.parse(rawBody);

  if (event.type !== 'MESSAGE' || !event.message?.text) {
    return ephemeralCard('Unsupported event type');
  }

  // 2. Resolve caller identity
  const googleId = event.user?.name ?? event.message.sender.name;
  const caller = await resolveGoogleUser(googleId);

  if (!caller) {
    return ephemeralCard(
      'Your Google account is not linked to CoDev ITMS. ' +
      'Visit your CoDev settings to link your Google identity.',
    );
  }

  // 3. Parse and dispatch command
  const text = event.message.text.trim();
  return dispatchCommand(text, caller);
}

// ── Command dispatcher ──────────────────────────────────────────────────────

interface CallerContext {
  id: string;
  role: string;
  name: string;
}

async function dispatchCommand(text: string, caller: CallerContext) {
  const parts = text.split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const sub = parts[1]?.toLowerCase();

  if (cmd === '/ticket' && sub === 'new') {
    const title = parts.slice(2).join(' ');
    if (!title) return ephemeralCard('Usage: /ticket new <title>');

    try {
      const ticket = await ticketService.createTicket(
        { title, description: title, priority: 'medium', category: 'general' },
        caller.id,
      );
      return ephemeralCard(`Ticket created: **${ticket.id}**\nTitle: ${ticket.title}\nStatus: ${ticket.status}`);
    } catch (err) {
      return ephemeralCard(`Failed to create ticket: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (cmd === '/ticket' && sub === 'status') {
    const ticketId = parts[2];
    if (!ticketId) return ephemeralCard('Usage: /ticket status <id>');

    try {
      const ticket = await ticketService.getTicket(ticketId);
      return ephemeralCard(
        `**${ticket.title}**\nStatus: ${ticket.status}\nPriority: ${ticket.priority}\nAssignee: ${ticket.assigneeId ?? 'Unassigned'}`,
      );
    } catch {
      return ephemeralCard(`Ticket ${ticketId} not found`);
    }
  }

  if (cmd === '/asset' && sub === 'assign') {
    if (caller.role === 'end_user') {
      return ephemeralCard('Permission denied: asset assignment requires it_staff or admin role');
    }
    const assetId = parts[2];
    const userId = parts[3];
    if (!assetId || !userId) return ephemeralCard('Usage: /asset assign <assetId> <userId>');

    try {
      const asset = await assetService.assignAsset(assetId, userId);
      return ephemeralCard(`Asset **${asset.name}** assigned to user ${userId}`);
    } catch (err) {
      return ephemeralCard(`Failed to assign asset: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (cmd === '/ping') {
    const deviceId = parts[1];
    if (!deviceId) return ephemeralCard('Usage: /ping <deviceId>');

    try {
      const device = await monitoringService.getDevice(deviceId);
      return ephemeralCard(
        `**${device.name}** (${device.host})\nStatus: ${device.status}\nLast checked: ${device.lastCheckedAt ?? 'never'}`,
      );
    } catch {
      return ephemeralCard(`Device ${deviceId} not found`);
    }
  }

  return ephemeralCard(
    'Unknown command. Available:\n' +
    '• /ticket new <title>\n' +
    '• /ticket status <id>\n' +
    '• /asset assign <assetId> <userId>\n' +
    '• /ping <deviceId>',
  );
}

// ── Helpers ────────���────────────────────────────────────────────────────────

function verifySignature(body: string, signature: string, secret: string): boolean {
  try {
    const expected = createHmac('sha256', secret).update(body).digest('base64');
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

async function resolveGoogleUser(googleId: string): Promise<CallerContext | null> {
  const [user] = await db
    .select({ id: users.id, role: users.role, name: users.name })
    .from(users)
    .where(eq(users.googleId, googleId))
    .limit(1);

  if (!user) return null;
  return { id: user.id, role: user.role, name: user.name };
}

function ephemeralCard(text: string) {
  return NextResponse.json({
    actionResponse: { type: 'NEW_MESSAGE' },
    privateMessageViewer: {},
    text,
  });
}
