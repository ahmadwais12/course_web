import ExcelJS from 'exceljs';
import { NextResponse } from 'next/server';
import { inventoryError, requireInventoryUser } from '@/lib/inventory-api';
import { inventoryDashboard } from '@/lib/inventory-dashboard';
import { toCsv } from '@/lib/csv';

type ExportRow = Record<string, string | number>;

function makeRows(
  data: ReturnType<typeof inventoryDashboard>,
  filters: { from: string; to: string; stockStatus: string; assetStatus: string; department: string; location: string }
) {
  const sheets: { name: string; rows: ExportRow[] }[] = [
    {
      name: 'Summary',
      rows: [
        { metric: 'Inventory items', value: data.headlines.inventory_items },
        { metric: 'Total on hand', value: data.headlines.total_on_hand },
        { metric: 'At or below minimum', value: data.headlines.items_at_or_below_minimum },
        { metric: 'Stock movements in selected period', value: data.headlines.movements_in_period },
        { metric: 'Registered assets', value: data.assets.registered_assets },
        { metric: 'Purchase orders', value: data.procurement.purchase_orders },
        { metric: 'Open purchase orders', value: data.procurement.open_orders },
        { metric: 'Received purchase value', value: data.procurement.received_value },
        { metric: 'Suppliers', value: data.procurement.suppliers },
        { metric: 'Warehouses', value: data.warehouse.locations },
        { metric: 'From date', value: filters.from || 'All available' },
        { metric: 'To date', value: filters.to || 'Today' },
        { metric: 'Stock health filter', value: filters.stockStatus || 'All stock levels' },
        { metric: 'Asset status filter', value: filters.assetStatus || 'All asset statuses' },
        { metric: 'Department filter', value: filters.department || 'All departments' },
        { metric: 'Location filter', value: filters.location || 'All locations' },
      ],
    },
    {
      name: 'Stock health',
      rows: [
        { status: 'Comfortable', count: data.stock_health.comfortable },
        { status: 'At minimum', count: data.stock_health.at_minimum },
        { status: 'Below minimum', count: data.stock_health.below_minimum },
      ],
    },
    { name: 'Movements', rows: data.monthly_movements.map((row) => ({ month: row.month, in: row.in, out: row.out })) },
    { name: 'Unit mix', rows: data.unit_mix.map((row) => ({ unit: row.unit, items: row.count })) },
    { name: 'Asset status', rows: data.assets.by_status.map((row) => ({ status: row.name, assets: row.count })) },
    { name: 'Departments', rows: data.assets.by_department.map((row) => ({ department: row.name, assets: row.count })) },
    { name: 'Locations', rows: data.assets.by_location.map((row) => ({ location: row.name, assets: row.count })) },
    { name: 'Purchase status', rows: data.procurement.by_status.map((row) => ({ status: row.name, orders: row.count })) },
  ];
  return sheets.filter((sheet) => sheet.rows.length > 0);
}

function makePdf(lines: string[]) {
  const safe = (value: string) => value.normalize('NFKD').replace(/[^\x20-\x7E]/g, '?').replace(/[()\\]/g, '\\$&');
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += 43) pages.push(lines.slice(i, i + 43));
  if (!pages.length) pages.push(['Inventory dashboard']);

  const objects: string[] = [''];
  const addObject = (value: string) => { objects.push(value); return objects.length - 1; };
  const catalogId = addObject('');
  const pagesId = addObject('');
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds: number[] = [];
  pages.forEach((page) => {
    const commands = ['BT', '/F1 10 Tf', '48 748 Td', '14 TL', ...page.flatMap((line, index) => index === 0 ? [`(${safe(line)}) Tj`] : ['T*', `(${safe(line)}) Tj`]), 'ET'].join('\n');
    const streamId = addObject(`<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${streamId} 0 R >>`);
    pageIds.push(pageId);
  });
  objects[catalogId] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i += 1) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export async function GET(request: Request) {
  const denied = await requireInventoryUser();
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const format = params.get('format');
  if (!['pdf', 'xlsx', 'csv'].includes(format || '')) {
    return NextResponse.json({ error: 'Choose PDF, Excel, or CSV format.' }, { status: 400 });
  }

  try {
    const data = inventoryDashboard({
      from: params.get('from'),
      to: params.get('to'),
      stockStatus: params.get('stockStatus'),
      assetStatus: params.get('assetStatus'),
      department: params.get('department'),
      location: params.get('location'),
    });
    const filters = {
      from: params.get('from') || '',
      to: params.get('to') || '',
      stockStatus: params.get('stockStatus') || '',
      assetStatus: params.get('assetStatus') || '',
      department: params.get('department') || '',
      location: params.get('location') || '',
    };
    const sheets = makeRows(data, filters);

    if (format === 'csv') {
      const rows = sheets.flatMap((sheet) => [
        { section: sheet.name, item: '', value: '' },
        ...sheet.rows.map((row) => {
          const entries = Object.entries(row);
          const item = String(row.metric ?? entries[0]?.[1] ?? '');
          const value = String(row.value ?? entries.slice(1).map(([key, cell]) => `${key}: ${cell}`).join(' | '));
          return { section: sheet.name, item, value };
        }),
      ]);
      const csv = toCsv(rows, [
        { header: 'Section', value: (row) => row.section },
        { header: 'Data', value: (row) => row.item },
        { header: 'Value', value: (row) => row.value },
      ]);
      return new NextResponse(`\uFEFF${csv}`, {
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="inventory-dashboard.csv"' },
      });
    }

    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'DreamFlow';
      for (const report of sheets) {
        const sheet = workbook.addWorksheet(report.name);
        if (!report.rows.length) continue;
        const keys = Object.keys(report.rows[0]);
        sheet.columns = keys.map((key) => ({ header: key.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase()), key, width: Math.min(32, Math.max(14, key.length + 4)) }));
        sheet.addRows(report.rows);
        sheet.getRow(1).font = { bold: true, color: { argb: 'FF142033' } };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3F8' } };
        sheet.views = [{ state: 'frozen', ySplit: 1 }];
      }
      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(new Uint8Array(buffer), {
        headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="inventory-dashboard.xlsx"' },
      });
    }

    const pdfLines = [
      'INVENTORY DASHBOARD REPORT',
      `Generated: ${new Date().toISOString().slice(0, 10)}`,
      `Activity range: ${filters.from || 'All available'} to ${filters.to || 'Today'}`,
      `Stock health filter: ${filters.stockStatus || 'All stock levels'}`,
      `Asset status filter: ${filters.assetStatus || 'All asset statuses'}`,
      `Department filter: ${filters.department || 'All departments'}`,
      `Location filter: ${filters.location || 'All locations'}`,
      '',
      ...sheets.flatMap((sheet) => [sheet.name.toUpperCase(), ...sheet.rows.map((row) => Object.entries(row).map(([key, value]) => `${key.replaceAll('_', ' ')}: ${value}`).join(' | ')), '']),
    ];
    return new NextResponse(makePdf(pdfLines), {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="inventory-dashboard.pdf"' },
    });
  } catch (error) {
    return inventoryError(error);
  }
}
