import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export type ChangeEntity = 'asset' | 'project' | 'holder' | 'settings';

export type ChangeEntry = {
  id: string;
  entity: ChangeEntity;
  action: 'created' | 'updated' | 'trashed' | 'restored' | 'deleted';
  name: string;
  detail: string;
  changed_at: string;
};

type Db = { entries: ChangeEntry[] };

const filePath = () => process.env.CHANGE_LOG_PATH || path.join(process.cwd(), 'data', 'change-log.json');
const MAX_ENTRIES = 5000;

function readDb(): Db {
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath(), 'utf8')) as Partial<Db>;
    return { entries: Array.isArray(parsed.entries) ? parsed.entries : [] };
  } catch {
    return { entries: [] };
  }
}

function writeDb(db: Db) {
  const file = filePath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(db, null, 2));
}

/** Synchronous so it can be called inside the JSON store write callbacks. */
export function recordChange(entry: Omit<ChangeEntry, 'id' | 'changed_at'>) {
  try {
    const db = readDb();
    db.entries.unshift({
      id: randomUUID(),
      changed_at: new Date().toISOString(),
      ...entry,
    });
    if (db.entries.length > MAX_ENTRIES) db.entries.length = MAX_ENTRIES;
    writeDb(db);
  } catch {
    // A change log failure must never block the actual inventory write.
  }
}

export function listChanges(entity?: ChangeEntity | '') {
  const db = readDb();
  return db.entries
    .filter((row) => !entity || row.entity === entity)
    .sort((a, b) => b.changed_at.localeCompare(a.changed_at));
}
