import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { getSecurity, saveSecurity } from '@/lib/ops-store';

export async function GET() {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    return NextResponse.json(await getSecurity());
  } catch (error) {
    return inventoryError(error);
  }
}

export async function PUT(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    return NextResponse.json(await saveSecurity(await request.json()));
  } catch (error) {
    return inventoryError(error);
  }
}
