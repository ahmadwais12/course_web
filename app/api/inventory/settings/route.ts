import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { getSettings, saveSettings } from '@/lib/inventory-store';

export async function GET() {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    return NextResponse.json(await getSettings());
  } catch (error) {
    return inventoryError(error);
  }
}

export async function PATCH(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const body = await request.json();
    return NextResponse.json(await saveSettings(body));
  } catch (error) {
    return inventoryError(error);
  }
}
