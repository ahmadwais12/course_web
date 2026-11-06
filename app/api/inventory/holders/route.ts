import { NextResponse } from 'next/server';
import { deleteHolder, listHolders, saveHolder } from '@/lib/asset-store';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';

export async function GET(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const q = new URL(request.url).searchParams.get('q') ?? '';
    return NextResponse.json(await listHolders(q));
  } catch (error) {
    return inventoryError(error);
  }
}

export async function POST(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    return NextResponse.json(await saveHolder(await request.json()), { status: 201 });
  } catch (error) {
    return inventoryError(error);
  }
}

export async function DELETE(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const id = new URL(request.url).searchParams.get('id') || '';
    return NextResponse.json(await deleteHolder(id));
  } catch (error) {
    return inventoryError(error);
  }
}
