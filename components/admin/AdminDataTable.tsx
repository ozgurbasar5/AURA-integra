'use client'

import React, { useState, useMemo } from 'react'
import {
  Search, ChevronLeft, ChevronRight, Download, Filter, ArrowUpDown
} from 'lucide-react'

export interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

interface Props<T> {
  data: T[]
  columns: Column<T>[]
  keyExtractor: (item: T) => string
  searchPlaceholder?: string
  searchFilter?: (item: T, query: string) => boolean
  onRowClick?: (item: T) => void
  actions?: React.ReactNode
  pageSize?: number
  exportFileName?: string
}

export function AdminDataTable<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  searchPlaceholder = 'Tabloda ara...',
  searchFilter,
  onRowClick,
  actions,
  pageSize = 10,
  exportFileName = 'export.csv',
}: Props<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const filteredData = useMemo(() => {
    let list = [...data]
    if (search.trim()) {
      const q = search.toLowerCase()
      if (searchFilter) {
        list = list.filter(item => searchFilter(item, q))
      } else {
        list = list.filter(item =>
          Object.values(item).some(val =>
            String(val ?? '').toLowerCase().includes(q)
          )
        )
      }
    }

    if (sortKey) {
      list.sort((a, b) => {
        const valA = a[sortKey]
        const valB = b[sortKey]
        if (valA === valB) return 0
        if (valA == null) return 1
        if (valB == null) return -1
        const res = valA > valB ? 1 : -1
        return sortAsc ? res : -res
      })
    }

    return list
  }, [data, search, searchFilter, sortKey, sortAsc])

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize])

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const handleExportCsv = () => {
    if (filteredData.length === 0) return
    const headers = columns.map(c => c.header).join(',')
    const rows = filteredData.map(item =>
      columns
        .map(c => {
          const val = item[c.key]
          return `"${String(val ?? '').replace(/"/g, '""')}"`
        })
        .join(',')
    )
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers, ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', exportFileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-xl">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950/40">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            placeholder={searchPlaceholder}
            className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {actions}
          <button
            onClick={handleExportCsv}
            className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200"
            title="CSV Dışa Aktar"
          >
            <Download size={13} />
            <span>Dışa Aktar</span>
          </button>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-950/70 border-b border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`py-3 px-4 ${col.className || ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className={`flex items-center gap-1.5 ${col.sortable ? 'cursor-pointer select-none hover:text-white' : ''}`}>
                    <span>{col.header}</span>
                    {col.sortable && (
                      <ArrowUpDown size={12} className={sortKey === col.key ? 'text-sky-400' : 'text-zinc-600'} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 text-xs">
            {paginatedData.length > 0 ? (
              paginatedData.map(item => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick?.(item)}
                  className={`transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-zinc-800/40' : 'hover:bg-zinc-800/20'
                  }`}
                >
                  {columns.map(col => (
                    <td key={col.key} className={`py-3 px-4 ${col.className || ''}`}>
                      {col.render ? col.render(item) : String(item[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-zinc-500 text-sm">
                  Kayıt bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950/40 flex items-center justify-between text-xs text-zinc-400">
        <div>
          Toplam <span className="font-semibold text-white">{filteredData.length}</span> kayıttan{' '}
          <span className="font-semibold text-white">
            {filteredData.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}-
            {Math.min(currentPage * pageSize, filteredData.length)}
          </span>{' '}
          gösteriliyor
        </div>

        <div className="flex items-center gap-1.5">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="px-2 font-medium text-white">
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
