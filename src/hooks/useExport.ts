import * as XLSX from 'xlsx';

type ColumnDef<T> = {
  header: string;
  accessor: (row: T) => string | number | boolean;
};

export function exportToExcel<T>(data: T[], columns: ColumnDef<T>[], filename: string) {
  if (data.length === 0) return;

  const wsData = [
    columns.map(c => c.header),
    ...data.map(row => columns.map(c => c.accessor(row))),
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
