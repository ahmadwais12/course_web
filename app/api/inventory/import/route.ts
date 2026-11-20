import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import {
  IMPORT_KINDS,
  buildTemplate,
  importWorkbook,
  isImportKind,
} from '@/lib/inventory-tools';

const MAX_BYTES = 10 * 1024 * 1024;

export async function GET(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;

  const type = new URL(request.url).searchParams.get('type') ?? '';
  if (!isImportKind(type)) {
    return NextResponse.json(
      { error: `Choose one of: ${IMPORT_KINDS.join(', ')}.` },
      { status: 400 }
    );
  }
  try {
    const buffer = await buildTemplate(type);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="inventory-${type}-template.xlsx"`,
      },
    });
  } catch (error) {
    return inventoryError(error);
  }
}

export async function POST(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;

  try {
    const form = await request.formData();
    const type = String(form.get('type') ?? '');
    if (!isImportKind(type)) {
      return NextResponse.json(
        { error: `Choose one of: ${IMPORT_KINDS.join(', ')}.` },
        { status: 400 }
      );
    }
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Choose an Excel (.xlsx) file to upload.' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'The file is larger than 10 MB.' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      return NextResponse.json(
        { error: 'Only .xlsx workbooks are supported. Download the template to start.' },
        { status: 400 }
      );
    }
    const result = await importWorkbook(type, await file.arrayBuffer());
    return NextResponse.json(result, { status: result.imported > 0 ? 201 : 400 });
  } catch (error) {
    return inventoryError(error);
  }
}
