import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { REGISTERS, isRegisterKey, registerFieldKeys } from '@/lib/inventory-registers';
import { deleteRecord, saveRecord } from '@/lib/ops-store';

type Ctx = { params: Promise<{ resource: string; id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const { resource, id } = await params;
    if (!isRegisterKey(resource)) {
      return NextResponse.json({ error: 'Unknown register.' }, { status: 400 });
    }
    const config = REGISTERS[resource];
    const body = (await request.json()) as Record<string, unknown>;
    return NextResponse.json(
      await saveRecord(resource, { ...body, id }, registerFieldKeys(config), config.primary)
    );
  } catch (error) {
    return inventoryError(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const { resource, id } = await params;
    if (!isRegisterKey(resource)) {
      return NextResponse.json({ error: 'Unknown register.' }, { status: 400 });
    }
    return NextResponse.json(await deleteRecord(resource, id));
  } catch (error) {
    return inventoryError(error);
  }
}
