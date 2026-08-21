/**
 * AURA İntegra — Admin 2.0 Role & Permission Definitions
 * Server-authoritative capability matrix for all 7 tenant roles.
 */

import { TENANT_ROLE_VALUES, type TenantRole } from './tenant-roles'

export type PermissionAction = 'view' | 'create' | 'update' | 'delete' | 'finance' | 'settings' | 'export'

export type PermissionModule =
  | 'services'
  | 'customers'
  | 'inventory'
  | 'sales'
  | 'finance'
  | 'warranty'
  | 'personnel'
  | 'branches'
  | 'reports'
  | 'settings'
  | 'audit'

export interface RoleCapability {
  module: PermissionModule
  label: string
  actions: Record<PermissionAction, boolean>
}

export const PERMISSION_MODULES: { id: PermissionModule; label: string; description: string }[] = [
  { id: 'services', label: 'Teknik Servis', description: 'Servis kaydı açma, durum güncelleme, yedek parça kullanma' },
  { id: 'customers', label: 'Müşteriler', description: 'Müşteri rehberi, iletişim ve KVKK kayıtları' },
  { id: 'inventory', label: 'Stok & Envanter', description: 'Yedek parça, ürün, transfer ve sayım' },
  { id: 'sales', label: 'Satış & POS', description: 'Hızlı satış, fatura ve ödeme alma' },
  { id: 'finance', label: 'Kasa & Finans', description: 'Hesaplar, transfer, mutabakat ve cari hareketler' },
  { id: 'warranty', label: 'Garanti & Talepler', description: 'Garanti belgesi ve self-servis arıza talepleri' },
  { id: 'personnel', label: 'Personel & Ekipler', description: 'Kullanıcı listesi, yetkilendirme ve teknisyenler' },
  { id: 'branches', label: 'Şubeler', description: 'Lokasyon yönetimi, şube hesap ve stok atamaları' },
  { id: 'reports', label: 'Raporlar & Analitik', description: 'Finansal, operasyonel ve teknisyen performans raporları' },
  { id: 'settings', label: 'Sistem Ayarları', description: 'SLA kuralları, portal, bildirimler ve API anahtarları' },
  { id: 'audit', label: 'Denetim Günlükleri', description: 'Sistem güvenlik ve işlem geçmişi (audit logs)' },
]

