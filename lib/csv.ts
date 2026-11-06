export type CsvColumn<T> = { header: string; value: (row: T) => string | number | null | undefined };

function cell(value: string | number | null | undefined) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]) {
  const lines = [columns.map((col) => cell(col.header)).join(',')];
  for (const row of rows) lines.push(columns.map((col) => cell(col.value(row))).join(','));
  return lines.join('\r\n');
}

/** Browser-only. The BOM makes Excel open UTF-8 (Dari/Pashto) text correctly. */
export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  const blob = new Blob(['\uFEFF', toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
