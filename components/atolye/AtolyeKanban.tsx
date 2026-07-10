'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useState } from 'react'
import { useIsPhone } from '@/hooks/useMediaQuery'
import { updateServiceOrderRemote } from '@/lib/service-order-bridge'
import { toast } from 'sonner'

interface OrderRow {
  id: string
  job_no: string
  customer_name: string
  device_brand: string
  device_model: string
  status: string
  estimated_cost: number
  created_at: string
}

const COLUMNS = [
  { key: 'waiting_diagnosis', label: 'Bekliyor', color: 'border-slate-300 bg-slate-50' },
  { key: 'in_repair', label: 'Tamirde', color: 'border-sky-300 bg-sky-50' },
  { key: 'customer_approval_pending', label: 'Onay', color: 'border-amber-300 bg-amber-50' },
  { key: 'ready_for_pickup', label: 'Hazır', color: 'border-emerald-300 bg-emerald-50' },
  { key: 'delivered', label: 'Teslim', color: 'border-green-200 bg-green-50' },
] as const

function KanbanCard({ order }: { order: OrderRow }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: order.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm cursor-grab active:cursor-grabbing"
    >
      <Link href={`/dashboard/atolye/${order.id}`} onClick={e => e.stopPropagation()} className="block">
        <p className="font-bold text-sm text-slate-900">{order.job_no}</p>
        <p className="text-xs text-slate-600 mt-0.5">{order.customer_name}</p>
        <p className="text-xs text-slate-400">{order.device_brand} {order.device_model}</p>
        <p className="text-xs font-semibold text-sky-600 mt-2">
          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(order.estimated_cost)}
        </p>
      </Link>
    </motion.div>
  )
}

function KanbanColumn({ col, orders }: { col: typeof COLUMNS[number]; orders: OrderRow[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key })
  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-64 rounded-2xl border-2 p-3 min-h-[420px] transition-colors ${col.color} ${isOver ? 'ring-2 ring-sky-400' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">{col.label}</h3>
        <span className="text-xs font-bold bg-white/80 px-2 py-0.5 rounded-full">{orders.length}</span>
      </div>
      <div className="space-y-2">
        {orders.map(o => <KanbanCard key={o.id} order={o} />)}
      </div>
    </div>
  )
}

function MobileOrderCard({ order }: { order: OrderRow }) {
  const col = COLUMNS.find(c => c.key === order.status) ?? COLUMNS[0]
  return (
    <Link
      href={`/dashboard/atolye/${order.id}`}
      className="mobile-data-card block"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-sm text-slate-900">{order.job_no}</p>
          <p className="text-xs text-slate-600 mt-0.5">{order.customer_name}</p>
          <p className="text-xs text-slate-400">{order.device_brand} {order.device_model}</p>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${col.color}`}>
          {col.label}
        </span>
      </div>
      <p className="text-xs font-semibold text-sky-600 mt-2">
        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(order.estimated_cost)}
      </p>
    </Link>
  )
}

interface Props {
  orders: OrderRow[]
  onRefresh: () => void
}

export default function AtolyeKanban({ orders, onRefresh }: Props) {
  const isPhone = useIsPhone()
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const byColumn = useMemo(() => {
    const map: Record<string, OrderRow[]> = {}
    for (const col of COLUMNS) map[col.key] = []
    for (const o of orders) {
      const key = COLUMNS.some(c => c.key === o.status) ? o.status : 'waiting_diagnosis'
      map[key].push(o)
    }
    return map
  }, [orders])

  const activeOrder = activeId ? orders.find(o => o.id === activeId) : null

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) return

    const order = orders.find(o => o.id === active.id)
    const newStatus = String(over.id)
    if (!order || order.status === newStatus) return
    if (!COLUMNS.some(c => c.key === newStatus)) return

    const updated = await updateServiceOrderRemote(order.id, { status: newStatus })
    if (updated) {
      toast.success('Durum güncellendi')
      onRefresh()
    } else {
      toast.error('Güncellenemedi')
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  if (isPhone) {
    return (
      <div className="space-y-2 md:hidden">
        {orders.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">Kayıt yok</p>
        ) : (
          orders.map(o => <MobileOrderCard key={o.id} order={o} />)
        )}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 hidden md:flex">
        {COLUMNS.map(col => (
          <KanbanColumn key={col.key} col={col} orders={byColumn[col.key] ?? []} />
        ))}
      </div>
      <DragOverlay>
        {activeOrder ? (
          <div className="bg-white rounded-xl border-2 border-sky-400 p-3 shadow-lg w-60 opacity-90">
            <p className="font-bold text-sm">{activeOrder.job_no}</p>
            <p className="text-xs text-slate-600">{activeOrder.customer_name}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
