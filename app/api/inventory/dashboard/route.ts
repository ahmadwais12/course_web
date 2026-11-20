import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { inventoryDashboard } from '@/lib/inventory-dashboard';

export async function GET(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const params = new URL(request.url).searchParams;
    return NextResponse.json(inventoryDashboard({
      from: params.get('from'),
      to: params.get('to'),
      stockStatus: params.get('stockStatus'),
      assetStatus: params.get('assetStatus'),
      department: params.get('department'),
      location: params.get('location'),
    }));
  } catch (error) {
    return inventoryError(error);
  }
}
