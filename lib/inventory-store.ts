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
  created_at: string;
  updated_at: string;
};

export type InvTxType = 'in' | 'out';

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

function readTxInput(input: Partial<InvTransaction>, type: InvTxType) {
  const quantity = num(input.quantity);
  if (!(quantity > 0)) throw new InventoryError('Quantity must be greater than zero.', 400, 'quantity');
  const description = String(input.transaction_description ?? '').trim();
  if (!description) throw new InventoryError('Description is required.', 400, 'transaction_description');
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
    holder_name: String(input.holder_name ?? '').trim(),
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
    const fields = readTxInput(input, type);
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
