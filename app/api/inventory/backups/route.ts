import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';

const backupDir = () => process.env.BACKUP_DIR || path.join(process.cwd(), 'data', 'backups');
const SOURCES = ['inventory.json', 'assets.json', 'operations.json', 'change-log.json'];

export async function GET() {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const dir = backupDir();
    if (!fs.existsSync(dir)) return NextResponse.json([]);
    const rows = fs
      .readdirSync(dir)
      .filter((name) => name.endsWith('.zip'))
      .map((name) => {
        const stat = fs.statSync(path.join(dir, name));
        return {
          name,
          size: stat.size,
          created_at: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    return NextResponse.json(rows);
  } catch (error) {
    return inventoryError(error);
  }
}

export async function POST() {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const dir = backupDir();
    fs.mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const name = `inventory-backup-${stamp}.zip`;
    const zip = new JSZip();
    let files = 0;
    for (const file of SOURCES) {
      const full = path.join(process.cwd(), 'data', file);
      if (fs.existsSync(full)) {
        zip.file(file, fs.readFileSync(full));
        files += 1;
      }
    }
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    fs.writeFileSync(path.join(dir, name), buffer);
    return NextResponse.json(
      { name, size: buffer.length, created_at: new Date().toISOString(), files },
      { status: 201 }
    );
  } catch (error) {
    return inventoryError(error);
  }
}
