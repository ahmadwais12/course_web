import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { InventoryError, getItem, listItems, listWarehouses, saveTransaction } from '@/lib/inventory-store';
import { listAssets, listHolders, listProjects, listProperties, saveAsset } from '@/lib/asset-store';
import type { VerificationActor } from '@/lib/verification-store';

/**
 * Handover Management: project- and employee-based custody of assets and stock.
 * Data is a local JSON file, matching the assets/inventory modules.
 */

export const HANDOVER_TYPES = ['project', 'employee'] as const;
export type HandoverType = (typeof HANDOVER_TYPES)[number];

export const HANDOVER_STATUSES = [
  'draft',
  'pending_approval',
  'pending_receipt',
  'handed_over',
  'partially_returned',
  'returned',
  'rejected',
  'cancelled',
] as const;
export type HandoverStatus = (typeof HANDOVER_STATUSES)[number];

export const HANDOVER_CONDITIONS = ['New', 'Excellent', 'Good', 'Fair', 'Damaged', 'Under Repair'] as const;

type HandoverItem = {
  id: string;
  kind: 'asset' | 'inventory';
  ref_id: string;
  code: string;
  name: string;
  unit: string;
  category: string;
  serial: string;
  quantity: number;
  returned: number;
  damaged: number;
  missing: number;
  condition_before: string;
  condition_return: string;
  custodian_id: string | null;
  custodian_name: string;
  notes: string;
  stock_tx_id: string | null;
  previous_holder_id: string | null;
  previous_project_id: string | null;
  previous_department: string;
  previous_location: string;
  previous_status: string;
};

type HandoverEvent = {
  id: string;
  action: string;
  detail: string;
  actor_id: string;
  actor_name: string;
  at: string;
};

type HandoverReturnLine = {
  item_id: string;
  returned: number;
  damaged: number;
  missing: number;
  condition: string;
  note: string;
};

type HandoverReturn = {
  id: string;
  at: string;
  by_id: string;
  by_name: string;
  note: string;
  lines: HandoverReturnLine[];
};

export type Handover = {
  id: string;
  number: string;
  type: HandoverType;
  status: HandoverStatus;
  handover_date: string;
  source_warehouse: string;
  department: string;
  project_id: string | null;
  project_name: string;
  employee_id: string | null;
  employee_name: string;
  responsible_person: string;
  expected_return_date: string;
  purpose: string;
  description: string;
  sender_name: string;
  sender_employee_id: string;
  sender_department: string;
  sender_designation: string;
  receiver_name: string;
  receiver_employee_id: string;
  receiver_department: string;
  receiver_designation: string;
  receiver_contact: string;
  items: HandoverItem[];
  returns: HandoverReturn[];
  history: HandoverEvent[];
  rejection_reason: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  approved_at: string | null;
  received_at: string | null;
  closed_at: string | null;
};

type Db = {
  handovers: Handover[];
  counters: Record<string, number>;
};

export type HandoverFilters = {
  status?: string | null;
  type?: string | null;
  project_id?: string | null;
  employee_id?: string | null;
  department?: string | null;
  from?: string | null;
  to?: string | null;
  q?: string | null;
};

export type HandoverItemInput = {
  kind?: string;
  ref_id?: string;
  quantity?: number | string;
  condition?: string;
  custodian_id?: string | null;
  notes?: string;
};

export type HandoverInput = {
  type?: string;
  handover_date?: string;
  source_warehouse?: string;
  department?: string;
  project_id?: string | null;
  employee_id?: string | null;
  responsible_person?: string;
  expected_return_date?: string;
  purpose?: string;
  description?: string;
  sender_name?: string;
  sender_employee_id?: string;
  sender_department?: string;
  sender_designation?: string;
  receiver_name?: string;
  receiver_employee_id?: string;
  receiver_department?: string;
  receiver_designation?: string;
  receiver_contact?: string;
  items?: HandoverItemInput[];
};

type ReturnInput = {
  note?: string;
  lines?: { item_id?: string; returned?: number | string; damaged?: number | string; missing?: number | string; condition?: string; note?: string }[];
};

const filePath = () =>
  process.env.HANDOVER_DATA_PATH || path.join(process.cwd(), 'data', 'handovers.json');

function emptyDb(): Db {
  return { handovers: [], counters: {} };
}

