import type { CsvColumn } from '@/lib/csv';

export type InventoryTransaction = {
  id: string;
  item_id: string;
  item_name: string;
  bin_card_number: string;
  transaction_type: 'in' | 'out';
  invoice_number: string;
  quantity: number;
  price: number;
  employee_id_number: string;
  holder_name: string;
  transaction_date: string;
  department: string;
  location: string;
  transaction_description: string;
};

export const TRANSACTION_CSV_COLUMNS: CsvColumn<InventoryTransaction>[] = [
  { header: 'Item name', value: (row) => row.item_name },
  { header: 'Bin card number', value: (row) => row.bin_card_number },
  { header: 'Type', value: (row) => (row.transaction_type === 'out' ? 'Out' : 'In') },
  { header: 'Date', value: (row) => row.transaction_date },
  { header: 'Quantity', value: (row) => row.quantity },
  { header: 'Price', value: (row) => row.price },
  { header: 'Invoice number', value: (row) => row.invoice_number },
  { header: 'Employee ID number', value: (row) => row.employee_id_number },
  { header: 'Holder', value: (row) => row.holder_name },
  { header: 'Department', value: (row) => row.department },
  { header: 'Location', value: (row) => row.location },
  { header: 'Description', value: (row) => row.transaction_description },
];

/** Next free `PREFIX-0001` bin card number, or '' when no prefix is configured. */
export function nextBinCardNumber(prefix: string, items: { bin_card_number: string }[]) {
  const clean = prefix.trim();
  if (!clean) return '';
  const used = new Set(items.map((item) => item.bin_card_number));
  let n = items.filter((item) => item.bin_card_number.startsWith(`${clean}-`)).length + 1;
  let candidate = `${clean}-${String(n).padStart(4, '0')}`;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${clean}-${String(n).padStart(4, '0')}`;
  }
  return candidate;
}
