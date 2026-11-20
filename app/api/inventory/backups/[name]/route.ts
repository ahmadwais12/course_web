import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';

type Ctx = { params: Promise<{ name: string }> };

const backupDir = () => process.env.BACKUP_DIR || path.join(process.cwd(), 'data', 'backups');

export async function GET(_request: Request, { params }: Ctx) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  try {
    const { name } = await params;
    if (!/^[A-Za-z0-9._-]+\.zip$/.test(name) || name.includes('..')) {
      return NextResponse.json({ error: 'Invalid backup name.' }, { status: 400 });
    }
    const full = path.join(backupDir(), name);
    if (!fs.existsSync(full)) {
      return NextResponse.json({ error: 'Backup not found.' }, { status: 404 });
    }
    const buffer = fs.readFileSync(full);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${name}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    return inventoryError(error);
  }
}
