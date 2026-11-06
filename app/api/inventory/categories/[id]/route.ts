import { NextResponse } from 'next/server';
import { deleteProperty, saveCategory } from '@/lib/asset-store';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = await request.json();
    const row = await saveCategory({ id, name: body.name });
    return NextResponse.json({ id: row.id, name: row.description, created_at: row.created_at });
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
