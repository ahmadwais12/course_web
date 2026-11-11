import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { listSuppliers, saveSupplier } from '@/lib/inventory-store';

export async function GET(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const params = new URL(request.url).searchParams;
    return NextResponse.json(
      await listSuppliers({ q: params.get('q') ?? undefined, status: params.get('status') ?? undefined })
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
    return NextResponse.json(await saveSupplier(body), { status: 201 });
  } catch (error) {
    return inventoryError(error);
  }
}
