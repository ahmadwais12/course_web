import { NextResponse } from 'next/server';
import { deleteProperty, saveProperty } from '@/lib/asset-store';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const { id } = await params;
    return NextResponse.json(await saveProperty({ ...(await request.json()), id }));
  } catch (error) {
    return inventoryError(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const { id } = await params;
    return NextResponse.json(await deleteProperty(id));
  } catch (error) {
    return inventoryError(error);
  }
}
