import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { listItems, saveItem } from '@/lib/inventory-store';

export async function GET(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  const url = new URL(request.url);
  try {
    const items = await listItems({
      q: url.searchParams.get('q') ?? undefined,
      unit: url.searchParams.get('unit') ?? undefined,
      qty_level: url.searchParams.get('qty_level') ?? undefined,
    });
    return NextResponse.json(items);
  } catch (error) {
    return inventoryError(error);
  }
}

export async function POST(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const body = await request.json();
    const item = await saveItem(body);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return inventoryError(error);
  }
}
