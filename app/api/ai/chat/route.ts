import { NextResponse, after } from 'next/server';
import { aiErrorResponse, readJson } from '@/lib/ai/http';
import { resolveAccess, sendChat } from '@/lib/ai/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Send a message to the assistant. Body: { message, conversationId?, requestId?, pagePath?, language? }.
 * Tenant, user, role, and permissions are resolved from the session — never from the body.
 */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const access = await resolveAccess();
    const result = await sendChat(access, body, { defer: (task) => after(task) });
    return NextResponse.json(result);
  } catch (error) {
    return aiErrorResponse(error, 'ai/chat');
  }
}
