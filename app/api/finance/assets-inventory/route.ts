import { NextResponse } from 'next/server';
import { requireDashboardUser, dashboardError } from '@/lib/dashboard-api';
import { listAssets } from '@/lib/asset-store';
import { getSettings, listItems, listPurchases } from '@/lib/inventory-store';

type AssetRow = Awaited<ReturnType<typeof listAssets>>[number];
type PurchaseRow = Awaited<ReturnType<typeof listPurchases>>[number];

const round = (value: number) => Math.round(value * 100) / 100;

function inRange(value: string | null | undefined, from: string, to: string) {
  const date = String(value ?? '').slice(0, 10);
  if (!date) return !from && !to;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export async function GET(request: Request) {
  try {
    const auth = await requireDashboardUser();
    if (!auth.ok) return auth.response;

    const params = new URL(request.url).searchParams;
    const from = (params.get('from') ?? '').trim();
    const to = (params.get('to') ?? '').trim();

    const [settings, itemRows, purchaseRows, assets] = await Promise.all([
      getSettings(),
      listItems({}),
      listPurchases({}),
      listAssets({}),
    ]);

    const assetRows = assets.map((asset: AssetRow) => {
      const quantity = Math.max(1, Number(asset.quantity) || 1);
      const totalCost = round((Number(asset.cost) || 0) * quantity);
      return {
        id: asset.id,
        tagNumber: asset.tag_number,
        name: asset.asset_name,
        category: asset.category_name || 'Uncategorized',
        department: asset.department || 'Unspecified',
        location: asset.location || 'Unspecified',
        status: asset.status,
        currency: asset.asset_currency || settings.currency,
        quantity,
        unitCost: Number(asset.cost) || 0,
        totalCost,
        accumulated: round(Number(asset.accumulated_depreciation) || 0),
        bookValue: round(Number(asset.book_value) || 0),
        depreciable: Boolean(asset.depreciable),
        fullyDepreciated: Boolean(asset.fully_depreciated),
        invoiceDate: asset.invoice_date || '',
        discovered: asset.tag_number.startsWith('DISC-'),
      };
    });

    const byCurrency = new Map<string, { currency: string; count: number; cost: number; accumulated: number; bookValue: number }>();
    for (const row of assetRows) {
      const bucket = byCurrency.get(row.currency) ?? {
        currency: row.currency,
        count: 0,
        cost: 0,
        accumulated: 0,
        bookValue: 0,
      };
      bucket.count += 1;
      bucket.cost += row.totalCost;
      bucket.accumulated += row.accumulated;
      bucket.bookValue += row.bookValue;
      byCurrency.set(row.currency, bucket);
    }
    const currencies = [...byCurrency.values()]
      .map((row) => ({
        currency: row.currency,
        count: row.count,
        cost: round(row.cost),
        accumulated: round(row.accumulated),
        bookValue: round(row.bookValue),
      }))
      .sort((a, b) => b.bookValue - a.bookValue);
    const primaryCurrency = currencies[0]?.currency ?? settings.currency;
    const primaryAssets = assetRows.filter((row) => row.currency === primaryCurrency);
    const primaryTotals = currencies[0] ?? { cost: 0, accumulated: 0, bookValue: 0, count: 0 };

    const departmentMap = new Map<string, number>();
    for (const row of primaryAssets) {
      if (!row.bookValue) continue;
      departmentMap.set(row.department, (departmentMap.get(row.department) ?? 0) + row.bookValue);
    }
    const departments = [...departmentMap.entries()]
      .map(([name, value]) => ({ name, value: round(value) }))
      .sort((a, b) => b.value - a.value);

    const stockRows = itemRows
      .map((item) => ({
        id: item.id,
        binCard: item.bin_card_number,
        name: item.item_name,
        unit: item.unit_label,
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unit_price) || 0,
        value: round(Number(item.total_price) || 0),
        minQuantity: Number(item.min_quantity) || 0,
        qtyLevel: item.qty_level,
      }))
      .sort((a, b) => b.value - a.value);
    const stockValue = round(stockRows.reduce((sum, row) => sum + row.value, 0));
    const unitsOnHand = round(stockRows.reduce((sum, row) => sum + row.quantity, 0));
    const lowStock = stockRows.filter((row) => row.qtyLevel !== 'comfortable').length;
    const outOfStock = stockRows.filter((row) => row.quantity <= 0).length;

    const filteredPurchases = purchaseRows.filter((row: PurchaseRow) =>
      inRange(row.status === 'received' ? row.received_date : row.order_date, from, to)
    );
    const purchaseList = filteredPurchases
      .map((row: PurchaseRow) => ({
        id: row.id,
        reference: row.reference,
        supplier: row.supplier_name,
        item: row.item_name,
        quantity: Number(row.quantity) || 0,
        unitPrice: Number(row.unit_price) || 0,
        value: round(Number(row.total_price) || 0),
        status: row.status,
        date: row.status === 'received' ? row.received_date || row.order_date : row.order_date,
        receivedDate: row.received_date || '',
      }))
      .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')));
    const sumBy = (status: string) =>
      round(purchaseList.filter((row) => row.status === status).reduce((sum, row) => sum + row.value, 0));
    const countBy = (status: string) => purchaseList.filter((row) => row.status === status).length;

    const discoveries = assetRows.filter((row) => row.discovered);

    return NextResponse.json({
      currency: settings.currency,
      primaryCurrency,
      currencies,
      assets: {
        registered: assetRows.length,
        depreciable: primaryAssets.filter((row) => row.depreciable).length,
        fullyDepreciated: primaryAssets.filter((row) => row.fullyDepreciated).length,
        cost: primaryTotals.cost,
        accumulated: primaryTotals.accumulated,
        bookValue: primaryTotals.bookValue,
        discovered: discoveries.length,
        discoveredValue: round(
          discoveries
            .filter((row) => row.currency === primaryCurrency)
            .reduce((sum, row) => sum + row.totalCost, 0)
        ),
      },
      stock: {
        items: stockRows.length,
        units: unitsOnHand,
        value: stockValue,
        lowStock,
        outOfStock,
      },
      purchases: {
        receivedCount: countBy('received'),
        receivedValue: sumBy('received'),
        orderedCount: countBy('ordered'),
        orderedValue: sumBy('ordered'),
        draftCount: countBy('draft'),
        cancelledCount: countBy('cancelled'),
      },
      departments,
      topStock: stockRows.slice(0, 6).map((row) => ({ name: row.name, value: row.value })),
      assetRows: primaryAssets,
      otherCurrencyAssets: currencies.length > 1,
      stockRows,
      purchaseRows: purchaseList,
    });
  } catch (error: unknown) {
    return dashboardError(error, 'Failed to load assets and inventory valuation');
  }
}
