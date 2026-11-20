import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { InventoryError } from './inventory-store';

/**
 * Generic operations ledger for the small inventory registers (GRN, repairs,
 * fleet, archives) that do not deserve their own JSON file each.
 */

export type OpsRecord = {
  id: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
};

export type SecuritySettings = {
  two_factor_required: boolean;
  require_delete_confirmation: boolean;
  session_timeout_minutes: number;
  backup_reminder_days: number;
};

type Db = {
  registers: Record<string, OpsRecord[]>;
  security: SecuritySettings;
};

const filePath = () => process.env.OPS_DATA_PATH || path.join(process.cwd(), 'data', 'operations.json');

function defaultSecurity(): SecuritySettings {
  return {
    two_factor_required: false,
    require_delete_confirmation: true,
    session_timeout_minutes: 30,
    backup_reminder_days: 7,
  };
}

function emptyDb(): Db {
  return { registers: {}, security: defaultSecurity() };
}

function readDb(): Db {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath(), 'utf8')) as Partial<Db>;
    return {
      registers: parsed.registers ?? {},
      security: { ...defaultSecurity(), ...(parsed.security ?? {}) },
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

const text = (value: unknown) => String(value ?? '').trim();

export function listRecords(register: string, q = '') {
  return withDb((db) => {
    const query = q.trim().toLowerCase();
    return [...(db.registers[register] ?? [])]
      .filter((row) => {
        if (!query) return true;
        return Object.values(row)
          .map((value) => String(value ?? ''))
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  });
}

export function saveRecord(
  register: string,
  input: Record<string, unknown>,
  fieldKeys: string[],
  primary: { key: string; label: string }
) {
  return withDb((db) => {
    const rows = db.registers[register] ?? (db.registers[register] = []);
    const id = input.id ? String(input.id) : null;
    const existing = id ? rows.find((row) => row.id === id) : undefined;
    if (id && !existing) throw new InventoryError('Record not found.', 404);

    const values: Record<string, unknown> = {};
    for (const key of fieldKeys) {
      if (input[key] === undefined) continue;
      const raw = input[key];
      values[key] = typeof raw === 'string' ? raw.trim() : raw;
    }
    const primaryValue = text(values[primary.key] ?? existing?.[primary.key]);
    if (!primaryValue) throw new InventoryError(`${primary.label} is required.`, 400, primary.key);

    const now = new Date().toISOString();
    const row: OpsRecord = existing ?? {
      id: randomUUID(),
      created_at: now,
      updated_at: now,
    };
    Object.assign(row, values, { updated_at: now });
    if (!existing) rows.push(row);
    return row;
  });
}

export function deleteRecord(register: string, id: string) {
  return withDb((db) => {
    const rows = db.registers[register] ?? [];
    const index = rows.findIndex((row) => row.id === id);
    if (index < 0) throw new InventoryError('Record not found.', 404);
    rows.splice(index, 1);
    return { ok: true };
  });
}

export function getSecurity() {
  return withDb((db) => ({ ...db.security }));
}

export function saveSecurity(input: Partial<SecuritySettings>) {
  return withDb((db) => {
    const current = db.security;
    const n = (value: unknown, fallback: number, min: number, max: number) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return fallback;
      return Math.min(max, Math.max(min, Math.round(parsed)));
    };
    db.security = {
      two_factor_required:
        input.two_factor_required === undefined ? current.two_factor_required : Boolean(input.two_factor_required),
      require_delete_confirmation:
        input.require_delete_confirmation === undefined
          ? current.require_delete_confirmation
          : Boolean(input.require_delete_confirmation),
      session_timeout_minutes: n(input.session_timeout_minutes, current.session_timeout_minutes, 5, 240),
      backup_reminder_days: n(input.backup_reminder_days, current.backup_reminder_days, 0, 90),
    };
    return { ...db.security };
  });
}
