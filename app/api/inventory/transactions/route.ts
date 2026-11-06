import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { listTransactions, saveTransaction } from '@/lib/inventory-store';

export async function GET(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  const url = new URL(request.url);
  try {
    const rows = await listTransactions({
      type: url.searchParams.get('type') ?? undefined,
      item_id: url.searchParams.get('item_id') ?? undefined,
      department: url.searchParams.get('department') ?? undefined,
      location: url.searchParams.get('location') ?? undefined,
      holder: url.searchParams.get('holder') ?? undefined,
      date_from: url.searchParams.get('date_from') ?? undefined,
      date_to: url.searchParams.get('date_to') ?? undefined,
      q: url.searchParams.get('q') ?? undefined,
    });
    return NextResponse.json(rows);
  } catch (error) {
    return inventoryError(error);
  }
}

export async function POST(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const body = await request.json();
    return NextResponse.json(await saveTransaction(body), { status: 201 });
  } catch (error) {
    return inventoryError(error);
  }
}
