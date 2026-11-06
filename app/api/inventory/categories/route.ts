import { NextResponse } from 'next/server';
import { listCategories, saveCategory } from '@/lib/asset-store';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';

export async function GET() {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    return NextResponse.json(await listCategories());
  } catch (error) {
    return inventoryError(error);
  }
}

export async function POST(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const body = await request.json();
    const row = await saveCategory({ name: body.name });
    return NextResponse.json({ id: row.id, name: row.description, created_at: row.created_at }, { status: 201 });
  } catch (error) {
    return inventoryError(error);
  }
}
