import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

/**
 * Stock ledger taken from the Al-Hawa inventory demo (inventory-v2).
 * Rules live in INVENTORY_FROM_DEMO.md.
 * Data is a local JSON file so the module works before a Supabase migration.
 */

export type InvUnit = { id: string; name: string; created_at: string };
export type InvWarehouse = { id: string; name: string; created_at: string };

export type InvSupplier = {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export const INV_PURCHASE_STATUSES = ['draft', 'ordered', 'received', 'cancelled'] as const;
export type InvPurchaseStatus = (typeof INV_PURCHASE_STATUSES)[number];

export type InvPurchase = {
  id: string;
  reference: string;
  supplier_id: string | null;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: InvPurchaseStatus;
  order_date: string;
  expected_date: string;
  received_date: string;
  notes: string;
  tx_id: string | null;
  created_at: string;
  updated_at: string;
};

export const INV_ADJUSTMENT_REASONS = ['count', 'damage', 'loss', 'return', 'correction', 'other'] as const;
export type InvAdjustmentReason = (typeof INV_ADJUSTMENT_REASONS)[number];

export type InvAdjustment = {
  id: string;
  item_id: string;
  quantity_change: number;
  reason: InvAdjustmentReason;
  note: string;
  adjusted_at: string;
  created_at: string;
  updated_at: string;
};

export type InvItem = {
  id: string;
  bin_card_number: string;
  item_name: string;
  unit_id: string | null;
  quantity: number;
  min_quantity: number;
  unit_price: number;
  total_price: number;
  description: string;
  image_url: string;
  created_at: string;
  updated_at: string;
};

export type InvTxType = 'in' | 'out';

export const INVENTORY_CURRENCIES = ['AFN', 'USD', 'EUR', 'PKR', 'IRR'] as const;

export type InvSettings = {
  organization_name: string;
  currency: string;
  default_unit_id: string | null;
  default_warehouse: string;
  default_min_quantity: number;
  bin_card_prefix: string;
  require_description: boolean;
  require_holder: boolean;
  low_stock_alerts: boolean;
};

function defaultSettings(): InvSettings {
  return {
    organization_name: '',
    currency: 'AFN',
    default_unit_id: null,
    default_warehouse: '',
    default_min_quantity: 0,
    bin_card_prefix: '',
    require_description: true,
    require_holder: false,
    low_stock_alerts: true,
  };
}

export type InvTransaction = {
  id: string;
  item_id: string;
  transaction_type: InvTxType;
  invoice_number: string;
  quantity: number;
  price: number;
  employee_id_number: string;
  holder_name: string;
  transaction_date: string;
  department: string;
  location: string;
  transaction_description: string;
  created_at: string;
};

type Db = {
  units: InvUnit[];
  warehouses: InvWarehouse[];
  items: InvItem[];
  transactions: InvTransaction[];
  suppliers: InvSupplier[];
  purchases: InvPurchase[];
  adjustments: InvAdjustment[];
  settings: InvSettings;
};

const filePath = () =>
  process.env.INVENTORY_DATA_PATH || path.join(process.cwd(), 'data', 'inventory.json');

function emptyDb(): Db {
  const now = new Date().toISOString();
  return {
    units: ['Piece', 'Box', 'KG'].map((name) => ({ id: randomUUID(), name, created_at: now })),
    warehouses: [],
    items: [],
    transactions: [],
    suppliers: [],
    purchases: [],
    adjustments: [],
    settings: defaultSettings(),
  };
}

function readDb(): Db {
  const file = filePath();
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Partial<Db>;
    return {
      units: parsed.units ?? [],
      warehouses: parsed.warehouses ?? [],
      items: parsed.items ?? [],
      transactions: parsed.transactions ?? [],
      suppliers: parsed.suppliers ?? [],
      purchases: parsed.purchases ?? [],
      adjustments: parsed.adjustments ?? [],
      settings: { ...defaultSettings(), ...(parsed.settings ?? {}) },
    };
  } catch {
    const db = emptyDb();
    writeDb(db);
    return db;
  }
}

function writeDb(db: Db) {
  const file = filePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(db, null, 2));
}

let queue: Promise<unknown> = Promise.resolve();

