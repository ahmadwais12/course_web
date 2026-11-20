import { NextResponse } from 'next/server';
import { requireVerificationUser, verificationError } from '@/lib/verification-api';
import { getHandover, handoverAction } from '@/lib/handover-store';

type Props = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Props) {
  try {
    const auth = await requireVerificationUser();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const row = await getHandover(id, auth.access.actor);
    return NextResponse.json(row);
  } catch (error: unknown) {
    return verificationError(error);
  }
}

export async function PATCH(request: Request, { params }: Props) {
  try {
    const auth = await requireVerificationUser();
    if (!auth.ok) return auth.response;
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? '').trim();
    if (!['submit', 'approve', 'reject', 'cancel', 'receive', 'return'].includes(action)) {
      return NextResponse.json({ error: 'Unknown handover action.' }, { status: 400 });
    }
    const row = await handoverAction(id, action, auth.access.actor, body);
    return NextResponse.json(row);
  } catch (error: unknown) {
    return verificationError(error);
  }
}
