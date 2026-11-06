import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { listWarehouses, saveWarehouse } from '@/lib/inventory-store';

export async function GET() {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    return NextResponse.json(await listWarehouses());
  } catch (error) {
    return inventoryError(error);
  }
}

export async function POST(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const body = await request.json();
    return NextResponse.json(await saveWarehouse(body), { status: 201 });
  } catch (error) {
    return inventoryError(error);
  }
}
