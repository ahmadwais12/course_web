import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { listPurchases, savePurchase } from '@/lib/inventory-store';

export async function GET(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const params = new URL(request.url).searchParams;
    return NextResponse.json(
      await listPurchases({
        status: params.get('status') ?? undefined,
        supplier_id: params.get('supplier_id') ?? undefined,
        item_id: params.get('item_id') ?? undefined,
        q: params.get('q') ?? undefined,
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
    const body = await request.json();
    return NextResponse.json(await savePurchase(body), { status: 201 });
  } catch (error) {
    return inventoryError(error);
  }
}
