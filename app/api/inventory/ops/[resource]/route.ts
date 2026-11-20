import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { REGISTERS, isRegisterKey, registerFieldKeys } from '@/lib/inventory-registers';
import { listRecords, saveRecord } from '@/lib/ops-store';

type Ctx = { params: Promise<{ resource: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const { resource } = await params;
    if (!isRegisterKey(resource)) {
      return NextResponse.json({ error: 'Unknown register.' }, { status: 400 });
    }
    const q = new URL(request.url).searchParams.get('q') ?? '';
    return NextResponse.json(await listRecords(resource, q));
  } catch (error) {
    return inventoryError(error);
  }
}

export async function POST(request: Request, { params }: Ctx) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const { resource } = await params;
    if (!isRegisterKey(resource)) {
      return NextResponse.json({ error: 'Unknown register.' }, { status: 400 });
    }
    const config = REGISTERS[resource];
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json(
      await saveRecord(resource, body, registerFieldKeys(config), config.primary),
      { status: 201 }
    );
  } catch (error) {
    return inventoryError(error);
  }
}
