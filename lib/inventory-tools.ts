import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import QRCode from 'qrcode';
import { InventoryError } from '@/lib/inventory-store';
import {
  listAdjustments,
  listItems,
  listPurchases,
  listSuppliers,
  listTransactions,
  listUnits,
  saveItem,
  saveSupplier,
} from '@/lib/inventory-store';
import {
  listAssets,
  listCategories,
  listHolders,
  listProjects,
  listTransfers,
  saveAsset,
} from '@/lib/asset-store';
import { ASSET_STATUSES } from '@/lib/asset-options';

export const EXPORT_TYPES = [
  'assets',
  'items',
  'suppliers',
  'purchases',
  'movements',
  'verification',
  'handover',
] as const;

export type ExportType = (typeof EXPORT_TYPES)[number];

export const EXPORT_LABELS: Record<ExportType, string> = {
  assets: 'Asset register',
  items: 'Stock items',
  suppliers: 'Suppliers',
  purchases: 'Purchase orders',
  movements: 'Stock movements',
  verification: 'Verification report',
  handover: 'Handover report',
};

export function isExportType(value: string): value is ExportType {
  return (EXPORT_TYPES as readonly string[]).includes(value);
}

type SheetColumn = { header: string; key: string; width?: number };
type ReportSheet = { name: string; columns: SheetColumn[]; rows: Record<string, unknown>[] };
type Report = { filename: string; sheets: ReportSheet[] };

const today = () => new Date().toISOString().slice(0, 10);