export const DEFAULT_ROLE_PERMISSIONS: Record<TenantRole, Record<PermissionModule, Record<PermissionAction, boolean>>> = {
  tenant_admin: {
    services: { view: true, create: true, update: true, delete: true, finance: true, settings: true, export: true },
    customers: { view: true, create: true, update: true, delete: true, finance: true, settings: true, export: true },
    inventory: { view: true, create: true, update: true, delete: true, finance: true, settings: true, export: true },
    sales: { view: true, create: true, update: true, delete: true, finance: true, settings: true, export: true },
    finance: { view: true, create: true, update: true, delete: false, finance: true, settings: true, export: true },
    warranty: { view: true, create: true, update: true, delete: true, finance: true, settings: true, export: true },
    personnel: { view: true, create: true, update: true, delete: true, finance: true, settings: true, export: true },
    branches: { view: true, create: true, update: true, delete: true, finance: true, settings: true, export: true },
    reports: { view: true, create: true, update: true, delete: false, finance: true, settings: true, export: true },
    settings: { view: true, create: true, update: true, delete: true, finance: true, settings: true, export: true },
    audit: { view: true, create: false, update: false, delete: false, finance: false, settings: false, export: true },
  },
  admin: {
    services: { view: true, create: true, update: true, delete: true, finance: true, settings: true, export: true },
    customers: { view: true, create: true, update: true, delete: true, finance: true, settings: true, export: true },
    inventory: { view: true, create: true, update: true, delete: true, finance: true, settings: true, export: true },
    sales: { view: true, create: true, update: true, delete: true, finance: true, settings: true, export: true },
    finance: { view: true, create: true, update: true, delete: false, finance: true, settings: true, export: true },
    warranty: { view: true, create: true, update: true, delete: true, finance: true, settings: true, export: true },
    personnel: { view: true, create: true, update: true, delete: true, finance: true, settings: true, export: true },
    branches: { view: true, create: true, update: true, delete: true, finance: true, settings: true, export: true },
    reports: { view: true, create: true, update: true, delete: false, finance: true, settings: true, export: true },
    settings: { view: true, create: true, update: true, delete: true, finance: true, settings: true, export: true },
    audit: { view: true, create: false, update: false, delete: false, finance: false, settings: false, export: true },
  },
  mudur: {
    services: { view: true, create: true, update: true, delete: false, finance: true, settings: false, export: true },
    customers: { view: true, create: true, update: true, delete: false, finance: true, settings: false, export: true },
    inventory: { view: true, create: true, update: true, delete: false, finance: true, settings: false, export: true },
    sales: { view: true, create: true, update: true, delete: false, finance: true, settings: false, export: true },
    finance: { view: true, create: true, update: true, delete: false, finance: true, settings: false, export: true },
    warranty: { view: true, create: true, update: true, delete: false, finance: true, settings: false, export: true },
    personnel: { view: true, create: true, update: true, delete: false, finance: false, settings: false, export: true },
    branches: { view: true, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    reports: { view: true, create: false, update: false, delete: false, finance: true, settings: false, export: true },
    settings: { view: true, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    audit: { view: true, create: false, update: false, delete: false, finance: false, settings: false, export: false },
  },
  teknisyen: {
    services: { view: true, create: true, update: true, delete: false, finance: false, settings: false, export: false },
    customers: { view: true, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    inventory: { view: true, create: false, update: true, delete: false, finance: false, settings: false, export: false },
    sales: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    finance: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    warranty: { view: true, create: true, update: true, delete: false, finance: false, settings: false, export: false },
    personnel: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    branches: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    reports: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    settings: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    audit: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
  },
  muhasebe: {
    services: { view: true, create: false, update: false, delete: false, finance: true, settings: false, export: true },
    customers: { view: true, create: true, update: true, delete: false, finance: true, settings: false, export: true },
    inventory: { view: true, create: false, update: false, delete: false, finance: true, settings: false, export: true },
    sales: { view: true, create: true, update: true, delete: false, finance: true, settings: false, export: true },
    finance: { view: true, create: true, update: true, delete: false, finance: true, settings: false, export: true },
    warranty: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    personnel: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    branches: { view: true, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    reports: { view: true, create: false, update: false, delete: false, finance: true, settings: false, export: true },
    settings: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    audit: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
  },
  satis: {
    services: { view: true, create: true, update: true, delete: false, finance: true, settings: false, export: false },
    customers: { view: true, create: true, update: true, delete: false, finance: false, settings: false, export: false },
    inventory: { view: true, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    sales: { view: true, create: true, update: true, delete: false, finance: true, settings: false, export: false },
    finance: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    warranty: { view: true, create: true, update: false, delete: false, finance: false, settings: false, export: false },
    personnel: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    branches: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    reports: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    settings: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    audit: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
  },
  kasiyer: {
    services: { view: true, create: true, update: false, delete: false, finance: true, settings: false, export: false },
    customers: { view: true, create: true, update: false, delete: false, finance: false, settings: false, export: false },
    inventory: { view: true, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    sales: { view: true, create: true, update: true, delete: false, finance: true, settings: false, export: false },
    finance: { view: true, create: true, update: false, delete: false, finance: true, settings: false, export: false },
    warranty: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    personnel: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    branches: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    reports: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    settings: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    audit: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
  },
  viewer: {
    services: { view: true, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    customers: { view: true, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    inventory: { view: true, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    sales: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    finance: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    warranty: { view: true, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    personnel: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    branches: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    reports: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    settings: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
    audit: { view: false, create: false, update: false, delete: false, finance: false, settings: false, export: false },
  },
}

export function checkRolePermission(
  role: TenantRole,
  module: PermissionModule,
  action: PermissionAction,
): boolean {
  const roleRules = DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.viewer
  const moduleRules = roleRules[module]
  if (!moduleRules) return false
  return Boolean(moduleRules[action])
}
