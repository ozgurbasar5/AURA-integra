'use client'

import { createContext, useContext } from 'react'
import {
  isOwnerRole,
  canSeeFinance,
  canDeliverService,
  canEditPricing,
  getRoleHomeLabel,
  type AppRole,
} from '@/lib/role-access'

const RoleContext = createContext<{
  role: AppRole
  isOwner: boolean
  canSeeFinance: boolean
  canDeliver: boolean
  canEditPricing: boolean
  homeLabel: string
}>({
  role: 'viewer',
  isOwner: false,
  canSeeFinance: false,
  canDeliver: false,
  canEditPricing: false,
  homeLabel: 'Panel',
})

export function RoleProvider({ role, children }: { role: string; children: React.ReactNode }) {
  const value = {
    role,
    isOwner: isOwnerRole(role),
    canSeeFinance: canSeeFinance(role),
    canDeliver: canDeliverService(role),
    canEditPricing: canEditPricing(role),
    homeLabel: getRoleHomeLabel(role),
  }
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useUserRole() {
  return useContext(RoleContext)
}