const number = (value: string | null) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export async function buildReport(
  type: ExportType,
  range: { from?: string | null; to?: string | null } = {}
): Promise<Report> {
  const from = range.from || undefined;
  const to = range.to || undefined;
  const suffix = [from, to].filter(Boolean).join('_to_');
  const stamped = (name: string) => `${name}-${suffix || today()}.xlsx`;

  if (type === 'assets') {
    const assets = await listAssets({});
    return {
      filename: stamped('assets-report'),
      sheets: [
        {
          name: 'Assets',
          columns: [
            { header: 'Tag number', key: 'tag_number', width: 16 },
            { header: 'Asset name', key: 'asset_name', width: 28 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Holder', key: 'holder_name', width: 22 },
            { header: 'Category', key: 'category_name', width: 18 },
            { header: 'Project', key: 'project_title', width: 20 },
            { header: 'Department', key: 'department', width: 18 },
            { header: 'Location', key: 'location', width: 18 },
            { header: 'Province', key: 'province', width: 16 },
            { header: 'Quantity', key: 'quantity', width: 10 },
            { header: 'Cost', key: 'cost', width: 14 },
            { header: 'Currency', key: 'asset_currency', width: 10 },
            { header: 'Book value', key: 'book_value', width: 14 },
            { header: 'Serial number', key: 'serial_number', width: 18 },
            { header: 'Voucher number', key: 'voucher_number', width: 16 },
            { header: 'Invoice date', key: 'invoice_date', width: 14 },
            { header: 'Donor / program', key: 'donar', width: 20 },
            { header: 'Specification', key: 'item_specification', width: 30 },
            { header: 'Remark', key: 'remark', width: 30 },
          ],
          rows: assets.map((asset) => ({
            tag_number: asset.tag_number,
            asset_name: asset.asset_name,
            status: asset.status,
            holder_name: asset.holder_name,
            category_name: asset.category_name,
            project_title: asset.project_title,
            department: asset.department,
            location: asset.location,
            province: asset.province,
            quantity: asset.quantity,
            cost: asset.cost ?? '',
            asset_currency: asset.asset_currency,
            book_value: asset.depreciable ? asset.book_value : '',
            serial_number: asset.serial_number,
            voucher_number: asset.voucher_number,
            invoice_date: asset.invoice_date,
            donar: asset.donar,
            item_specification: asset.item_specification,
            remark: asset.remark,
          })),
        },
      ],
    };
  }

  if (type === 'items') {
    const items = await listItems({});
    return {
      filename: stamped('inventory-items'),
      sheets: [
        {
          name: 'Items',
          columns: [
            { header: 'Bin card number', key: 'bin_card_number', width: 18 },
            { header: 'Item name', key: 'item_name', width: 30 },
            { header: 'Unit', key: 'unit_label', width: 12 },
            { header: 'On hand', key: 'quantity', width: 12 },
            { header: 'Minimum', key: 'min_quantity', width: 12 },
            { header: 'Unit price', key: 'unit_price', width: 14 },
            { header: 'Total price', key: 'total_price', width: 14 },
            { header: 'Description', key: 'description', width: 34 },
            { header: 'Image URL', key: 'image_url', width: 34 },
          ],
          rows: items.map((item) => ({ ...item })),
        },
      ],
    };
  }

  if (type === 'suppliers') {
    const suppliers = await listSuppliers({});
    return {
      filename: stamped('suppliers-report'),
      sheets: [
        {
          name: 'Suppliers',
          columns: [
            { header: 'Supplier', key: 'name', width: 26 },
            { header: 'Contact person', key: 'contact_person', width: 20 },
            { header: 'Phone', key: 'phone', width: 16 },
            { header: 'Email', key: 'email', width: 24 },
            { header: 'Address', key: 'address', width: 28 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Purchases', key: 'purchase_count', width: 12 },
            { header: 'Received value', key: 'received_total', width: 16 },
            { header: 'Notes', key: 'notes', width: 30 },
          ],
          rows: suppliers.map((supplier) => ({
            ...supplier,
            status: supplier.is_active ? 'Active' : 'Inactive',
          })),
        },
      ],
    };
  }

  if (type === 'purchases') {
    const purchases = await listPurchases({});
    return {
      filename: stamped('purchases-report'),
      sheets: [
        {
          name: 'Purchases',
          columns: [
            { header: 'Reference', key: 'reference', width: 18 },
            { header: 'Supplier', key: 'supplier_name', width: 24 },
            { header: 'Item', key: 'item_name', width: 28 },
            { header: 'Quantity', key: 'quantity', width: 12 },
            { header: 'Unit price', key: 'unit_price', width: 14 },
            { header: 'Total', key: 'total_price', width: 14 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Order date', key: 'order_date', width: 14 },
            { header: 'Expected date', key: 'expected_date', width: 14 },
            { header: 'Received date', key: 'received_date', width: 14 },
            { header: 'Notes', key: 'notes', width: 30 },
          ],
          rows: purchases.map((purchase) => ({ ...purchase })),
        },
      ],
    };
  }

  if (type === 'movements') {
    const transactions = await listTransactions({ date_from: from, date_to: to });
    return {
      filename: stamped('movement-report'),
      sheets: [
        {
          name: 'Movements',
          columns: [
            { header: 'Date', key: 'transaction_date', width: 14 },
            { header: 'Type', key: 'type', width: 10 },
            { header: 'Item', key: 'item_name', width: 28 },
            { header: 'Bin card', key: 'bin_card_number', width: 16 },
            { header: 'Quantity', key: 'quantity', width: 12 },
            { header: 'Price', key: 'price', width: 12 },
            { header: 'Invoice', key: 'invoice_number', width: 16 },
            { header: 'Holder', key: 'holder_name', width: 22 },
            { header: 'Employee ID', key: 'employee_id_number', width: 16 },
            { header: 'Department', key: 'department', width: 18 },
            { header: 'Warehouse', key: 'location', width: 18 },
            { header: 'Description', key: 'transaction_description', width: 32 },
          ],
          rows: transactions.map((tx) => ({
            ...tx,
            type: tx.transaction_type === 'in' ? 'In' : 'Out',
          })),
        },
      ],
    };
  }

  if (type === 'verification') {
    const [items, adjustments, assets] = await Promise.all([
      listItems({}),
      listAdjustments({ reason: 'count' }),
      listAssets({}),
    ]);
    const lastCount = new Map<string, (typeof adjustments)[number]>();
    for (const row of adjustments) {
      if (!lastCount.has(row.item_id)) lastCount.set(row.item_id, row);
    }
    return {
      filename: stamped('verification-report'),
      sheets: [
        {
          name: 'Stock verification',
          columns: [
            { header: 'Bin card number', key: 'bin_card_number', width: 18 },
            { header: 'Item', key: 'item_name', width: 28 },
            { header: 'Unit', key: 'unit_label', width: 12 },
            { header: 'System quantity', key: 'quantity', width: 14 },
            { header: 'Minimum', key: 'min_quantity', width: 12 },
            { header: 'Level', key: 'level', width: 14 },
            { header: 'Last count date', key: 'last_count_date', width: 16 },
            { header: 'Last variance', key: 'last_variance', width: 14 },
            { header: 'Count note', key: 'last_note', width: 30 },
          ],
          rows: items.map((item) => {
            const count = lastCount.get(item.id);
            return {
              bin_card_number: item.bin_card_number,
              item_name: item.item_name,
              unit_label: item.unit_label,
              quantity: item.quantity,
              min_quantity: item.min_quantity,
              level:
                item.qty_level === 'below'
                  ? 'Below minimum'
                  : item.qty_level === 'at'
                    ? 'At minimum'
                    : 'Comfortable',
              last_count_date: count ? count.adjusted_at.slice(0, 10) : 'Never counted',
              last_variance: count ? count.quantity_change : '',
              last_note: count?.note ?? '',
            };
          }),
        },
        {
          name: 'Asset verification',
          columns: [
            { header: 'Tag number', key: 'tag_number', width: 16 },
            { header: 'Asset name', key: 'asset_name', width: 28 },
            { header: 'Status', key: 'status', width: 12 },
            { header: 'Holder', key: 'holder_name', width: 22 },
            { header: 'Department', key: 'department', width: 18 },
            { header: 'Location', key: 'location', width: 18 },
            { header: 'Province', key: 'province', width: 16 },
            { header: 'Quantity', key: 'quantity', width: 10 },
            { header: 'Book value', key: 'book_value', width: 14 },
          ],
          rows: assets.map((asset) => ({
            tag_number: asset.tag_number,
            asset_name: asset.asset_name,
            status: asset.status,
            holder_name: asset.holder_name,
            department: asset.department,
            location: asset.location,
            province: asset.province,
            quantity: asset.quantity,
            book_value: asset.depreciable ? asset.book_value : '',
          })),
        },
      ],
    };
  }

  const [allTransfers, assets] = await Promise.all([listTransfers(), listAssets({})]);
  const transfers = allTransfers.filter((transfer) => {
    const date = transfer.created_at.slice(0, 10);
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  });
  return {
    filename: stamped('handover-report'),
    sheets: [
      {
        name: 'Handover history',
        columns: [
          { header: 'Date', key: 'created_at', width: 14 },
          { header: 'Asset', key: 'asset_name', width: 28 },
          { header: 'From holder', key: 'from_holder', width: 22 },
          { header: 'To holder', key: 'to_holder', width: 22 },
          { header: 'From department', key: 'from_department', width: 18 },
          { header: 'To department', key: 'to_department', width: 18 },
          { header: 'From location', key: 'from_location', width: 18 },
          { header: 'To location', key: 'to_location', width: 18 },
          { header: 'Note', key: 'note', width: 32 },
        ],
        rows: transfers.map((transfer) => ({
          ...transfer,
          created_at: transfer.created_at.slice(0, 10),
        })),
      },
      {
        name: 'Current custody',
        columns: [
          { header: 'Tag number', key: 'tag_number', width: 16 },
          { header: 'Asset name', key: 'asset_name', width: 28 },
          { header: 'Holder', key: 'holder_name', width: 22 },
          { header: 'Department', key: 'department', width: 18 },
          { header: 'Location', key: 'location', width: 18 },
          { header: 'Province', key: 'province', width: 16 },
          { header: 'Status', key: 'status', width: 12 },
        ],
        rows: assets
          .filter((asset) => asset.holder_id)
          .map((asset) => ({
            tag_number: asset.tag_number,
            asset_name: asset.asset_name,
            holder_name: asset.holder_name,
            department: asset.department,
            location: asset.location,
            province: asset.province,
            status: asset.status,
          })),
      },
    ],
  };
}

export async function writeWorkbook(report: Report) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DreamFlow Inventory';
  workbook.created = new Date();
  for (const sheet of report.sheets) {
    const worksheet = workbook.addWorksheet(sheet.name, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    worksheet.columns = sheet.columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width ?? 20,
    }));
    const header = worksheet.getRow(1);
    header.font = { bold: true };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF4FF' } };
    for (const row of sheet.rows) worksheet.addRow(row);
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export const IMPORT_KINDS = ['items', 'assets', 'suppliers'] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];

export function isImportKind(value: string): value is ImportKind {
  return (IMPORT_KINDS as readonly string[]).includes(value);
}

const TEMPLATE_COLUMNS: Record<ImportKind, { header: string; note: string }[]> = {
  items: [
    { header: 'Bin card number', note: 'Optional. Must be unique.' },
    { header: 'Item name', note: 'Required.' },
    { header: 'Unit', note: 'Optional. Must match an existing unit name.' },
    { header: 'Quantity', note: 'Number, defaults to 0.' },
    { header: 'Minimum quantity', note: 'Number, defaults to 0.' },
    { header: 'Unit price', note: 'Number, defaults to 0.' },
    { header: 'Description', note: 'Optional free text.' },
  ],
  assets: [
    { header: 'Tag number', note: 'Optional. Must be unique.' },
    { header: 'Asset name', note: 'Required.' },
    { header: 'Status', note: `One of: ${ASSET_STATUSES.join(', ')}. Defaults to New.` },
    { header: 'Holder', note: 'Full name of an existing holder.' },
    { header: 'Category', note: 'Name of an existing category.' },
    { header: 'Project', note: 'Title of an existing project.' },
    { header: 'Department', note: 'Optional free text.' },
    { header: 'Location', note: 'Optional free text.' },
    { header: 'Province', note: 'Optional free text.' },
    { header: 'Quantity', note: 'Number, defaults to 1.' },
    { header: 'Cost', note: 'Number, per unit.' },
    { header: 'Currency', note: 'Defaults to AFN.' },
    { header: 'Serial number', note: 'Optional free text.' },
    { header: 'Voucher number', note: 'Optional free text.' },
    { header: 'Invoice date', note: 'YYYY-MM-DD.' },
    { header: 'Donor', note: 'Optional free text.' },
    { header: 'Specification', note: 'Optional free text.' },
    { header: 'Remark', note: 'Optional free text.' },
    { header: 'Useful life years', note: 'Depreciation life, 1 to 100.' },
    { header: 'Salvage value', note: 'Depreciation salvage, per unit.' },
  ],
  suppliers: [
    { header: 'Name', note: 'Required.' },
    { header: 'Contact person', note: 'Optional free text.' },
    { header: 'Phone', note: 'Optional free text.' },
    { header: 'Email', note: 'Optional email address.' },
    { header: 'Address', note: 'Optional free text.' },
    { header: 'Notes', note: 'Optional free text.' },
    { header: 'Active', note: 'Yes or No. Defaults to Yes.' },
  ],
};

export async function buildTemplate(kind: ImportKind) {
  const workbook = new ExcelJS.Workbook();
  const columns = TEMPLATE_COLUMNS[kind];
  const sheet = workbook.addWorksheet('Data', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.header,
    width: Math.max(18, column.header.length + 6),
  }));
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF4FF' } };

  const guide = workbook.addWorksheet('How to use');
  guide.columns = [
    { header: 'Column', key: 'column', width: 24 },
    { header: 'What to enter', key: 'note', width: 60 },
  ];
  guide.getRow(1).font = { bold: true };
  for (const column of columns) guide.addRow({ column: column.header, note: column.note });
  guide.addRow({ column: '', note: '' });
  guide.addRow({
    column: 'Import rules',
    note: 'Keep the header row unchanged, delete the sample formatting if any, and use one row per record. Rows with errors are skipped and reported.',
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    const record = value as unknown as Record<string, unknown>;
    if (Array.isArray(record.richText)) {
      return record.richText.map((part) => String((part as { text?: string }).text ?? '')).join('').trim();
    }
    if ('text' in record && record.text != null) return String(record.text).trim();
    if ('result' in record) return cellText(record.result as ExcelJS.CellValue);
    if ('hyperlink' in record && record.hyperlink) return String(record.hyperlink).trim();
    return '';
  }
  return String(value).trim();
}

