import { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { classNames } from '../utils/helpers';

export default function DataTable({
  columns,
  data = [],
  loading = false,
  searchable = true,
  searchPlaceholder = 'Search...',
  onSearch,
  pagination,
  onPageChange,
  emptyMessage = 'No data found',
  onRowClick,
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSearch = (value) => {
    setSearch(value);
    onSearch?.(value);
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  let sortedData = [...data];
  if (sortKey) {
    sortedData.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  if (search && !onSearch) {
    sortedData = sortedData.filter((row) =>
      columns.some((col) => {
        const val = col.accessor ? row[col.accessor] : '';
        return String(val || '').toLowerCase().includes(search.toLowerCase());
      })
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden rounded-xl bg-white border border-steel-100 shadow-card"
    >
      {searchable && (
        <div className="border-b border-steel-100 p-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-concrete-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-steel-100 bg-steel-50/60">
              {columns.map((col) => (
                <th
                  key={col.accessor || col.header}
                  className={classNames(
                    'px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-concrete-400',
                    col.sortable && 'cursor-pointer select-none hover:text-steel-600 transition-colors'
                  )}
                  onClick={() => col.sortable && handleSort(col.accessor)}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && sortKey === col.accessor && (
                      sortDir === 'asc' ? <ChevronUp className="h-3 w-3 text-primary" /> : <ChevronDown className="h-3 w-3 text-primary" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.accessor} className="px-4 py-2.5">
                      <div className="h-4 animate-pulse rounded bg-steel-100" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-concrete-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              <AnimatePresence>
                {sortedData.map((row, idx) => (
                  <motion.tr
                    key={row.id || idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className={classNames(
                      'transition-colors hover:bg-steel-50/60',
                      onRowClick && 'cursor-pointer'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => (
                      <td key={col.accessor || col.header} className="px-4 py-2.5 text-xs text-steel-700">
                        {col.render ? col.render(row) : row[col.accessor]}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between border-t border-steel-100 px-4 py-2.5">
          <p className="text-xs text-concrete-400">
            Page <span className="font-semibold text-steel-700">{pagination.page}</span> of <span className="font-semibold text-steel-700">{pagination.pages}</span> <span className="text-steel-300">({pagination.total} total)</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="btn-ghost !p-2 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="btn-ghost !p-2 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
