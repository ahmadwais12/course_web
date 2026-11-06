import { inventoryReport, listItems } from '@/lib/inventory-store';
import { ToolScopeError, money, num, scopeInfo, type ToolDefinition } from '@/lib/ai/tools/common';

const SHARED_NOTE =
  'Inventory data is installation-wide: the inventory module is not yet separated per organization.';

/** The inventory store has no tenant column, so these tools refuse anything but platform scope. */
function requirePlatformScope(ctx: Parameters<ToolDefinition['execute']>[1]) {
  if (!ctx.isPlatformScope) throw new ToolScopeError('Inventory is only available at platform scope');
}

const getInventorySummary: ToolDefinition = {
  name: 'get_inventory_summary',
  module: 'inventory',
  description: 'Inventory headline numbers: item count, total on hand, stock health, and recent movements.',
  parameters: { type: 'object', properties: {} },
  async execute(_args, ctx) {
    requirePlatformScope(ctx);
    const report = await inventoryReport();
    return {
      data: { ...report.headlines, stock_health: report.stock_health, monthly_movements: report.monthly_movements },
      scope: scopeInfo(ctx),
      chart: {
        type: 'bar',
        title: 'Stock movements (last 6 months)',
        data: report.monthly_movements.map((m) => ({ label: m.month, in: m.in, out: m.out })),
        series: [
          { key: 'in', label: 'Stock in' },
          { key: 'out', label: 'Stock out' },
        ],
      },
      links: [{ label: 'Inventory Dashboard', href: '/inventory' }],
      notes: [SHARED_NOTE],
    };
  },
};

const getLowStockItems: ToolDefinition = {
  name: 'get_low_stock_items',
  module: 'inventory',
  description: 'Inventory items at or below their minimum quantity.',
  parameters: {
    type: 'object',
    properties: { limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Default 15.' } },
  },
  async execute(args, ctx) {
    requirePlatformScope(ctx);
    const limit = num(args.limit) || 15;
    const items = (await listItems({ qty_level: 'low' })).sort((a, b) => a.quantity - b.quantity);
    return {
      data: {
        low_stock_count: items.length,
        items: items.slice(0, limit).map((i) => ({
          item: i.item_name,
          bin_card: i.bin_card_number,
          quantity: i.quantity,
          minimum: i.min_quantity,
          unit: i.unit_label || null,
        })),
      },
      scope: scopeInfo(ctx),
      links: [{ label: 'Inventory Items', href: '/inventory/items' }],
      notes: [SHARED_NOTE],
    };
  },
};

const getInventoryValuation: ToolDefinition = {
  name: 'get_inventory_valuation',
  module: 'inventory',
  description: 'Current inventory value (quantity × recorded unit price) and the most valuable items.',
  parameters: { type: 'object', properties: {} },
  async execute(_args, ctx) {
    requirePlatformScope(ctx);
    const items = await listItems({});
    const ranked = [...items].sort((a, b) => b.total_price - a.total_price);
    return {
      data: {
        item_count: items.length,
        total_value: money(items.reduce((s, i) => s + num(i.total_price), 0)),
        top_items_by_value: ranked.slice(0, 10).map((i) => ({
          item: i.item_name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          value: i.total_price,
        })),
      },
      scope: scopeInfo(ctx, undefined, { basis: 'Value = on-hand quantity × unit price recorded on each item.' }),
      links: [{ label: 'Inventory Reports', href: '/reports/inventory' }],
      notes: [SHARED_NOTE, 'Item prices have no currency recorded in the inventory module.'],
    };
  },
};

export const inventoryTools: ToolDefinition[] = [getInventorySummary, getLowStockItems, getInventoryValuation];