async function readRows(buffer: ArrayBuffer, kind: ImportKind) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new InventoryError('Could not read the file. Upload a valid .xlsx workbook.', 400);
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw new InventoryError('The workbook has no worksheet.', 400);

  const aliases: Record<string, string> = {
    bincardnumber: 'bin_card_number',
    bincard: 'bin_card_number',
    bincardno: 'bin_card_number',
    itemname: 'item_name',
    item: 'item_name',
    name: kind === 'suppliers' ? 'name' : 'item_name',
    title: 'item_name',
    unit: 'unit',
    unitname: 'unit',
    uom: 'unit',
    quantity: 'quantity',
    qty: 'quantity',
    onhand: 'quantity',
    stock: 'quantity',
    minquantity: 'min_quantity',
    minimumquantity: 'min_quantity',
    minqty: 'min_quantity',
    minimum: 'min_quantity',
    unitprice: 'unit_price',
    price: kind === 'assets' ? 'cost' : 'unit_price',
    description: 'description',
    notes: kind === 'suppliers' ? 'notes' : 'description',
    note: kind === 'suppliers' ? 'notes' : 'remark',
    imageurl: 'image_url',
    tagnumber: 'tag_number',
    tag: 'tag_number',
    assetname: 'asset_name',
    asset: 'asset_name',
    status: kind === 'assets' ? 'status' : 'is_active',
    holder: 'holder',
    custodian: 'holder',
    assignedto: 'holder',
    department: 'department',
    dept: 'department',
    category: 'category',
    categoryname: 'category',
    project: 'project',
    projecttitle: 'project',
    projectname: 'project',
    location: 'location',
    place: 'location',
    province: 'province',
    cost: 'cost',
    value: 'cost',
    currency: 'asset_currency',
    assetcurrency: 'asset_currency',
    serialnumber: 'serial_number',
    serial: 'serial_number',
    serialno: 'serial_number',
    vouchernumber: 'voucher_number',
    voucher: 'voucher_number',
    invoicedate: 'invoice_date',
    purchasedate: 'invoice_date',
    donor: 'donar',
    donar: 'donar',
    program: 'donar',
    specification: 'item_specification',
    specs: 'item_specification',
    itemspecification: 'item_specification',
    remark: 'remark',
    remarks: kind === 'suppliers' ? 'notes' : 'remark',
    usefullifeyears: 'useful_life_years',
    usefullife: 'useful_life_years',
    life: 'useful_life_years',
    salvagevalue: 'salvage_value',
    salvage: 'salvage_value',
    contactperson: 'contact_person',
    contact: 'contact_person',
    person: 'contact_person',
    phone: 'phone',
    phonenumber: 'phone',
    mobile: 'phone',
    contactnumber: 'phone',
    email: 'email',
    emailaddress: 'email',
    address: 'address',
    isactive: 'is_active',
    active: 'is_active',
    suppliername: 'name',
    supplier: 'name',
    company: 'name',
  };

  const keys: Record<number, string> = {};
  sheet.getRow(1).eachCell((cell, column) => {
    const normalized = normalizeHeader(cellText(cell.value));
    const key = aliases[normalized];
    if (key) keys[column] = key;
  });
  if (Object.keys(keys).length === 0) {
    throw new InventoryError(
      'None of the columns matched this import type. Download the template and keep its header row.',
      400
    );
  }

  const rows: Record<string, string>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    if (rows.length >= 1000) return;
    const record: Record<string, string> = {};
    let filled = false;
    row.eachCell((cell, column) => {
      const key = keys[column];
      if (!key) return;
      const text = cellText(cell.value);
      if (text) filled = true;
      record[key] = text;
    });
    if (filled) rows.push({ ...record, __row: String(rowNumber) });
  });
  return rows;
}

