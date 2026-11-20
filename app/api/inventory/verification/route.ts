import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { listAdjustments, listItems } from '@/lib/inventory-store';
import { listAssets } from '@/lib/asset-store';

export async function GET() {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const [items, adjustments, assets] = await Promise.all([
      listItems({}),
      listAdjustments({ reason: 'count' }),
      listAssets({}),
    ]);

    const lastCount = new Map<string, (typeof adjustments)[number]>();
    for (const row of adjustments) {
      if (!lastCount.has(row.item_id)) lastCount.set(row.item_id, row);
    }

    const stock = items.map((item) => {
      const count = lastCount.get(item.id);
      return {
        id: item.id,
        bin_card_number: item.bin_card_number,
        item_name: item.item_name,
        unit_label: item.unit_label,
        quantity: item.quantity,
        min_quantity: item.min_quantity,
        qty_level: item.qty_level,
        last_count_date: count ? count.adjusted_at.slice(0, 10) : null,
        last_variance: count ? count.quantity_change : null,
        last_note: count?.note ?? '',
      };
    });

    const assetRows = assets.map((asset) => ({
      id: asset.id,
      tag_number: asset.tag_number,
      asset_name: asset.asset_name,
      status: asset.status,
      holder_name: asset.holder_name,
      department: asset.department,
      location: asset.location,
      province: asset.province,
      quantity: asset.quantity,
      book_value: asset.depreciable ? asset.book_value : null,
    }));

    return NextResponse.json({
      stock,
      assets: assetRows,
      summary: {
        items: stock.length,
        below: stock.filter((row) => row.qty_level === 'below').length,
        atMinimum: stock.filter((row) => row.qty_level === 'at').length,
        neverCounted: stock.filter((row) => !row.last_count_date).length,
        assets: assetRows.length,
        unassignedAssets: assetRows.filter((row) => !row.holder_name).length,
      },
    });
  } catch (error) {
    return inventoryError(error);
  }
}
