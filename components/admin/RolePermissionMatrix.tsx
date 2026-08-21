'use client'

import React, { useState } from 'react'
import { Check, X, Shield, Info } from 'lucide-react'
import {
  PERMISSION_MODULES,
  DEFAULT_ROLE_PERMISSIONS,
  type PermissionAction,
  type PermissionModule,
} from '@/lib/admin-permissions'
import { TENANT_ROLE_OPTIONS, type TenantRole } from '@/lib/tenant-roles'

interface Props {
  readOnly?: boolean
}

export function RolePermissionMatrix({ readOnly = false }: Props) {
  const [selectedRole, setSelectedRole] = useState<TenantRole>('teknisyen')
  const [matrix, setMatrix] = useState(DEFAULT_ROLE_PERMISSIONS)

  const togglePermission = (module: PermissionModule, action: PermissionAction) => {
    if (readOnly || selectedRole === 'tenant_admin') return // tenant_admin is immutable full access

    setMatrix(prev => {
      const roleCopy = { ...prev[selectedRole] }
      const moduleCopy = { ...roleCopy[module] }
      moduleCopy[action] = !moduleCopy[action]
      roleCopy[module] = moduleCopy
      return {
        ...prev,
        [selectedRole]: roleCopy,
      }
    })
  }

  const ACTIONS: { id: PermissionAction; label: string }[] = [
    { id: 'view', label: 'Görüntüle' },
    { id: 'create', label: 'Oluştur' },
    { id: 'update', label: 'Düzenle' },
    { id: 'delete', label: 'Sil' },
    { id: 'finance', label: 'Finans' },
    { id: 'settings', label: 'Ayarlar' },
    { id: 'export', label: 'Dışa Aktar' },
  ]

  const currentRoleConfig = TENANT_ROLE_OPTIONS.find(r => r.value === selectedRole)

  return (
    <div className="space-y-6">
      {/* Role Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {TENANT_ROLE_OPTIONS.map(role => (
          <button
            key={role.value}
            onClick={() => setSelectedRole(role.value)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedRole === role.value
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                : 'bg-zinc-800/80 text-zinc-400 hover:text-white hover:bg-zinc-700/80'
            }`}
          >
            <Shield size={14} />
            {role.label}
          </button>
        ))}
      </div>

      {/* Role Description Card */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <span>{currentRoleConfig?.label} Yetki Şablonu</span>
            {selectedRole === 'tenant_admin' && (
              <span className="text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full">
                Tam Yetkili (Kök Yönetici)
              </span>
            )}
          </h4>
          <p className="text-xs text-zinc-400 mt-0.5">
            Bu rolün erişebildiği modüller ve gerçekleştirebildiği işlem izinleri.
          </p>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950/80 border-b border-zinc-800 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 min-w-[180px]">Modül</th>
                {ACTIONS.map(a => (
                  <th key={a.id} className="py-3.5 px-3 text-center min-w-[70px]">
                    {a.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {PERMISSION_MODULES.map(mod => {
                const permissions = matrix[selectedRole]?.[mod.id] || {}
                return (
                  <tr key={mod.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-white">{mod.label}</p>
                      <p className="text-[10px] text-zinc-400 line-clamp-1">{mod.description}</p>
                    </td>
                    {ACTIONS.map(act => {
                      const granted = Boolean(permissions[act.id])
                      return (
                        <td key={act.id} className="py-3 px-3 text-center">
                          <button
                            type="button"
                            disabled={readOnly || selectedRole === 'tenant_admin'}
                            onClick={() => togglePermission(mod.id, act.id)}
                            className={`w-7 h-7 rounded-lg inline-flex items-center justify-center transition-all ${
                              granted
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                                : 'bg-zinc-800 text-zinc-600 border border-zinc-700/50 hover:bg-zinc-700/50'
                            }`}
                            title={`${mod.label} - ${act.label}: ${granted ? 'İzin Verildi' : 'Engellendi'}`}
                          >
                            {granted ? <Check size={14} strokeWidth={2.5} /> : <X size={13} />}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
