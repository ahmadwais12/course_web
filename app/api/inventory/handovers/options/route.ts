import { NextResponse } from 'next/server';
import { requireVerificationUser, verificationError } from '@/lib/verification-api';
import { handoverOptions } from '@/lib/handover-store';

export async function GET() {
  try {
    const auth = await requireVerificationUser();
    if (!auth.ok) return auth.response;
    return NextResponse.json(await handoverOptions(auth.access.actor));
  } catch (error: unknown) {
    return verificationError(error);
  }
}
