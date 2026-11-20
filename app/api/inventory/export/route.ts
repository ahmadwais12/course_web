import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { isExportType, buildReport, writeWorkbook } from '@/lib/inventory-tools';
import { toCsv } from '@/lib/csv';

export async function GET(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;

  const url = new URL(request.url);
  const type = url.searchParams.get('type') ?? '';
  if (!isExportType(type)) {
    return NextResponse.json({ error: 'Unknown report type.' }, { status: 400 });
  }
  const format = url.searchParams.get('format') === 'csv' ? 'csv' : 'xlsx';
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  try {
    const report = await buildReport(type, { from, to });
    if (format === 'csv') {
      const sheet = report.sheets[0];
      const csv = toCsv(sheet.rows, sheet.columns.map((column) => ({
        header: column.header,
        value: (row: Record<string, unknown>) => {
          const value = row[column.key];
          return value == null ? '' : String(value);
        },
      })));
      return new NextResponse(`\uFEFF${csv}`, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${report.filename.replace(/\.xlsx$/, '.csv')}"`,
        },
      });
    }

    const buffer = await writeWorkbook(report);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${report.filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (error) {
    return inventoryError(error);
  }
}
