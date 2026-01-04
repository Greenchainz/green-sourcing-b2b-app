import React, { useState } from "react";

export interface Column<T> {
  key: keyof T | string; // Allow string for custom keys like 'actions'
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T; // Unique key for rows
  onRowClick?: (item: T) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  filterComponent?: React.ReactNode;
}

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  onRowClick,
  searchable = true,
  searchPlaceholder = "Search...",
  filterComponent,
}: DataTableProps<T>) {
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");

  // Handle Sorting
  const handleSort = (key: keyof T | string) => {
    // Only sort if it's a key of T (simple sorting) - custom render sorting can be complex
    const field = key as keyof T;
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Filter & Sort Logic
  const filteredData = data
    .filter((item) => {
      if (!searchTerm) return true;
      // Simple string search across all values
      return Object.values(item).some((val) =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      );
    })
    .sort((a, b) => {
      if (!sortField) return 0;

      const valA = a[sortField];
      const valB = b[sortField];

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  return (
    <div className="gc-card overflow-hidden flex flex-col">
      {/* Header / Controls */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/50">
        {/* Search */}
        {searchable && (
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="gc-input py-1.5 px-3 text-sm pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              ></path>
            </svg>
          </div>
        )}

        {/* Custom Filters */}
        {filterComponent && (
          <div className="flex gap-2 w-full sm:w-auto">{filterComponent}</div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`p-4 text-xs font-bold text-slate-500 uppercase tracking-wider 
                    ${col.sortable ? "cursor-pointer hover:bg-slate-100 transition-colors select-none" : ""}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortField === col.key && (
                      <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.length > 0 ? (
              filteredData.map((row) => (
                <tr
                  key={String(row[keyField])}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`group transition-colors ${onRowClick ? "cursor-pointer hover:bg-emerald-50/30" : "hover:bg-slate-50/50"}`}
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="p-4 text-sm text-slate-700">
                      {col.render ? col.render(row) : row[col.key as keyof T]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="p-8 text-center text-slate-500"
                >
                  No results found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination (simplified) */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 font-medium text-right">
        Showing {filteredData.length} records
      </div>
    </div>
  );
}
