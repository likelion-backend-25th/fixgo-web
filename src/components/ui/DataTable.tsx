import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedKey?: string;
  emptyText?: string;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  onSort?: (key: string) => void;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  selectedKey,
  emptyText = "조회 결과가 없습니다.",
  sortKey,
  sortDir = "asc",
  onSort,
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead className="bg-neutral-50 text-left text-xs font-medium text-neutral-500">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={cn("px-4 py-2.5 font-medium", column.className)}>
                {column.sortable === true && onSort !== undefined ? (
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => onSort(column.key)}>
                    {column.header}
                    <span className="text-[10px] text-neutral-400">
                      {sortKey === column.key ? (sortDir === "asc" ? "▲" : "▼") : "▾"}
                    </span>
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-neutral-500">
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row) => {
              const key = rowKey(row);
              return (
                <tr
                  key={key}
                  onClick={onRowClick === undefined ? undefined : () => onRowClick(row)}
                  className={cn(
                    "border-t border-neutral-100",
                    onRowClick !== undefined && "cursor-pointer hover:bg-neutral-50",
                    selectedKey === key && "bg-blue-50",
                  )}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={cn("px-4 py-3 align-middle text-neutral-800", column.className)}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
