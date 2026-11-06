import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { deleteItem, getItem, saveItem } from '@/lib/inventory-store';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const { id } = await params;
    return NextResponse.json(await getItem(id));
  } catch (error) {
    return inventoryError(error);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = await request.json();
    return NextResponse.json(await saveItem({ ...body, id }));
  } catch (error) {
    return inventoryError(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const { id } = await params;
    return NextResponse.json(await deleteItem(id));
  } catch (error) {
    return inventoryError(error);
  }
}
