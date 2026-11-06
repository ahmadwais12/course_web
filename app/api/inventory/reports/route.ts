import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { inventoryReport } from '@/lib/inventory-store';

export async function GET() {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    return NextResponse.json(await inventoryReport());
  } catch (error) {
    return inventoryError(error);
  }
}
