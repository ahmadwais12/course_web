import { NextResponse } from 'next/server';
import { deleteHolder, saveHolder } from '@/lib/asset-store';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const { id } = await params;
    return NextResponse.json(await saveHolder({ ...(await request.json()), id }));
  } catch (error) {
    return inventoryError(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const { id } = await params;
    return NextResponse.json(await deleteHolder(id));
  } catch (error) {
    return inventoryError(error);
  }
}
