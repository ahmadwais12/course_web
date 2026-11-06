import { NextResponse } from 'next/server';
import { listProperties, saveProperty } from '@/lib/asset-store';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';

export async function GET(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const type = new URL(request.url).searchParams.get('type') ?? undefined;
    return NextResponse.json(await listProperties(type));
  } catch (error) {
    return inventoryError(error);
  }
}

export async function POST(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    return NextResponse.json(await saveProperty(await request.json()), { status: 201 });
  } catch (error) {
    return inventoryError(error);
  }
}
