/**
 * Rol bazlı route ve yetki kontrolü — lib/role-matrix.ts tek kaynak
 */

export {
  OWNER_ROLES,
  isOwnerRole,
  getWebRoutesForRole as getAllowedRoutes,
  isRouteAllowedForRole,
  isNavAllowed,
  getSidebarGroupsForRole,
  getRoleHomeLabel,
  canSeeFinance,
  canDeliverService,
  canEditPricing,
  canManageUsers,
} from './role-matrix'

export type AppRole = string
