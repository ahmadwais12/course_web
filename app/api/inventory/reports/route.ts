import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { inventoryReport } from '@/lib/inventory-store';

export async function GET(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const params = new URL(request.url).searchParams;
    return NextResponse.json(await inventoryReport({ from: params.get('from'), to: params.get('to'), stockStatus: params.get('stockStatus') }));
  } catch (error) {
    return inventoryError(error);
  }
}
