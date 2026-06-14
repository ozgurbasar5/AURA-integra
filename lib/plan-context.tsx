'use client'

import { createContext, useContext } from 'react'
import type { PlanLevel } from '@/lib/plan-tiers'

const PlanLevelContext = createContext<PlanLevel>(1)

export function PlanProvider({
  level,
  children,
}: {
  level: PlanLevel
  children: React.ReactNode
}) {
  return <PlanLevelContext.Provider value={level}>{children}</PlanLevelContext.Provider>
}

/** Aktif bayinin paket seviyesi (1: Stok&Satış, 2: +Teknik Servis, 3: +Finans&Analitik) */
export function usePlanLevel(): PlanLevel {
  return useContext(PlanLevelContext)
}
