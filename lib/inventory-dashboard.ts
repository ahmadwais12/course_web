import { ASSET_STATUSES } from '@/lib/asset-options';
import { assetSummary, listAssets } from '@/lib/asset-store';
import { inventoryReport, listPurchases, listSuppliers, listWarehouses } from '@/lib/inventory-store';

export type InventoryDashboardFilters = {
  from?: string | null;
  to?: string | null;
  stockStatus?: string | null;
  assetStatus?: string | null;
  department?: string | null;
  location?: string | null;
};

export function inventoryDashboard(filters: InventoryDashboardFilters = {}) {
  const stock = inventoryReport({ from: filters.from, to: filters.to, stockStatus: filters.stockStatus });
  const assets = assetSummary({
    status: filters.assetStatus,
    department: filters.department,
    location: filters.location,
  });
  const allAssets = listAssets({});
  const range = (value: string) => (!filters.from || value >= filters.from) && (!filters.to || value <= filters.to);
  const purchases = listPurchases().filter((purchase) => range(purchase.order_date));
  const suppliers = listSuppliers();
  const warehouses = listWarehouses();
  const uniqueAssetValues = (field: 'department' | 'location') =>
    [...new Set(allAssets.map((asset) => asset[field]?.trim() || 'Unspecified'))].sort((a, b) => a.localeCompare(b));

  return {
    ...stock,
    assets,
    procurement: {
      purchase_orders: purchases.length,
      open_orders: purchases.filter((purchase) => purchase.status === 'draft' || purchase.status === 'ordered').length,
      received_value: purchases
        .filter((purchase) => purchase.status === 'received')
        .reduce((sum, purchase) => sum + Number(purchase.total_price || 0), 0),
      suppliers: suppliers.length,
      by_status: ['draft', 'ordered', 'received', 'cancelled'].map((status) => ({
        name: status[0].toUpperCase() + status.slice(1),
        count: purchases.filter((purchase) => purchase.status === status).length,
      })),
    },
    warehouse: { locations: warehouses.length },
    filter_options: {
      stock_status: [
        { value: 'comfortable', label: 'Comfortable' },
        { value: 'at', label: 'At minimum' },
        { value: 'below', label: 'Below minimum' },
      ],
      asset_status: ASSET_STATUSES.map((status) => ({ value: status, label: status })),
      departments: uniqueAssetValues('department').map((value) => ({ value, label: value })),
      locations: uniqueAssetValues('location').map((value) => ({ value, label: value })),
    },
  };
}