function readDb(): Db {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath(), 'utf8')) as Partial<Db>;
    return { handovers: parsed.handovers ?? [], counters: parsed.counters ?? {} };
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

const text = (value: unknown) => String(value ?? '').trim();
const number = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const round = (value: number) => Math.round(value * 100) / 100;
const today = () => new Date().toISOString().slice(0, 10);

function nextNumber(db: Db) {
  const next = (db.counters.HO ?? 0) + 1;
  db.counters.HO = next;
  return `HO-${String(next).padStart(6, '0')}`;
}

function canAccess(actor: VerificationActor, handover: Handover) {
  return actor.manager || handover.created_by === actor.userId;
}

function requireAccess(actor: VerificationActor, handover: Handover) {
  if (!canAccess(actor, handover)) throw new InventoryError('You do not have access to this handover.', 403);
}

function handoverOrThrow(db: Db, id: string) {
  const handover = db.handovers.find((row) => row.id === id);
  if (!handover) throw new InventoryError('Handover not found.', 404);
  return handover;
}

function log(db: Db, handover: Handover, actor: VerificationActor, action: string, detail: string) {
  handover.history.push({
    id: randomUUID(),
    action,
    detail,
    actor_id: actor.userId,
    actor_name: actor.name,
    at: new Date().toISOString(),
  });
  handover.updated_at = new Date().toISOString();
}

function itemBalance(item: HandoverItem) {
  return round(item.returned + item.damaged + item.missing);
}

export function itemRemaining(item: HandoverItem) {
  return round(Math.max(0, item.quantity - itemBalance(item)));
}

function isClosedStatus(status: HandoverStatus) {
  return status === 'returned' || status === 'cancelled' || status === 'rejected';
}

function presentHandover(handover: Handover) {
  const totalItems = handover.items.length;
  const returnedItems = handover.items.filter((item) => itemRemaining(item) <= 0).length;
  const overdue =
    Boolean(handover.expected_return_date) &&
    ['handed_over', 'partially_returned'].includes(handover.status) &&
    handover.expected_return_date < today();
  return {
    ...handover,
    totals: {
      line_items: totalItems,
      quantity: round(handover.items.reduce((sum, item) => sum + item.quantity, 0)),
      returned: round(handover.items.reduce((sum, item) => sum + item.returned, 0)),
      damaged: round(handover.items.reduce((sum, item) => sum + item.damaged, 0)),
      missing: round(handover.items.reduce((sum, item) => sum + item.missing, 0)),
      closed_items: returnedItems,
      open_items: totalItems - returnedItems,
    },
    overdue,
  };
}

export type HandoverView = ReturnType<typeof presentHandover>;

