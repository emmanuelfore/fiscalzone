import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> {
  columns: {
    accessorKey: string;
    header: string;
    cell?: (props: { row: { original: TData } }) => React.ReactNode;
  }[];
  data: TData[];
  isLoading?: boolean;
  onRowClick?: (row: TData) => void;
  selectedId?: number | string | null;
}

export function DataTable<TData extends { id: number | string }>({
  columns,
  data,
  isLoading,
  onRowClick,
  selectedId,
}: DataTableProps<TData>) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="rounded-md border border-slate-100 overflow-hidden">
      <Table>
        <TableHeader className="bg-slate-50/50">
          <TableRow className="hover:bg-transparent border-slate-100">
            {columns.map((column) => (
              <TableHead key={column.accessorKey} className="h-10 px-4 font-black text-slate-400 uppercase tracking-widest text-[9px]">
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-slate-400 text-xs font-medium">
                No results found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow
                key={row.id}
                className={cn(
                  "cursor-pointer transition-colors border-slate-50",
                  selectedId === row.id ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-slate-50"
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <TableCell key={column.accessorKey} className="px-4 py-3">
                    {column.cell
                      ? column.cell({ row: { original: row } })
                      : (row as any)[column.accessorKey]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
