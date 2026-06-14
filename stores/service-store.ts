// stores/service-store.ts — Servis iş emri state management
import { create } from 'zustand'

export interface ServiceFilter {
  search: string
  status: string
  priority: string
  technician: string
  dateFrom: string
  dateTo: string
  brand: string
}

interface ServiceState {
  // View
  viewMode: 'table' | 'kanban' | 'grid'
  setViewMode: (m: 'table' | 'kanban' | 'grid') => void

  // Filters
  filters: ServiceFilter
  setFilter: (key: keyof ServiceFilter, value: string) => void
  resetFilters: () => void

  // Selection
  selectedIds: Set<string>
  toggleSelect: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void

  // Drawer
  activeOrderId: string | null
  setActiveOrder: (id: string | null) => void

  // Modal
  showNewOrderModal: boolean
  setShowNewOrderModal: (v: boolean) => void
}

const defaultFilters: ServiceFilter = {
  search: '', status: '', priority: '', technician: '', dateFrom: '', dateTo: '', brand: '',
}

export const useServiceStore = create<ServiceState>((set) => ({
  viewMode: 'table',
  setViewMode: (viewMode) => set({ viewMode }),

  filters: { ...defaultFilters },
  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),

  selectedIds: new Set(),
  toggleSelect: (id) => set((s) => {
    const next = new Set(s.selectedIds)
    next.has(id) ? next.delete(id) : next.add(id)
    return { selectedIds: next }
  }),
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set() }),

  activeOrderId: null,
  setActiveOrder: (activeOrderId) => set({ activeOrderId }),

  showNewOrderModal: false,
  setShowNewOrderModal: (showNewOrderModal) => set({ showNewOrderModal }),
}))
