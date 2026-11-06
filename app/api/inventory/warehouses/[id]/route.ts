import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { deleteWarehouse, saveWarehouse } from '@/lib/inventory-store';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = await request.json();
    return NextResponse.json(await saveWarehouse({ ...body, id }));
  } catch (error) {
    return inventoryError(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const { id } = await params;
    return NextResponse.json(await deleteWarehouse(id));
  } catch (error) {
    return inventoryError(error);
  }
}
