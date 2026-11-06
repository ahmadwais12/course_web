import { NextResponse } from 'next/server';
import { listAssets, saveAsset } from '@/lib/asset-store';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';

export async function GET(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  const url = new URL(request.url);
  try {
    return NextResponse.json(
      await listAssets({
        q: url.searchParams.get('q') ?? undefined,
        trash: url.searchParams.get('trash') === '1',
        status: url.searchParams.get('status') ?? undefined,
      })
    );
  } catch (error) {
    return inventoryError(error);
  }
}

export async function POST(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    return NextResponse.json(await saveAsset(await request.json()), { status: 201 });
  } catch (error) {
    return inventoryError(error);
  }
}
