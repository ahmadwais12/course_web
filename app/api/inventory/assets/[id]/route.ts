import { NextResponse } from 'next/server';
import { purgeAsset, restoreAsset, saveAsset, trashAsset } from '@/lib/asset-store';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const { id } = await params;
    const body = await request.json();
    if (body.action === 'restore') return NextResponse.json(await restoreAsset(id));
    if (body.action === 'purge') return NextResponse.json(await purgeAsset(id));
    return NextResponse.json(await saveAsset({ ...body, id }));
  } catch (error) {
    return inventoryError(error);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const { id } = await params;
    return NextResponse.json(await trashAsset(id));
  } catch (error) {
    return inventoryError(error);
  }
}
