import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { inventoryReport } from '@/lib/inventory-store';
import { assetSummary } from '@/lib/asset-store';

export async function GET() {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const [stock, assets] = await Promise.all([inventoryReport(), assetSummary()]);
    return NextResponse.json({ ...stock, assets });
  } catch (error) {
    return inventoryError(error);
  }
}