const lookedUp = (map: Map<string, string>, value: string | undefined) =>
  value ? map.get(value.trim().toLowerCase()) : undefined;

export async function importWorkbook(kind: ImportKind, buffer: ArrayBuffer) {
  const rows = await readRows(buffer, kind);
  if (!rows.length) throw new InventoryError('The workbook has no data rows.', 400);

  const errors: string[] = [];
  let imported = 0;

  if (kind === 'items') {
    const units = new Map((await listUnits()).map((unit) => [unit.name.toLowerCase(), unit.id]));
    for (const row of rows) {
      const line = `Row ${row.__row}`;
      try {
        if (!row.item_name) throw new Error('Item name is required.');
        const unitName = row.unit?.trim().toLowerCase() ?? '';
        if (unitName && !units.has(unitName)) {
          throw new Error(`Unit "${row.unit}" is not in the Units list.`);
        }
        await saveItem({
          bin_card_number: row.bin_card_number ?? '',
          item_name: row.item_name,
          unit_id: units.get(unitName) ?? null,
          quantity: number(row.quantity),
          min_quantity: number(row.min_quantity),
          unit_price: number(row.unit_price),
          description: row.description ?? '',
          image_url: row.image_url ?? '',
        });
        imported += 1;
      } catch (error) {
        errors.push(`${line}: ${error instanceof Error ? error.message : 'Import failed.'}`);
      }
    }
  } else if (kind === 'assets') {
    const holders = new Map(
      (await listHolders()).map((holder) => [
        `${holder.first_name} ${holder.last_name}`.trim().toLowerCase(),
        holder.id,
      ])
    );
    const categories = new Map((await listCategories()).map((row) => [row.name.toLowerCase(), row.id]));
    const projects = new Map((await listProjects()).map((row) => [row.project_title.toLowerCase(), row.id]));
    for (const row of rows) {
      const line = `Row ${row.__row}`;
      try {
        if (!row.asset_name) throw new Error('Asset name is required.');
        const status = row.status?.trim() || 'New';
        if (!(ASSET_STATUSES as readonly string[]).includes(status)) {
          throw new Error(`Status "${status}" is not valid.`);
        }
        const holderName = row.holder ?? '';
        if (holderName && !lookedUp(holders, holderName)) {
          throw new Error(`Holder "${holderName}" was not found.`);
        }
        const categoryName = row.category ?? '';
        if (categoryName && !lookedUp(categories, categoryName)) {
          throw new Error(`Category "${categoryName}" was not found.`);
        }
        const projectTitle = row.project ?? '';
        if (projectTitle && !lookedUp(projects, projectTitle)) {
          throw new Error(`Project "${projectTitle}" was not found.`);
        }
        await saveAsset({
          tag_number: row.tag_number ?? '',
          asset_name: row.asset_name,
          item_specification: row.item_specification ?? '',
          status,
          holder_id: lookedUp(holders, holderName) ?? null,
          department: row.department ?? '',
          category_id: lookedUp(categories, categoryName) ?? null,
          location: row.location ?? '',
          province: row.province ?? '',
          cost: number(row.cost) ?? null,
          asset_currency: row.asset_currency || 'AFN',
          project_id: lookedUp(projects, projectTitle) ?? null,
          quantity: number(row.quantity) ?? 1,
          serial_number: row.serial_number ?? '',
          voucher_number: row.voucher_number ?? '',
          invoice_date: row.invoice_date ?? '',
          remark: row.remark ?? '',
          donar: row.donar ?? '',
          useful_life_years: number(row.useful_life_years) ?? null,
          salvage_value: number(row.salvage_value) ?? null,
        });
        imported += 1;
      } catch (error) {
        errors.push(`${line}: ${error instanceof Error ? error.message : 'Import failed.'}`);
      }
    }
  } else {
    for (const row of rows) {
      const line = `Row ${row.__row}`;
      try {
        if (!row.name) throw new Error('Supplier name is required.');
        const active = (row.is_active ?? '').trim().toLowerCase();
        await saveSupplier({
          name: row.name,
          contact_person: row.contact_person ?? '',
          phone: row.phone ?? '',
          email: row.email ?? '',
          address: row.address ?? '',
          notes: row.notes ?? '',
          is_active: active ? !['no', 'false', '0', 'inactive'].includes(active) : true,
        });
        imported += 1;
      } catch (error) {
        errors.push(`${line}: ${error instanceof Error ? error.message : 'Import failed.'}`);
      }
    }
  }

  return {
    imported,
    skipped: errors.length,
    total: rows.length,
    errors: errors.slice(0, 25),
  };
}

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

