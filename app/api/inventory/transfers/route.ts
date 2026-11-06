import { NextResponse } from 'next/server';
import { listTransfers, saveTransfer } from '@/lib/asset-store';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';

export async function GET(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const assetId = new URL(request.url).searchParams.get('asset_id') ?? undefined;
    return NextResponse.json(await listTransfers(assetId));
  } catch (error) {
    return inventoryError(error);
  }
}

export async function POST(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    return NextResponse.json(await saveTransfer(await request.json()), { status: 201 });
  } catch (error) {
    return inventoryError(error);
  }
}
