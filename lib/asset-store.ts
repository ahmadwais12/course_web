import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { InventoryError } from '@/lib/inventory-store';
import {
  ASSET_STATUSES,
  DEPRECIATION_METHODS,
  PROJECT_STATUSES,
  PROPERTY_TYPES,
  computeDepreciation,
} from '@/lib/asset-options';

/**
 * Fixed-asset records from the Al-Hawa demo: assets, holders, projects,
 * properties, trash, and holder/location transfers.
 */

export type AssetHolder = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  address: string;
  province: string;
  location: string;
  created_at: string;
};

export type AssetProject = {
  id: string;
  project_title: string;
  donar_name: string;
  project_description: string;
  project_objective: string;
  start_date: string;
  end_date: string;
  project_status: string;
  project_manager: string;
  project_stekeholder: string;
  project_budge: number | null;
  project_note: string;
  created_at: string;
};

export type AssetProperty = {
  id: string;
  type: string;
  description: string;
  created_at: string;
};

export type AssetRecord = {
  id: string;
  tag_number: string;
  asset_name: string;
  item_specification: string;
  status: string;
  holder_id: string | null;
  department: string;
  category_id: string | null;
  location: string;
  province: string;
  cost: number | null;
  asset_currency: string;
  project_id: string | null;
  quantity: number;
  serial_number: string;
  voucher_number: string;
  invoice_date: string;
  remark: string;
  donar: string;
  useful_life_years: number | null;
  salvage_value: number | null;
  depreciation_method: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AssetTransfer = {
  id: string;
  asset_id: string;
  asset_name: string;
  from_holder: string;
  to_holder: string;
  from_department: string;
  to_department: string;
  from_location: string;
  to_location: string;
  from_province: string;
  to_province: string;
  note: string;
  created_at: string;
};

type Db = {
  holders: AssetHolder[];
  projects: AssetProject[];
  properties: AssetProperty[];
  assets: AssetRecord[];
  transfers: AssetTransfer[];
};

const filePath = () => process.env.ASSETS_DATA_PATH || path.join(process.cwd(), 'data', 'assets.json');

function emptyDb(): Db {
  return { holders: [], projects: [], properties: [], assets: [], transfers: [] };
}

function readDb(): Db {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath(), 'utf8')) as Partial<Db>;
    return {
      holders: parsed.holders ?? [],
      projects: parsed.projects ?? [],
      properties: parsed.properties ?? [],
      assets: parsed.assets ?? [],
      transfers: parsed.transfers ?? [],
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

function text(value: unknown) {
  return String(value ?? '').trim();
}

function holderName(db: Db, id: string | null) {
  if (!id) return '';
  const holder = db.holders.find((row) => row.id === id);
  if (!holder) return '';
  return `${holder.first_name} ${holder.last_name}`.trim();
}

function categoryName(db: Db, id: string | null) {
  if (!id) return '';
  return db.properties.find((row) => row.id === id)?.description ?? '';
}

function projectTitle(db: Db, id: string | null) {
  if (!id) return '';
  return db.projects.find((row) => row.id === id)?.project_title ?? '';
}

export function presentAsset(db: Db, asset: AssetRecord) {
  const withDefaults = {
    ...asset,
    useful_life_years: asset.useful_life_years ?? null,
    salvage_value: asset.salvage_value ?? null,
    depreciation_method: asset.depreciation_method || 'straight_line',
  };
  return {
    ...withDefaults,
    ...computeDepreciation(withDefaults),
    holder_name: holderName(db, asset.holder_id),
    category_name: categoryName(db, asset.category_id),
    project_title: projectTitle(db, asset.project_id),
  };
}

export function listHolders(q = '') {
  return withDb((db) => {
    const query = q.trim().toLowerCase();
    return db.holders
      .filter((row) => {
        if (!query) return true;
        return [row.first_name, row.last_name, row.email, row.phone_number, row.province, row.location]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => a.first_name.localeCompare(b.first_name));
  });
}

export function saveHolder(input: Partial<AssetHolder> & { id?: string | null }) {
  return withDb((db) => {
    const first = text(input.first_name);
    if (!first) throw new InventoryError('First name is required.', 400, 'first_name');
    const existing = input.id ? db.holders.find((row) => row.id === input.id) : undefined;
    if (input.id && !existing) throw new InventoryError('Holder not found.', 404);
    const row: AssetHolder = existing ?? {
      id: randomUUID(),
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      address: '',
      province: '',
      location: '',
      created_at: new Date().toISOString(),
    };
    row.first_name = first;
    row.last_name = text(input.last_name);
    row.email = text(input.email);
    row.phone_number = text(input.phone_number);
    row.address = text(input.address);
    row.province = text(input.province);
    row.location = text(input.location);
    if (!existing) db.holders.push(row);
    return row;
  });
}

export function deleteHolder(id: string) {
  return withDb((db) => {
    if (db.assets.some((asset) => asset.holder_id === id && !asset.deleted_at)) {
      throw new InventoryError('This holder still has assets. Transfer or delete those assets first.');
    }
    const index = db.holders.findIndex((row) => row.id === id);
    if (index < 0) throw new InventoryError('Holder not found.', 404);
    db.holders.splice(index, 1);
    return { ok: true };
  });
}

export function listProjects(q = '') {
  return withDb((db) => {
    const query = q.trim().toLowerCase();
    return db.projects
      .filter((row) => !query || `${row.project_title} ${row.donar_name} ${row.project_status}`.toLowerCase().includes(query))
      .sort((a, b) => a.project_title.localeCompare(b.project_title));
  });
}

export function saveProject(input: Partial<AssetProject> & { id?: string | null }) {
  return withDb((db) => {
    const title = text(input.project_title);
    if (!title) throw new InventoryError('Project title is required.', 400, 'project_title');
    const status = text(input.project_status) || 'Planned';
    if (!PROJECT_STATUSES.includes(status as (typeof PROJECT_STATUSES)[number])) {
      throw new InventoryError('Choose a project status.', 400, 'project_status');
    }
    const existing = input.id ? db.projects.find((row) => row.id === input.id) : undefined;
    if (input.id && !existing) throw new InventoryError('Project not found.', 404);
    const budget = input.project_budge == null || input.project_budge === ('' as unknown) ? null : Number(input.project_budge);
    const row: AssetProject = existing ?? {
      id: randomUUID(),
      project_title: '',
      donar_name: '',
      project_description: '',
      project_objective: '',
      start_date: '',
      end_date: '',
      project_status: 'Planned',
      project_manager: '',
      project_stekeholder: '',
      project_budge: null,
      project_note: '',
      created_at: new Date().toISOString(),
    };
    Object.assign(row, {
      project_title: title,
      donar_name: text(input.donar_name),
      project_description: text(input.project_description),
      project_objective: text(input.project_objective),
      start_date: text(input.start_date).slice(0, 10),
      end_date: text(input.end_date).slice(0, 10),
      project_status: status,
      project_manager: text(input.project_manager),
      project_stekeholder: text(input.project_stekeholder),
      project_budge: budget != null && Number.isFinite(budget) ? budget : null,
      project_note: text(input.project_note),
    });
    if (!existing) db.projects.push(row);
    return row;
  });
}

export function deleteProject(id: string) {
  return withDb((db) => {
    if (db.assets.some((asset) => asset.project_id === id && !asset.deleted_at)) {
      throw new InventoryError('This project is used by an asset.');
    }
    const index = db.projects.findIndex((row) => row.id === id);
    if (index < 0) throw new InventoryError('Project not found.', 404);
    db.projects.splice(index, 1);
    return { ok: true };
  });
}

export function listProperties(type?: string) {
  return withDb((db) =>
    db.properties
      .filter((row) => !type || row.type === type)
      .sort((a, b) => a.type.localeCompare(b.type) || a.description.localeCompare(b.description))
  );
}

export function saveProperty(input: Partial<AssetProperty> & { id?: string | null }) {
  return withDb((db) => {
    const type = text(input.type);
    const description = text(input.description);
    if (!PROPERTY_TYPES.includes(type as (typeof PROPERTY_TYPES)[number])) {
      throw new InventoryError('Choose a property type.', 400, 'type');
    }
    if (!description) throw new InventoryError('Description is required.', 400, 'description');
    const existing = input.id ? db.properties.find((row) => row.id === input.id) : undefined;
    if (input.id && !existing) throw new InventoryError('Property not found.', 404);
    const row: AssetProperty = existing ?? {
      id: randomUUID(),
      type,
      description,
      created_at: new Date().toISOString(),
    };
    row.type = type;
    row.description = description;
    if (!existing) db.properties.push(row);
    return row;
  });
}

export function deleteProperty(id: string) {
  return withDb((db) => {
    if (db.assets.some((asset) => asset.category_id === id && !asset.deleted_at)) {
      throw new InventoryError('This category is used by an asset.');
    }
    const index = db.properties.findIndex((row) => row.id === id);
    if (index < 0) throw new InventoryError('Property not found.', 404);
    db.properties.splice(index, 1);
    return { ok: true };
  });
}

export function listCategories() {
  return listProperties('Category').then((rows) => rows.map((row) => ({ id: row.id, name: row.description, created_at: row.created_at })));
}

export function saveCategory(input: { id?: string | null; name?: string }) {
  return saveProperty({ id: input.id ?? undefined, type: 'Category', description: input.name });
}

export function listAssets(query: { q?: string; trash?: boolean; status?: string }) {
  return withDb((db) => {
    const q = (query.q ?? '').trim().toLowerCase();
    return db.assets
      .filter((asset) => {
        const trashed = Boolean(asset.deleted_at);
        if (query.trash ? !trashed : trashed) return false;
        if (query.status && asset.status !== query.status) return false;
        if (!q) return true;
        return [asset.asset_name, asset.tag_number, asset.serial_number, asset.location, holderName(db, asset.holder_id)]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .map((asset) => presentAsset(db, asset))
      .sort((a, b) => a.asset_name.localeCompare(b.asset_name));
  });
}

/** Dashboard counts over registered (not trashed) asset records, highest first. */
export function assetSummary() {
  return withDb((db) => {
    const assets = db.assets.filter((asset) => !asset.deleted_at);
    const countBy = (pick: (asset: AssetRecord) => string) => {
      const counts = new Map<string, number>();
      for (const asset of assets) {
        const key = pick(asset).trim() || 'Unspecified';
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      return [...counts.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    };
    return {
      registered_assets: assets.length,
      by_status: countBy((asset) => asset.status),
      by_department: countBy((asset) => asset.department),
      by_location: countBy((asset) => asset.location),
    };
  });
}

export function saveAsset(input: Partial<AssetRecord> & { id?: string | null }) {
  return withDb((db) => {
    const name = text(input.asset_name);
    if (!name) throw new InventoryError('Asset name is required.', 400, 'asset_name');
    const status = text(input.status) || 'New';
    if (!ASSET_STATUSES.includes(status as (typeof ASSET_STATUSES)[number])) {
      throw new InventoryError('Choose an asset status.', 400, 'status');
    }
    const tag = text(input.tag_number);
    if (tag && db.assets.some((asset) => asset.tag_number === tag && asset.id !== input.id && !asset.deleted_at)) {
      throw new InventoryError('Tag number is already used.', 400, 'tag_number');
    }
    const holderId = input.holder_id ? String(input.holder_id) : null;
    if (holderId && !db.holders.some((row) => row.id === holderId)) {
      throw new InventoryError('Choose a holder from the list.', 400, 'holder_id');
    }
    const projectId = input.project_id ? String(input.project_id) : null;
    if (projectId && !db.projects.some((row) => row.id === projectId)) {
      throw new InventoryError('Choose a project from the list.', 400, 'project_id');
    }
    const categoryId = input.category_id ? String(input.category_id) : null;
    if (categoryId && !db.properties.some((row) => row.id === categoryId && row.type === 'Category')) {
      throw new InventoryError('Choose a category from the list.', 400, 'category_id');
    }
    const existing = input.id ? db.assets.find((row) => row.id === input.id) : undefined;
    if (input.id && !existing) throw new InventoryError('Asset not found.', 404);
    const now = new Date().toISOString();
    const row: AssetRecord = existing ?? {
      id: randomUUID(),
      tag_number: '',
      asset_name: '',
      item_specification: '',
      status: 'New',
      holder_id: null,
      department: '',
      category_id: null,
      location: '',
      province: '',
      cost: null,
      asset_currency: 'AFN',
      project_id: null,
      quantity: 1,
      serial_number: '',
      voucher_number: '',
      invoice_date: '',
      remark: '',
      donar: '',
      useful_life_years: null,
      salvage_value: null,
      depreciation_method: 'straight_line',
      deleted_at: null,
      created_at: now,
      updated_at: now,
    };
    const cost = input.cost == null || input.cost === ('' as unknown) ? null : Number(input.cost);
    const optionalNumber = (value: unknown) =>
      value == null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : NaN;
    const life = optionalNumber(input.useful_life_years);
    if (life != null && (Number.isNaN(life) || life <= 0 || life > 100)) {
      throw new InventoryError('Useful life must be between 1 and 100 years.', 400, 'useful_life_years');
    }
    const salvage = optionalNumber(input.salvage_value);
    if (salvage != null && (Number.isNaN(salvage) || salvage < 0)) {
      throw new InventoryError('Salvage value cannot be negative.', 400, 'salvage_value');
    }
    if (salvage != null && cost != null && salvage > cost) {
      throw new InventoryError('Salvage value cannot be more than the cost.', 400, 'salvage_value');
    }
    const method = text(input.depreciation_method) || 'straight_line';
    if (!DEPRECIATION_METHODS.some((item) => item.value === method)) {
      throw new InventoryError('Choose a depreciation method.', 400, 'depreciation_method');
    }
    Object.assign(row, {
      tag_number: tag,
      asset_name: name,
      item_specification: text(input.item_specification),
      status,
      holder_id: holderId,
      department: text(input.department),
      category_id: categoryId,
      location: text(input.location),
      province: text(input.province),
      cost: cost != null && Number.isFinite(cost) ? cost : null,
      asset_currency: text(input.asset_currency) || 'AFN',
      project_id: projectId,
      quantity: Math.max(1, Number(input.quantity) || 1),
      serial_number: text(input.serial_number),
      voucher_number: text(input.voucher_number),
      invoice_date: text(input.invoice_date).slice(0, 10),
      remark: text(input.remark),
      donar: text(input.donar),
      useful_life_years: life,
      salvage_value: salvage,
      depreciation_method: method,
      updated_at: now,
    });
    if (!existing) db.assets.push(row);
    return presentAsset(db, row);
  });
}

export function trashAsset(id: string) {
  return withDb((db) => {
    const asset = db.assets.find((row) => row.id === id);
    if (!asset) throw new InventoryError('Asset not found.', 404);
    asset.deleted_at = new Date().toISOString();
    asset.updated_at = asset.deleted_at;
    return { ok: true };
  });
}

export function restoreAsset(id: string) {
  return withDb((db) => {
    const asset = db.assets.find((row) => row.id === id);
    if (!asset) throw new InventoryError('Asset not found.', 404);
    asset.deleted_at = null;
    asset.updated_at = new Date().toISOString();
    return presentAsset(db, asset);
  });
}

export function purgeAsset(id: string) {
  return withDb((db) => {
    const index = db.assets.findIndex((row) => row.id === id);
    if (index < 0) throw new InventoryError('Asset not found.', 404);
    db.assets.splice(index, 1);
    db.transfers = db.transfers.filter((row) => row.asset_id !== id);
    return { ok: true };
  });
}

export function listTransfers(assetId?: string) {
  return withDb((db) =>
    db.transfers
      .filter((row) => !assetId || row.asset_id === assetId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  );
}

export function saveTransfer(input: {
  asset_id?: string;
  holder_id?: string | null;
  department?: string;
  location?: string;
  province?: string;
  note?: string;
}) {
  return withDb((db) => {
    const asset = db.assets.find((row) => row.id === input.asset_id && !row.deleted_at);
    if (!asset) throw new InventoryError('Choose an asset.', 400, 'asset_id');
    const holderId = input.holder_id ? String(input.holder_id) : asset.holder_id;
    if (holderId && !db.holders.some((row) => row.id === holderId)) {
      throw new InventoryError('Choose a holder from the list.', 400, 'holder_id');
    }
    const next = {
      holder_id: holderId,
      department: text(input.department) || asset.department,
      location: text(input.location) || asset.location,
      province: text(input.province) || asset.province,
    };
    const transfer: AssetTransfer = {
      id: randomUUID(),
      asset_id: asset.id,
      asset_name: asset.asset_name,
      from_holder: holderName(db, asset.holder_id) || '—',
      to_holder: holderName(db, next.holder_id) || '—',
      from_department: asset.department || '—',
      to_department: next.department || '—',
      from_location: asset.location || '—',
      to_location: next.location || '—',
      from_province: asset.province || '—',
      to_province: next.province || '—',
      note: text(input.note),
      created_at: new Date().toISOString(),
    };
    asset.holder_id = next.holder_id;
    asset.department = next.department === '—' ? '' : next.department;
    asset.location = next.location === '—' ? '' : next.location;
    asset.province = next.province === '—' ? '' : next.province;
    asset.updated_at = transfer.created_at;
    db.transfers.push(transfer);
    return transfer;
  });
}