function withDb<T>(fn: (db: Db) => T): Promise<T> {
  const run = queue.then(() => {
    const db = readDb();
    const result = fn(db);
    writeDb(db);
    return result;
  });
  queue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export class InventoryError extends Error {
  status: number;
  field?: string;
  constructor(message: string, status = 400, field?: string) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

function num(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function money(n: number) {
  return Math.round(n * 100) / 100;
}

function recompute(item: InvItem) {
  item.quantity = money(item.quantity);
  item.unit_price = money(item.unit_price);
  item.min_quantity = money(item.min_quantity);
  item.total_price = money(item.quantity * item.unit_price);
}

/** On-hand left for a new OUT. Editing reverses the old movement first. */
export function availableForOut(item: InvItem, previous?: InvTransaction | null) {
  let available = item.quantity;
  if (previous?.transaction_type === 'in') available -= previous.quantity;
  if (previous?.transaction_type === 'out') available += previous.quantity;
  return money(available);
}

function apply(item: InvItem, type: InvTxType, quantity: number, direction: 1 | -1) {
  if (type === 'in') item.quantity += direction * quantity;
  else item.quantity -= direction * quantity;
  if (item.quantity < -0.0001) {
    throw new InventoryError('This movement would make on-hand quantity negative.');
  }
  recompute(item);
  item.updated_at = new Date().toISOString();
}

function unitName(db: Db, id: string | null) {
  if (!id) return '';
  return db.units.find((u) => u.id === id)?.name ?? '';
}

export function presentItem(db: Db, item: InvItem) {
  const unit = unitName(db, item.unit_id);
  const level = item.quantity < item.min_quantity ? 'below' : item.quantity === item.min_quantity ? 'at' : 'comfortable';
  return { ...item, unit_label: unit, qty_level: level };
}

export function listItems(query: { q?: string; unit?: string; qty_level?: string }) {
  return withDb((db) => {
    const q = (query.q ?? '').trim().toLowerCase();
    return db.items
      .map((item) => presentItem(db, item))
      .filter((item) => {
        if (query.unit && item.unit_id !== query.unit && item.unit_label !== query.unit) return false;
        if (query.qty_level === 'low' && item.quantity > item.min_quantity) return false;
        if (query.qty_level === 'high' && item.quantity <= item.min_quantity) return false;
        if (!q) return true;
        return (
          item.item_name.toLowerCase().includes(q) ||
          item.bin_card_number.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.item_name.localeCompare(b.item_name));
  });
}

export function getItem(id: string) {
  return withDb((db) => {
    const item = db.items.find((row) => row.id === id);
    if (!item) throw new InventoryError('Item not found.', 404);
    return presentItem(db, item);
  });
}

export function saveItem(input: Partial<InvItem> & { id?: string | null }) {
  return withDb((db) => {
    const name = String(input.item_name ?? '').trim();
    if (!name) throw new InventoryError('Item name is required.', 400, 'item_name');
    const bin = String(input.bin_card_number ?? '').trim();
    if (bin && db.items.some((item) => item.bin_card_number === bin && item.id !== input.id)) {
      throw new InventoryError('Bin card number is already used.', 400, 'bin_card_number');
    }
    const unitId = input.unit_id ? String(input.unit_id) : null;
    if (unitId && !db.units.some((unit) => unit.id === unitId)) {
      throw new InventoryError('Choose a unit from the Units list.', 400, 'unit');
    }
    const now = new Date().toISOString();
    const existing = input.id ? db.items.find((item) => item.id === input.id) : undefined;
    if (input.id && !existing) throw new InventoryError('Item not found.', 404);
    const item: InvItem = existing ?? {
      id: randomUUID(),
      bin_card_number: '',
      item_name: '',
      unit_id: null,
      quantity: 0,
      min_quantity: 0,
      unit_price: 0,
      total_price: 0,
      description: '',
      image_url: '',
      created_at: now,
      updated_at: now,
    };
    item.bin_card_number = bin;
    item.item_name = name;
    item.unit_id = unitId;
    item.quantity = Math.max(0, num(input.quantity));
    item.min_quantity = Math.max(0, num(input.min_quantity));
    item.unit_price = Math.max(0, num(input.unit_price));
    item.description = String(input.description ?? '');
    item.image_url = String(input.image_url ?? '').trim();
    item.updated_at = now;
    recompute(item);
    if (!existing) db.items.push(item);
    return presentItem(db, item);
  });
}

export function deleteItem(id: string) {
  return withDb((db) => {
    const index = db.items.findIndex((item) => item.id === id);
    if (index < 0) throw new InventoryError('Item not found.', 404);
    if (db.purchases.some((row) => row.item_id === id)) {
      throw new InventoryError('This item is used by purchases. Remove those first.');
    }
    if (db.adjustments.some((row) => row.item_id === id)) {
      throw new InventoryError('This item has stock adjustments. Remove those first.');
    }
    db.items.splice(index, 1);
    db.transactions = db.transactions.filter((tx) => tx.item_id !== id);
    return { ok: true };
  });
}

export function listUnits() {
  return withDb((db) => [...db.units].sort((a, b) => a.name.localeCompare(b.name)));
}

export function saveUnit(input: { id?: string | null; name?: string }) {
  return withDb((db) => {
    const name = String(input.name ?? '').trim();
    if (!name) throw new InventoryError('Unit name is required.', 400, 'name');
    if (db.units.some((unit) => unit.name.toLowerCase() === name.toLowerCase() && unit.id !== input.id)) {
      throw new InventoryError('That unit already exists.', 400, 'name');
    }
    const existing = input.id ? db.units.find((unit) => unit.id === input.id) : undefined;
    if (input.id && !existing) throw new InventoryError('Unit not found.', 404);
    if (existing) {
      existing.name = name;
      return existing;
    }
    const unit: InvUnit = { id: randomUUID(), name, created_at: new Date().toISOString() };
    db.units.push(unit);
    return unit;
  });
}

export function deleteUnit(id: string) {
  return withDb((db) => {
    if (db.items.some((item) => item.unit_id === id)) {
      throw new InventoryError('This unit is used by an item. Change those items first.');
    }
    const index = db.units.findIndex((unit) => unit.id === id);
    if (index < 0) throw new InventoryError('Unit not found.', 404);
    db.units.splice(index, 1);
    return { ok: true };
  });
}

export function listWarehouses() {
  return withDb((db) => [...db.warehouses].sort((a, b) => a.name.localeCompare(b.name)));
}

export function saveWarehouse(input: { id?: string | null; name?: string }) {
  return withDb((db) => {
    const name = String(input.name ?? '').trim();
    if (!name) throw new InventoryError('Warehouse name is required.', 400, 'name');
    if (db.warehouses.some((row) => row.name.toLowerCase() === name.toLowerCase() && row.id !== input.id)) {
      throw new InventoryError('That warehouse already exists.', 400, 'name');
    }
    const existing = input.id ? db.warehouses.find((row) => row.id === input.id) : undefined;
    if (input.id && !existing) throw new InventoryError('Warehouse not found.', 404);
    if (existing) {
      existing.name = name;
      return existing;
    }
    const row: InvWarehouse = { id: randomUUID(), name, created_at: new Date().toISOString() };
    db.warehouses.push(row);
    return row;
  });
}

export function deleteWarehouse(id: string) {
  return withDb((db) => {
    const index = db.warehouses.findIndex((row) => row.id === id);
    if (index < 0) throw new InventoryError('Warehouse not found.', 404);
    db.warehouses.splice(index, 1);
    return { ok: true };
  });
}

function presentTx(db: Db, tx: InvTransaction) {
  const item = db.items.find((row) => row.id === tx.item_id);
  return {
    ...tx,
    item_name: item?.item_name ?? 'Deleted item',
    bin_card_number: item?.bin_card_number ?? '',
  };
}

export function listTransactions(query: {
  type?: string;
  item_id?: string;
  department?: string;
  location?: string;
  holder?: string;
  date_from?: string;
  date_to?: string;
  q?: string;
}) {
  return withDb((db) => {
    const q = (query.q ?? '').trim().toLowerCase();
    return db.transactions
      .filter((tx) => {
        if (query.type && tx.transaction_type !== query.type) return false;
        if (query.item_id && tx.item_id !== query.item_id) return false;
        if (query.department && tx.department !== query.department) return false;
        if (query.location && tx.location !== query.location) return false;
        if (query.holder && !tx.holder_name.toLowerCase().includes(query.holder.toLowerCase())) return false;
        if (query.date_from && tx.transaction_date < query.date_from) return false;
        if (query.date_to && tx.transaction_date > query.date_to) return false;
        if (!q) return true;
        const item = db.items.find((row) => row.id === tx.item_id);
        return (
          tx.invoice_number.toLowerCase().includes(q) ||
          tx.holder_name.toLowerCase().includes(q) ||
          tx.transaction_description.toLowerCase().includes(q) ||
          (item?.item_name ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date) || b.created_at.localeCompare(a.created_at))
      .map((tx) => presentTx(db, tx));
  });
}

function readTxInput(input: Partial<InvTransaction>, type: InvTxType, settings: InvSettings) {
  const quantity = num(input.quantity);
  if (!(quantity > 0)) throw new InventoryError('Quantity must be greater than zero.', 400, 'quantity');
  const description = String(input.transaction_description ?? '').trim();
  if (settings.require_description && !description) {
    throw new InventoryError('Description is required.', 400, 'transaction_description');
  }
  const holder_name = String(input.holder_name ?? '').trim();
  if (type === 'out' && settings.require_holder && !holder_name) {
    throw new InventoryError('Holder is required for stock out.', 400, 'holder_name');
  }
  const date = String(input.transaction_date ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new InventoryError('Transaction date is required.', 400, 'transaction_date');
  }
  let price = num(input.price);
  let invoice = String(input.invoice_number ?? '').trim();
  if (type === 'out') {
    if (!Number.isFinite(Number(input.price)) || input.price == null || input.price === ('' as unknown)) price = 0;
    invoice = invoice || '';
  }
  return {
    quantity,
    description,
    date,
    price: Math.max(0, price),
    invoice,
    employee_id_number: String(input.employee_id_number ?? '').trim(),
    holder_name,
    department: String(input.department ?? '').trim(),
    location: String(input.location ?? '').trim(),
  };
}

export function saveTransaction(input: Partial<InvTransaction> & { id?: string | null }) {
  return withDb((db) => {
    const type = input.transaction_type === 'out' ? 'out' : input.transaction_type === 'in' ? 'in' : null;
    if (!type) throw new InventoryError('Transaction type must be in or out.', 400, 'transaction_type');
    const item = db.items.find((row) => row.id === input.item_id);
    if (!item) throw new InventoryError('Choose an item.', 400, 'item_id');
    const fields = readTxInput(input, type, db.settings);
    const existing = input.id ? db.transactions.find((tx) => tx.id === input.id) : undefined;
    if (input.id && !existing) throw new InventoryError('Transaction not found.', 404);
    if (existing && existing.item_id !== item.id) {
      throw new InventoryError('A movement cannot change item. Delete it and create a new one.');
    }
    if (existing) apply(item, existing.transaction_type, existing.quantity, -1);
    if (type === 'out' && fields.quantity > item.quantity + 0.0001) {
      if (existing) apply(item, existing.transaction_type, existing.quantity, 1);
      throw new InventoryError(
        `Quantity exceeds on-hand stock. Maximum you can issue is ${money(item.quantity)}.`,
        400,
        'quantity'
      );
    }
    const tx: InvTransaction = existing ?? {
      id: randomUUID(),
      item_id: item.id,
      transaction_type: type,
      invoice_number: '',
      quantity: 0,
      price: 0,
      employee_id_number: '',
      holder_name: '',
      transaction_date: fields.date,
      department: '',
      location: '',
      transaction_description: '',
      created_at: new Date().toISOString(),
    };
    tx.transaction_type = type;
    tx.invoice_number = fields.invoice;
    tx.quantity = fields.quantity;
    tx.price = fields.price;
    tx.employee_id_number = fields.employee_id_number;
    tx.holder_name = fields.holder_name;
    tx.transaction_date = fields.date;
    tx.department = fields.department;
    tx.location = fields.location;
    tx.transaction_description = fields.description;
    apply(item, type, fields.quantity, 1);
    if (!existing) db.transactions.push(tx);
    return presentTx(db, tx);
  });
}

export function deleteTransaction(id: string) {
  return withDb((db) => {
    const index = db.transactions.findIndex((tx) => tx.id === id);
    if (index < 0) throw new InventoryError('Transaction not found.', 404);
    const tx = db.transactions[index];
    const item = db.items.find((row) => row.id === tx.item_id);
    if (item) apply(item, tx.transaction_type, tx.quantity, -1);
    db.transactions.splice(index, 1);
    return { ok: true };
  });
}

export function inventoryReport() {
  return withDb((db) => {
    const items = db.items.map((item) => presentItem(db, item));
    const now = new Date();
    const monthKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const movements = monthKeys.map((key) => ({
      month: key,
      in: db.transactions.filter((tx) => tx.transaction_type === 'in' && tx.transaction_date.startsWith(key)).length,
      out: db.transactions.filter((tx) => tx.transaction_type === 'out' && tx.transaction_date.startsWith(key)).length,
    }));
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffKey = cutoff.toISOString().slice(0, 10);
    const unitMix = new Map<string, number>();
    for (const item of items) {
      const label = item.unit_label || 'Unspecified';
      unitMix.set(label, (unitMix.get(label) ?? 0) + 1);
    }
    return {
      headlines: {
        inventory_items: items.length,
        total_on_hand: money(items.reduce((sum, item) => sum + item.quantity, 0)),
        items_at_or_below_minimum: items.filter((item) => item.quantity <= item.min_quantity).length,
        movements_last_30_days: db.transactions.filter((tx) => tx.transaction_date >= cutoffKey).length,
      },
      stock_health: {
        comfortable: items.filter((item) => item.qty_level === 'comfortable').length,
        at_minimum: items.filter((item) => item.qty_level === 'at').length,
        below_minimum: items.filter((item) => item.qty_level === 'below').length,
      },
      monthly_movements: movements,
      unit_mix: [...unitMix.entries()].map(([unit, count]) => ({ unit, count })).sort((a, b) => b.count - a.count),
      low_items: items.filter((item) => item.quantity <= item.min_quantity),
    };
  });
}

export function getSettings() {
  return withDb((db) => ({ ...db.settings }));
}

export function saveSettings(input: Partial<InvSettings>) {
  return withDb((db) => {
    const current = db.settings;
    const currency = String(input.currency ?? current.currency).toUpperCase();
    if (!INVENTORY_CURRENCIES.includes(currency as (typeof INVENTORY_CURRENCIES)[number])) {
      throw new InventoryError('Choose a supported currency.', 400, 'currency');
    }
    const unitId = input.default_unit_id ? String(input.default_unit_id) : null;
    if (unitId && !db.units.some((unit) => unit.id === unitId)) {
      throw new InventoryError('Choose a unit from the Units list.', 400, 'default_unit_id');
    }
    const warehouse = String(input.default_warehouse ?? current.default_warehouse).trim();
    if (warehouse && !db.warehouses.some((row) => row.name === warehouse)) {
      throw new InventoryError('Choose a warehouse from the Warehouses list.', 400, 'default_warehouse');
    }
    db.settings = {
      organization_name: String(input.organization_name ?? current.organization_name).trim().slice(0, 120),
      currency,
      default_unit_id: unitId,
      default_warehouse: warehouse,
      default_min_quantity: Math.max(0, num(input.default_min_quantity, current.default_min_quantity)),
      bin_card_prefix: String(input.bin_card_prefix ?? current.bin_card_prefix).trim().slice(0, 12),
      require_description:
        input.require_description === undefined ? current.require_description : Boolean(input.require_description),
      require_holder: input.require_holder === undefined ? current.require_holder : Boolean(input.require_holder),
      low_stock_alerts:
        input.low_stock_alerts === undefined ? current.low_stock_alerts : Boolean(input.low_stock_alerts),
    };
    return { ...db.settings };
  });
}

// ---------- Suppliers ----------

export function listSuppliers(query: { q?: string; status?: string } = {}) {
  return withDb((db) => {
    const q = (query.q ?? '').trim().toLowerCase();
    return db.suppliers
      .map((supplier) => {
        const purchases = db.purchases.filter((row) => row.supplier_id === supplier.id);
        return {
          ...supplier,
          purchase_count: purchases.length,
          received_total: money(
            purchases
              .filter((row) => row.status === 'received')
              .reduce((sum, row) => sum + row.total_price, 0)
          ),
        };
      })
      .filter((row) => {
        if (query.status && (query.status === 'active' ? !row.is_active : row.is_active)) return false;
        if (!q) return true;
        return `${row.name} ${row.contact_person} ${row.phone} ${row.email} ${row.address}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });
}

export function saveSupplier(input: Partial<InvSupplier> & { id?: string | null }) {
  return withDb((db) => {
    const name = String(input.name ?? '').trim();
    if (!name) throw new InventoryError('Supplier name is required.', 400, 'name');
    if (db.suppliers.some((row) => row.name.toLowerCase() === name.toLowerCase() && row.id !== input.id)) {
      throw new InventoryError('A supplier with that name already exists.', 400, 'name');
    }
    const email = String(input.email ?? '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new InventoryError('Enter a valid supplier email.', 400, 'email');
    }
    const existing = input.id ? db.suppliers.find((row) => row.id === input.id) : undefined;
    if (input.id && !existing) throw new InventoryError('Supplier not found.', 404);
    const now = new Date().toISOString();
    const supplier: InvSupplier = existing ?? {
      id: randomUUID(),
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    supplier.name = name;
    supplier.contact_person = String(input.contact_person ?? '').trim();
    supplier.phone = String(input.phone ?? '').trim();
    supplier.email = email;
    supplier.address = String(input.address ?? '').trim();
    supplier.notes = String(input.notes ?? '').trim();
    supplier.is_active = input.is_active === undefined ? supplier.is_active : Boolean(input.is_active);
    supplier.updated_at = now;
    if (!existing) db.suppliers.push(supplier);
    return supplier;
  });
}

export function deleteSupplier(id: string) {
  return withDb((db) => {
    const index = db.suppliers.findIndex((row) => row.id === id);
    if (index < 0) throw new InventoryError('Supplier not found.', 404);
    if (db.purchases.some((row) => row.supplier_id === id)) {
      throw new InventoryError('This supplier has purchase records. Remove those first.');
    }
    db.suppliers.splice(index, 1);
    return { ok: true };
  });
}

// ---------- Purchases ----------

function nextPurchaseReference(db: Db) {
  const year = new Date().getFullYear();
  let sequence = db.purchases.length + 1;
  let reference = '';
  do {
    reference = `PO-${year}-${String(sequence).padStart(4, '0')}`;
    sequence += 1;
  } while (db.purchases.some((row) => row.reference === reference));
  return reference;
}

function presentPurchase(db: Db, purchase: InvPurchase) {
  const supplier = db.suppliers.find((row) => row.id === purchase.supplier_id);
  const item = db.items.find((row) => row.id === purchase.item_id);
  return {
    ...purchase,
    supplier_name: supplier?.name ?? 'Unassigned',
    item_name: item?.item_name ?? 'Deleted item',
    bin_card_number: item?.bin_card_number ?? '',
    unit_label: unitName(db, item?.unit_id ?? null),
  };
}

function receivePurchase(db: Db, purchase: InvPurchase) {
  const item = db.items.find((row) => row.id === purchase.item_id);
  if (!item) throw new InventoryError('Choose an item for this purchase.', 400, 'item_id');
  const now = new Date().toISOString();
  const tx: InvTransaction = {
    id: randomUUID(),
    item_id: item.id,
    transaction_type: 'in',
    invoice_number: purchase.reference,
    quantity: purchase.quantity,
    price: purchase.unit_price,
    employee_id_number: '',
    holder_name: '',
    transaction_date: purchase.received_date || now.slice(0, 10),
    department: '',
    location: '',
    transaction_description: `Purchase ${purchase.reference} received`,
    created_at: now,
  };
  db.transactions.push(tx);
  apply(item, 'in', purchase.quantity, 1);
  purchase.tx_id = tx.id;
}

function reverseReceivedPurchase(db: Db, purchase: InvPurchase) {
  const item = db.items.find((row) => row.id === purchase.item_id);
  if (item) {
    try {
      apply(item, 'in', purchase.quantity, -1);
    } catch {
      throw new InventoryError('Cannot reverse this purchase — its stock has already been used.');
    }
  }
  if (purchase.tx_id) {
    db.transactions = db.transactions.filter((tx) => tx.id !== purchase.tx_id);
    purchase.tx_id = null;
  }
}

export function listPurchases(
  query: { status?: string; supplier_id?: string; item_id?: string; q?: string } = {}
) {
  return withDb((db) => {
    const q = (query.q ?? '').trim().toLowerCase();
    return db.purchases
      .map((row) => presentPurchase(db, row))
      .filter((row) => {
        if (query.status && row.status !== query.status) return false;
        if (query.supplier_id && row.supplier_id !== query.supplier_id) return false;
        if (query.item_id && row.item_id !== query.item_id) return false;
        if (!q) return true;
        return `${row.reference} ${row.supplier_name} ${row.item_name} ${row.notes}`
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => b.order_date.localeCompare(a.order_date) || b.created_at.localeCompare(a.created_at));
  });
}

export function savePurchase(input: Partial<InvPurchase> & { id?: string | null }) {
  return withDb((db) => {
    const status = INV_PURCHASE_STATUSES.includes(input.status as InvPurchaseStatus)
      ? (input.status as InvPurchaseStatus)
      : 'draft';
    const item = db.items.find((row) => row.id === input.item_id);
    if (!item) throw new InventoryError('Choose an item for this purchase.', 400, 'item_id');

    const supplierId = input.supplier_id ? String(input.supplier_id) : null;
    if (supplierId && !db.suppliers.some((row) => row.id === supplierId)) {
      throw new InventoryError('Choose a supplier from the Suppliers list.', 400, 'supplier_id');
    }
    const quantity = num(input.quantity);
    if (!(quantity > 0)) {
      throw new InventoryError('Quantity must be greater than zero.', 400, 'quantity');
    }
    const unitPrice = Math.max(0, num(input.unit_price));
    const orderDate = String(input.order_date ?? '').slice(0, 10) || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(orderDate)) {
      throw new InventoryError('Order date is required.', 400, 'order_date');
    }
    const expectedDate = String(input.expected_date ?? '').slice(0, 10);
    const receivedDate = String(input.received_date ?? '').slice(0, 10);

    const existing = input.id ? db.purchases.find((row) => row.id === input.id) : undefined;
    if (input.id && !existing) throw new InventoryError('Purchase not found.', 404);
    if (existing && existing.status === 'received') reverseReceivedPurchase(db, existing);

    const now = new Date().toISOString();
    const purchase: InvPurchase = existing ?? {
      id: randomUUID(),
      reference: nextPurchaseReference(db),
      supplier_id: null,
      item_id: item.id,
      quantity: 0,
      unit_price: 0,
      total_price: 0,
      status: 'draft',
      order_date: orderDate,
      expected_date: '',
      received_date: '',
      notes: '',
      tx_id: null,
      created_at: now,
      updated_at: now,
    };
    purchase.supplier_id = supplierId;
    purchase.item_id = item.id;
    purchase.quantity = quantity;
    purchase.unit_price = unitPrice;
    purchase.total_price = money(quantity * unitPrice);
    purchase.status = status;
    purchase.order_date = orderDate;
    purchase.expected_date = expectedDate;
    purchase.received_date = status === 'received' ? receivedDate || orderDate : receivedDate;
    purchase.notes = String(input.notes ?? '').trim();
    purchase.updated_at = now;
    if (status === 'received') receivePurchase(db, purchase);
    if (!existing) db.purchases.push(purchase);
    return presentPurchase(db, purchase);
  });
}

export function deletePurchase(id: string) {
  return withDb((db) => {
    const index = db.purchases.findIndex((row) => row.id === id);
    if (index < 0) throw new InventoryError('Purchase not found.', 404);
    const purchase = db.purchases[index];
    if (purchase.status === 'received') reverseReceivedPurchase(db, purchase);
    db.purchases.splice(index, 1);
    return { ok: true };
  });
}

// ---------- Adjustments ----------

function presentAdjustment(db: Db, adjustment: InvAdjustment) {
  const item = db.items.find((row) => row.id === adjustment.item_id);
  return {
    ...adjustment,
    item_name: item?.item_name ?? 'Deleted item',
    bin_card_number: item?.bin_card_number ?? '',
    unit_label: unitName(db, item?.unit_id ?? null),
    on_hand: item?.quantity ?? 0,
  };
}

function reverseAdjustment(db: Db, adjustment: InvAdjustment) {
  const item = db.items.find((row) => row.id === adjustment.item_id);
  if (!item) return;
  const type: InvTxType = adjustment.quantity_change >= 0 ? 'in' : 'out';
  try {
    apply(item, type, Math.abs(adjustment.quantity_change), -1);
  } catch {
    throw new InventoryError('Cannot change this adjustment — adjusted stock has already been used.');
  }
}

export function listAdjustments(
  query: { item_id?: string; reason?: string; q?: string; date_from?: string; date_to?: string } = {}
) {
  return withDb((db) => {
    const q = (query.q ?? '').trim().toLowerCase();
    return db.adjustments
      .map((row) => presentAdjustment(db, row))
      .filter((row) => {
        if (query.item_id && row.item_id !== query.item_id) return false;
        if (query.reason && row.reason !== query.reason) return false;
        if (query.date_from && row.adjusted_at < query.date_from) return false;
        if (query.date_to && row.adjusted_at > query.date_to) return false;
        if (!q) return true;
        return `${row.item_name} ${row.bin_card_number} ${row.note}`.toLowerCase().includes(q);
      })
      .sort(
        (a, b) =>
          b.adjusted_at.localeCompare(a.adjusted_at) || b.created_at.localeCompare(a.created_at)
      );
  });
}

export function saveAdjustment(input: Partial<InvAdjustment> & { id?: string | null }) {
  return withDb((db) => {
    const item = db.items.find((row) => row.id === input.item_id);
    if (!item) throw new InventoryError('Choose an item to adjust.', 400, 'item_id');
    const reason = INV_ADJUSTMENT_REASONS.includes(input.reason as InvAdjustmentReason)
      ? (input.reason as InvAdjustmentReason)
      : null;
    if (!reason) throw new InventoryError('Choose an adjustment reason.', 400, 'reason');
    const change = num(input.quantity_change);
    if (change === 0) {
      throw new InventoryError('Quantity change cannot be zero.', 400, 'quantity_change');
    }
    const adjustedAt =
      String(input.adjusted_at ?? '').slice(0, 10) || new Date().toISOString().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(adjustedAt)) {
      throw new InventoryError('Adjustment date is required.', 400, 'adjusted_at');
    }

    const existing = input.id ? db.adjustments.find((row) => row.id === input.id) : undefined;
    if (input.id && !existing) throw new InventoryError('Adjustment not found.', 404);
    if (existing) reverseAdjustment(db, existing);

    const now = new Date().toISOString();
    const adjustment: InvAdjustment = existing ?? {
      id: randomUUID(),
      item_id: item.id,
      quantity_change: 0,
      reason,
      note: '',
      adjusted_at: adjustedAt,
      created_at: now,
      updated_at: now,
    };
    adjustment.item_id = item.id;
    adjustment.quantity_change = money(change);
    adjustment.reason = reason;
    adjustment.note = String(input.note ?? '').trim();
    adjustment.adjusted_at = adjustedAt;
    adjustment.updated_at = now;

    const type: InvTxType = change > 0 ? 'in' : 'out';
    try {
      apply(item, type, Math.abs(change), 1);
    } catch {
      throw new InventoryError(
        'This adjustment would make on-hand quantity negative.',
        400,
        'quantity_change'
      );
    }
    if (!existing) db.adjustments.push(adjustment);
    return presentAdjustment(db, adjustment);
  });
}

export function deleteAdjustment(id: string) {
  return withDb((db) => {
    const index = db.adjustments.findIndex((row) => row.id === id);
    if (index < 0) throw new InventoryError('Adjustment not found.', 404);
    reverseAdjustment(db, db.adjustments[index]);
    db.adjustments.splice(index, 1);
    return { ok: true };
  });
}