export async function buildQrZip(kind: 'assets' | 'items') {
  const entries =
    kind === 'assets'
      ? (await listAssets({})).map((asset) => ({
          code: asset.tag_number || asset.id,
          label: asset.asset_name,
        }))
      : (await listItems({})).map((item) => ({
          code: item.bin_card_number || item.id,
          label: item.item_name,
        }));

  if (!entries.length) {
    throw new InventoryError(
      kind === 'assets'
        ? 'There are no assets to generate QR codes for yet.'
        : 'There are no inventory items to generate QR codes for yet.',
      400
    );
  }

  const zip = new JSZip();
  const index: string[] = [
    `QR code images — ${kind === 'assets' ? 'assets' : 'inventory items'}`,
    `Generated ${new Date().toISOString()}`,
    '',
    'File\tQR content\tName',
  ];
  const used = new Set<string>();
  for (const entry of entries) {
    const png = await QRCode.toBuffer(entry.code, {
      type: 'png',
      width: 600,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
    const base = safeFilename(entry.code) || 'code';
    let filename = base;
    let suffix = 2;
    while (used.has(filename.toLowerCase())) {
      filename = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(filename.toLowerCase());
    zip.file(`${filename}.png`, png);
    index.push(`${filename}.png\t${entry.code}\t${entry.label}`);
  }
  zip.file('index.txt', index.join('\n'));

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return { buffer, count: entries.length };
}
