import { NextResponse } from 'next/server';
import { requireVerificationUser, verificationError } from '@/lib/verification-api';
import {
  deleteCampaign,
  getCampaign,
  setCampaignStatus,
  updateCampaign,
} from '@/lib/verification-store';
import { isCampaignStatus } from '@/lib/verification';

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: Ctx) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    const { id } = await params;
    return NextResponse.json(await getCampaign(id, access.access.actor));
  } catch (error) {
    return verificationError(error);
  }
}

export async function PUT(request: Request, { params }: Ctx) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    const { id } = await params;
    return NextResponse.json(await updateCampaign(id, await request.json(), access.access.actor));
  } catch (error) {
    return verificationError(error);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    const { id } = await params;
    const body = (await request.json()) as { status?: string };
    const status = String(body.status ?? '');
    if (!isCampaignStatus(status)) {
      return NextResponse.json({ error: 'Unknown campaign status.' }, { status: 400 });
    }
    return NextResponse.json(await setCampaignStatus(id, status, access.access.actor));
  } catch (error) {
    return verificationError(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    const { id } = await params;
    return NextResponse.json(await deleteCampaign(id, access.access.actor));
  } catch (error) {
    return verificationError(error);
  }
}