export function listHandovers(actor: VerificationActor, filters: HandoverFilters = {}) {
  return withDb((db) => {
    const q = (filters.q ?? '').trim().toLowerCase();
    return db.handovers
      .filter((row) => canAccess(actor, row))
      .filter((row) => {
        if (filters.status && row.status !== filters.status) return false;
        if (filters.type && row.type !== filters.type) return false;
        if (filters.project_id && row.project_id !== filters.project_id) return false;
        if (filters.employee_id && row.employee_id !== filters.employee_id) return false;
        if (filters.department && (row.department || 'Unspecified') !== filters.department) return false;
        if (filters.from && row.handover_date < filters.from) return false;
        if (filters.to && row.handover_date > filters.to) return false;
        if (!q) return true;
        return [
          row.number,
          row.project_name,
          row.employee_name,
          row.responsible_person,
          row.receiver_name,
          row.purpose,
          ...row.items.map((item) => `${item.name} ${item.code}`),
        ]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .map(presentHandover)
      .sort((a, b) => b.handover_date.localeCompare(a.handover_date) || b.created_at.localeCompare(a.created_at));
  });
}

export function getHandover(id: string, actor: VerificationActor) {
  return withDb((db) => {
    const handover = handoverOrThrow(db, id);
    requireAccess(actor, handover);
    return presentHandover(handover);
  });
}

function normalizeItems(inputItems: HandoverItemInput[] | undefined) {
  const rows = inputItems ?? [];
  if (rows.length === 0) throw new InventoryError('Add at least one asset or inventory item.', 400, 'items');
  const seen = new Set<string>();
  return rows.map((row) => {
    const kind = row.kind === 'inventory' ? 'inventory' : row.kind === 'asset' ? 'asset' : null;
    if (!kind) throw new InventoryError('Choose the item type.', 400, 'items');
    const ref = text(row.ref_id);
    if (!ref) throw new InventoryError('Choose an item.', 400, 'items');
    const key = `${kind}:${ref}`;
    if (seen.has(key)) throw new InventoryError('The same item is listed twice. Combine it into one line.', 400, 'items');
    seen.add(key);
    const quantity = kind === 'asset' ? 1 : number(row.quantity);
    if (!(quantity > 0)) throw new InventoryError('Quantity must be greater than zero.', 400, 'items');
    const condition = HANDOVER_CONDITIONS.includes(text(row.condition) as (typeof HANDOVER_CONDITIONS)[number])
      ? text(row.condition)
      : 'Good';
    return {
      kind,
      ref_id: ref,
      quantity,
      condition,
      custodian_id: row.custodian_id ? String(row.custodian_id) : null,
      notes: text(row.notes),
    };
  });
}

async function buildItems(inputItems: HandoverItemInput[] | undefined) {
  const rows = normalizeItems(inputItems);
  const [assets, items, holders] = await Promise.all([listAssets({}), listItems({}), listHolders()]);
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const stockById = new Map(items.map((item) => [item.id, item]));
  const holderById = new Map(holders.map((holder) => [holder.id, holder]));
  return rows.map((row) => {
    const custodian = row.custodian_id ? holderById.get(row.custodian_id) : null;
    const custodianName = custodian ? `${custodian.first_name} ${custodian.last_name}`.trim() : '';
    if (row.kind === 'asset') {
      const asset = assetById.get(row.ref_id);
      if (!asset) throw new InventoryError('Selected asset no longer exists.', 400, 'items');
      if (asset.status === 'Damaged') throw new InventoryError(`Asset ${asset.tag_number} is damaged and cannot be handed over.`, 400, 'items');
      const item: HandoverItem = {
        id: randomUUID(),
        kind: 'asset',
        ref_id: asset.id,
        code: asset.tag_number,
        name: asset.asset_name,
        unit: 'unit',
        category: asset.category_name || 'Uncategorized',
        serial: asset.serial_number,
        quantity: 1,
        returned: 0,
        damaged: 0,
        missing: 0,
        condition_before: row.condition,
        condition_return: '',
        custodian_id: row.custodian_id,
        custodian_name: custodianName,
        notes: row.notes,
        stock_tx_id: null,
        previous_holder_id: asset.holder_id,
        previous_project_id: asset.project_id,
        previous_department: asset.department,
        previous_location: asset.location,
        previous_status: asset.status,
      };
      return item;
    }
    const stock = stockById.get(row.ref_id);
    if (!stock) throw new InventoryError('Selected inventory item no longer exists.', 400, 'items');
    if (row.quantity > stock.quantity + 0.0001) {
      throw new InventoryError(
        `Requested quantity for ${stock.item_name} exceeds the available stock (${stock.quantity} ${stock.unit_label}).`,
        400,
        'items'
      );
    }
    return {
      id: randomUUID(),
      kind: 'inventory' as const,
      ref_id: stock.id,
      code: stock.bin_card_number,
      name: stock.item_name,
      unit: stock.unit_label,
      category: '',
      serial: '',
      quantity: row.quantity,
      returned: 0,
      damaged: 0,
      missing: 0,
      condition_before: row.condition,
      condition_return: '',
      custodian_id: row.custodian_id,
      custodian_name: custodianName,
      notes: row.notes,
      stock_tx_id: null,
      previous_holder_id: null,
      previous_project_id: null,
      previous_department: '',
      previous_location: '',
      previous_status: '',
    } satisfies HandoverItem;
  });
}

function activeCustodyRefs(db: Db, ignoreId?: string) {
  const refs = new Set<string>();
  for (const row of db.handovers) {
    if (row.id === ignoreId) continue;
    if (!['handed_over', 'partially_returned', 'pending_receipt'].includes(row.status)) continue;
    for (const item of row.items) {
      if (item.kind === 'asset' && itemRemaining(item) > 0) refs.add(item.ref_id);
    }
  }
  return refs;
}

export async function createHandover(input: HandoverInput, actor: VerificationActor, submit = false) {
  const type = HANDOVER_TYPES.includes(text(input.type) as HandoverType) ? (text(input.type) as HandoverType) : null;
  if (!type) throw new InventoryError('Choose a project or employee handover.', 400, 'type');
  const date = text(input.handover_date).slice(0, 10) || today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new InventoryError('Enter a valid handover date.', 400, 'handover_date');
  if (type === 'project' && !text(input.project_id)) throw new InventoryError('Choose a project for this handover.', 400, 'project_id');
  if (type === 'employee' && !text(input.employee_id)) throw new InventoryError('Choose the receiving employee.', 400, 'employee_id');

  const [projects, holders] = await Promise.all([listProjects(), listHolders()]);
  const project = type === 'project' ? projects.find((row) => row.id === input.project_id) : undefined;
  const holder = type === 'employee' ? holders.find((row) => row.id === input.employee_id) : undefined;
  if (type === 'project' && !project) throw new InventoryError('Choose a project from the list.', 400, 'project_id');
  if (type === 'employee' && !holder) throw new InventoryError('Choose an employee from the list.', 400, 'employee_id');

  const items = await buildItems(input.items);
  const receiverName =
    text(input.receiver_name) ||
    (holder ? `${holder.first_name} ${holder.last_name}`.trim() : project?.project_manager ?? '');
  if (!receiverName) throw new InventoryError('Receiver name is required.', 400, 'receiver_name');

  const handover = await withDb((db) => {
    const taken = activeCustodyRefs(db);
    const conflict = items.find((item) => item.kind === 'asset' && taken.has(item.ref_id));
    if (conflict) {
      throw new InventoryError(
        `Asset ${conflict.code} is already under an active handover. Return it before assigning it again.`,
        409,
        'items'
      );
    }
    const now = new Date().toISOString();
    const row: Handover = {
      id: randomUUID(),
      number: nextNumber(db),
      type,
      status: submit ? 'pending_approval' : 'draft',
      handover_date: date,
      source_warehouse: text(input.source_warehouse),
      department: text(input.department) || holder?.province || '',
      project_id: project?.id ?? null,
      project_name: project?.project_title ?? '',
      employee_id: holder?.id ?? null,
      employee_name: holder ? `${holder.first_name} ${holder.last_name}`.trim() : '',
      responsible_person: text(input.responsible_person) || project?.project_manager || actor.name,
      expected_return_date: text(input.expected_return_date).slice(0, 10),
      purpose: text(input.purpose),
      description: text(input.description),
      sender_name: text(input.sender_name) || actor.name,
      sender_employee_id: text(input.sender_employee_id),
      sender_department: text(input.sender_department),
      sender_designation: text(input.sender_designation),
      receiver_name: receiverName,
      receiver_employee_id: text(input.receiver_employee_id),
      receiver_department: text(input.receiver_department) || text(input.department),
      receiver_designation: text(input.receiver_designation),
      receiver_contact: text(input.receiver_contact) || holder?.phone_number || '',
      items,
      returns: [],
      history: [],
      rejection_reason: '',
      created_by: actor.userId,
      created_by_name: actor.name,
      created_at: now,
      updated_at: now,
      submitted_at: submit ? now : null,
      approved_at: null,
      received_at: null,
      closed_at: null,
    };
    log(db, row, actor, 'created', `Handover ${row.number} created with ${items.length} item line(s).`);
    if (submit) log(db, row, actor, 'submitted', 'Sent for approval.');
    db.handovers.push(row);
    return presentHandover(row);
  });
  return handover;
}

function simpleTransition(id: string, actor: VerificationActor, action: string, note = '') {
  return withDb((db) => {
    const handover = handoverOrThrow(db, id);
    requireAccess(actor, handover);
    if (action === 'submit') {
      if (!['draft', 'rejected'].includes(handover.status)) throw new InventoryError('Only draft or rejected handovers can be submitted.', 400);
      handover.status = 'pending_approval';
      handover.submitted_at = new Date().toISOString();
      handover.rejection_reason = '';
      log(db, handover, actor, 'submitted', 'Sent for approval.');
    } else if (action === 'approve') {
      if (!actor.manager) throw new InventoryError('Only a handover manager can approve.', 403);
      if (handover.created_by === actor.userId) throw new InventoryError('You cannot approve a handover you created.', 403);
      if (handover.status !== 'pending_approval') throw new InventoryError('Only pending handovers can be approved.', 400);
      handover.status = 'pending_receipt';
      handover.approved_at = new Date().toISOString();
      log(db, handover, actor, 'approved', note || 'Approved and awaiting receiver confirmation.');
    } else if (action === 'reject') {
      if (!actor.manager) throw new InventoryError('Only a handover manager can reject.', 403);
      if (handover.status !== 'pending_approval') throw new InventoryError('Only pending handovers can be rejected.', 400);
      if (!note.trim()) throw new InventoryError('A rejection reason is required.', 400, 'note');
      handover.status = 'rejected';
      handover.rejection_reason = note.trim();
      log(db, handover, actor, 'rejected', note.trim());
    } else if (action === 'cancel') {
      if (['handed_over', 'partially_returned', 'returned', 'cancelled'].includes(handover.status)) {
        throw new InventoryError('Handovers already issued cannot be cancelled. Use the return process.', 400);
      }
      if (!actor.manager && handover.created_by !== actor.userId) throw new InventoryError('You cannot cancel this handover.', 403);
      handover.status = 'cancelled';
      handover.closed_at = new Date().toISOString();
      log(db, handover, actor, 'cancelled', note.trim() || 'Handover cancelled.');
    } else {
      throw new InventoryError('Unknown handover action.', 400);
    }
    return presentHandover(handover);
  });
}

function custodyTarget(handover: Handover, item: HandoverItem) {
  return item.custodian_id || handover.employee_id || null;
}

async function issueItems(handover: HandoverView, actor: VerificationActor) {
  const assets = await listAssets({});
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  for (const item of handover.items) {
    if (item.kind === 'inventory') {
      const stock = await getItem(item.ref_id);
      if (!stock) throw new InventoryError(`${item.name} no longer exists in inventory.`, 400);
      if (item.quantity > stock.quantity + 0.0001) {
        throw new InventoryError(
          `Insufficient stock for ${item.name}. Available ${stock.quantity} ${stock.unit_label ?? ''}.`,
          400
        );
      }
      await saveTransaction({
        item_id: item.ref_id,
        transaction_type: 'out',
        quantity: item.quantity,
        price: stock.unit_price,
        invoice_number: handover.number,
        transaction_date: handover.handover_date,
        holder_name: item.custodian_name || handover.receiver_name,
        department: handover.department,
        location: handover.project_name,
        transaction_description: `Handover ${handover.number}${handover.project_name ? ` — ${handover.project_name}` : ''}`,
      });
      continue;
    }
    const asset = assetById.get(item.ref_id);
    if (!asset) throw new InventoryError(`Asset ${item.code} no longer exists.`, 400);
    await saveAsset({
      ...asset,
      holder_id: custodyTarget(handover, item),
      department: handover.department || asset.department,
      project_id: handover.project_id ?? asset.project_id,
      status: 'Active',
      remark: `${asset.remark ? `${asset.remark}\n` : ''}Handed over on ${handover.handover_date} via ${handover.number}.`.trim(),
    });
  }
}

async function returnItems(handover: HandoverView, lines: HandoverReturnLine[], actor: VerificationActor) {
  const assets = await listAssets({});
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  for (const line of lines) {
    const item = handover.items.find((row) => row.id === line.item_id);
    if (!item) continue;
    if (item.kind === 'inventory') {
      if (line.returned > 0) {
        const stock = await getItem(item.ref_id);
        await saveTransaction({
          item_id: item.ref_id,
          transaction_type: 'in',
          quantity: line.returned,
          price: stock?.unit_price ?? 0,
          invoice_number: handover.number,
          transaction_date: today(),
          holder_name: 'Handover return',
          department: handover.department,
          location: handover.project_name,
          transaction_description: `Return ${handover.number} (${line.returned} ${item.unit})`,
        });
      }
      continue;
    }
    const asset = assetById.get(item.ref_id);
    if (!asset) continue;
    const closed =
      item.returned + line.returned + item.damaged + line.damaged + item.missing + line.missing >= item.quantity;
    if (!closed) continue;
    if (item.damaged + line.damaged + item.missing + line.missing > 0) {
      await saveAsset({
        ...asset,
        holder_id: null,
        status: 'Damaged',
        remark: `${asset.remark ? `${asset.remark}\n` : ''}${handover.number} return: damaged ${item.damaged}, missing ${item.missing}.`.trim(),
      });
    } else {
      await saveAsset({
        ...asset,
        holder_id: item.previous_holder_id,
        project_id: item.previous_project_id,
        department: item.previous_department,
        location: item.previous_location,
        status: item.previous_status || 'Active',
        remark: `${asset.remark ? `${asset.remark}\n` : ''}Returned on ${today()} via ${handover.number}.`.trim(),
      });
    }
  }
}

export async function receiveHandover(id: string, actor: VerificationActor, note = '') {
  const handover = await getHandover(id, actor);
  if (!actor.manager) throw new InventoryError('Only a handover manager can confirm receipt.', 403);
  if (handover.status !== 'pending_receipt') throw new InventoryError('Only approved handovers can be received.', 400);
  await issueItems(handover, actor);
  return withDb((db) => {
    const row = handoverOrThrow(db, id);
    if (row.status !== 'pending_receipt') throw new InventoryError('This handover was already received.', 409);
    row.status = 'handed_over';
    row.received_at = new Date().toISOString();
    log(db, row, actor, 'received', note || 'Receiver confirmed the items.');
    return presentHandover(row);
  });
}

export async function returnHandover(id: string, input: ReturnInput, actor: VerificationActor) {
  const handover = await getHandover(id, actor);
  if (!['handed_over', 'partially_returned'].includes(handover.status)) {
    throw new InventoryError('Only issued handovers can receive returns.', 400);
  }
  const rows = (input.lines ?? [])
    .map((line) => ({
      item_id: text(line.item_id),
      returned: number(line.returned),
      damaged: number(line.damaged),
      missing: number(line.missing),
      condition: HANDOVER_CONDITIONS.includes(text(line.condition) as (typeof HANDOVER_CONDITIONS)[number])
        ? text(line.condition)
        : '',
      note: text(line.note),
    }))
    .filter((line) => line.item_id && line.returned + line.damaged + line.missing > 0);
  if (rows.length === 0) throw new InventoryError('Enter returned, damaged, or missing quantities.', 400, 'lines');
  for (const line of rows) {
    const item = handover.items.find((row) => row.id === line.item_id);
    if (!item) throw new InventoryError('Return line references an unknown item.', 400, 'lines');
    if (line.returned < 0 || line.damaged < 0 || line.missing < 0) {
      throw new InventoryError('Return quantities cannot be negative.', 400, 'lines');
    }
    if (line.returned + line.damaged + line.missing > itemRemaining(item) + 0.0001) {
      throw new InventoryError(`Return exceeds the remaining quantity for ${item.name}.`, 400, 'lines');
    }
  }

  await returnItems(handover, rows, actor);

  return withDb((db) => {
    const row = handoverOrThrow(db, id);
    if (!['handed_over', 'partially_returned'].includes(row.status)) {
      throw new InventoryError('This handover is no longer open for returns.', 409);
    }
    for (const line of rows) {
      const item = row.items.find((entry) => entry.id === line.item_id);
      if (!item) continue;
      item.returned = round(item.returned + line.returned);
      item.damaged = round(item.damaged + line.damaged);
      item.missing = round(item.missing + line.missing);
      if (line.condition) item.condition_return = line.condition;
    }
    const record: HandoverReturn = {
      id: randomUUID(),
      at: new Date().toISOString(),
      by_id: actor.userId,
      by_name: actor.name,
      note: text(input.note),
      lines: rows,
    };
    row.returns.push(record);
    const complete = row.items.every((item) => itemRemaining(item) <= 0);
    row.status = complete ? 'returned' : 'partially_returned';
    if (complete) row.closed_at = new Date().toISOString();
    log(
      db,
      row,
      actor,
      'returned',
      `Return recorded: ${rows.reduce((sum, line) => sum + line.returned, 0)} returned, ${rows.reduce(
        (sum, line) => sum + line.damaged,
        0
      )} damaged, ${rows.reduce((sum, line) => sum + line.missing, 0)} missing.`
    );
    return presentHandover(row);
  });
}

export async function handoverAction(
  id: string,
  action: string,
  actor: VerificationActor,
  payload: { note?: string } = {}
) {
  if (action === 'receive') return receiveHandover(id, actor, text(payload.note));
  if (action === 'return') return returnHandover(id, payload as ReturnInput, actor);
  return simpleTransition(id, actor, action, text(payload.note));
}

export function handoverDashboard(actor: VerificationActor, filters: HandoverFilters = {}) {
  return listHandovers(actor, filters).then((rows) => summarize(rows));
}

export async function handoverOverview(actor: VerificationActor, filters: HandoverFilters = {}) {
  const rows = await listHandovers(actor, filters);
  return { ...summarize(rows), rows };
}

function summarize(rows: HandoverView[]) {
  const count = (predicate: (row: HandoverView) => boolean) => rows.filter(predicate).length;
  const now = new Date();
  const months: { key: string; label: string; created: number; returned: number }[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('en-US', { month: 'short' }),
      created: 0,
      returned: 0,
    });
  }
  const monthIndex = new Map(months.map((month, index) => [month.key, index]));
  for (const row of rows) {
    const created = monthIndex.get(row.handover_date.slice(0, 7));
    if (created !== undefined) months[created].created += 1;
    for (const record of row.returns) {
      const returned = monthIndex.get(record.at.slice(0, 7));
      if (returned !== undefined) months[returned].returned += 1;
      break;
    }
  }
  const categoryMap = new Map<string, number>();
  for (const row of rows) {
    for (const item of row.items) {
      const key = item.kind === 'asset' ? item.category || 'Assets' : 'Inventory items';
      categoryMap.set(key, (categoryMap.get(key) ?? 0) + item.quantity);
    }
  }
  return {
    summary: {
      total: rows.length,
      project: count((row) => row.type === 'project'),
      employee: count((row) => row.type === 'employee'),
      pending_approval: count((row) => row.status === 'pending_approval'),
      pending_receipt: count((row) => row.status === 'pending_receipt'),
      active: count((row) => row.status === 'handed_over'),
      partially_returned: count((row) => row.status === 'partially_returned'),
      overdue: count((row) => row.overdue),
      returned: count((row) => row.status === 'returned'),
      draft: count((row) => row.status === 'draft'),
    },
    monthly: months,
    type_split: [
      { name: 'Project', value: count((row) => row.type === 'project') },
      { name: 'Employee', value: count((row) => row.type === 'employee') },
    ],
    category_split: [...categoryMap.entries()]
      .map(([name, value]) => ({ name, value: round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7),
    returns: {
      intact: round(rows.reduce((sum, row) => sum + row.totals.returned, 0)),
      damaged: round(rows.reduce((sum, row) => sum + row.totals.damaged, 0)),
      missing: round(rows.reduce((sum, row) => sum + row.totals.missing, 0)),
      open_items: rows.reduce((sum, row) => sum + row.totals.open_items, 0),
    },
    rows: rows.slice(0, 12),
    closed_status: rows.filter((row) => isClosedStatus(row.status)).length,
  };
}

export async function handoverOptions(actor: VerificationActor) {
  const [assets, items, holders, projects, properties, warehouses] = await Promise.all([
    listAssets({}),
    listItems({}),
    listHolders(),
    listProjects(),
    listProperties(),
    listWarehouses(),
  ]);
  const active = await withDb((db) => activeCustodyRefs(db));
  const departments = [
    ...new Set([
      ...assets.map((asset) => asset.department.trim()),
      ...properties.filter((row) => row.type === 'Department').map((row) => row.description.trim()),
    ]),
  ].filter(Boolean);
  return {
    me: { id: actor.userId, name: actor.name, role: actor.role, manager: actor.manager },
    assets: assets
      .filter((asset) => !asset.deleted_at && asset.status !== 'Damaged')
      .map((asset) => ({
        value: asset.id,
        label: `${asset.tag_number} — ${asset.asset_name}`,
        name: asset.asset_name,
        code: asset.tag_number,
        category: asset.category_name,
        serial: asset.serial_number,
        location: asset.location,
        condition: asset.status,
        available: !active.has(asset.id),
      })),
    inventory: items.map((item) => ({
      value: item.id,
      label: `${item.bin_card_number} — ${item.item_name}`,
      name: item.item_name,
      code: item.bin_card_number,
      unit: item.unit_label,
      quantity: item.quantity,
      unit_price: item.unit_price,
      available: item.quantity > 0,
    })),
    projects: projects.map((project) => ({
      value: project.id,
      label: project.project_title,
      manager: project.project_manager,
      status: project.project_status,
    })),
    employees: holders.map((holder) => ({
      value: holder.id,
      label: `${holder.first_name} ${holder.last_name}`.trim() || holder.email,
      contact: holder.phone_number,
      department: holder.province,
    })),
    departments: departments.map((name) => ({ value: name, label: name })),
    warehouses: warehouses.map((warehouse) => ({ value: warehouse.name, label: warehouse.name })),
  };
}
