import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { requireVerificationUser, stringParam, verificationError } from '@/lib/verification-api';
import { REPORT_TYPES, verificationReport, type ReportType } from '@/lib/verification-store';
import { toCsv } from '@/lib/csv';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const access = await requireVerificationUser();
  if (!access.ok) return access.response;
  try {
    const url = new URL(request.url);
    const requested = stringParam(url, 'type') ?? 'branch';
    const type = (REPORT_TYPES.some((row) => row.value === requested) ? requested : 'branch') as ReportType;
    const report = await verificationReport(access.access.actor, type, {
      campaign_id: stringParam(url, 'campaign_id'),
      branch: stringParam(url, 'branch'),
      country: stringParam(url, 'country'),
      department: stringParam(url, 'department'),
      category: stringParam(url, 'category'),
      officer_id: stringParam(url, 'officer_id'),
      result: stringParam(url, 'result'),
      status: stringParam(url, 'status'),
      from: stringParam(url, 'from'),
      to: stringParam(url, 'to'),
    });
    const stamp = new Date().toISOString().slice(0, 10);
    const baseName = `verification-${type}-${stamp}`;
    const format = stringParam(url, 'format') === 'csv' ? 'csv' : 'xlsx';

    if (format === 'csv') {
      const csv = toCsv(report.rows, report.columns.map((column) => ({
        header: column.header,
        value: (row: Record<string, string | number>) => row[column.key] ?? '',
      })));
      return new NextResponse(`\uFEFF${csv}`, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${baseName}.csv"`,
        },
      });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'DreamFlow';
    const sheet = workbook.addWorksheet(report.title.slice(0, 31));
    sheet.columns = report.columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: Math.min(42, Math.max(14, column.header.length + 6)),
    }));
    for (const row of report.rows) sheet.addRow(row);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE8F0FE' },
    };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: report.columns.length } };

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${baseName}.xlsx"`,
        'Content-Length': String(buffer.byteLength),
      },
    });
  } catch (error) {
    return verificationError(error);
  }
}
