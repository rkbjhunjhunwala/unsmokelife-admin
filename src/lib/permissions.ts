/**
 * Role Definitions & Permission Logic
 * Final Version: Sanitized and Type-Safe
 */

export type UserRole = 'super-admin' | 'admin' | 'accountant' | 'customer-support';

export const ROLES: Record<string, UserRole> = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  ACCOUNTANT: 'accountant',
  CUSTOMER_SUPPORT: 'customer-support',
};

/**
 * Normalizes any string to a lowercase, trimmed UserRole or empty string
 */
const cleanRole = (role: string | undefined | null): string => {
  return role ? role.trim().toLowerCase() : '';
};

// --- Permission Checks ---

export const canEditData = (role: string | undefined) => {
  const r = cleanRole(role);
  return [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.CUSTOMER_SUPPORT].includes(r as UserRole);
};

export const canSuspendUser = (role: string | undefined) => {
  return cleanRole(role) === ROLES.SUPER_ADMIN;
};

export const canExportCSV = (role: string | undefined) => {
  const r = cleanRole(role);
  return [ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(r as UserRole);
};

// lib/permissions.ts

export const canViewLogs = (role: string | undefined) => {
  const r = role?.trim().toLowerCase();
  // Add 'accountant' to the authorized list for logs
  return [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT,ROLES.CUSTOMER_SUPPORT].includes(r as UserRole);
};

export const canManageAdmins = (role: string | undefined) => {
  return cleanRole(role) === ROLES.SUPER_ADMIN;
};

/**
 * Specifically for Accountant/Admin access to payment dashboards
 */
export const canAccessPayments = (role: string | undefined) => {
  const r = cleanRole(role);
  return [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.ACCOUNTANT].includes(r as UserRole);
};

/**
 * Generic helper for custom permission checks across the app
 */
export const hasPermission = (role: string | undefined, allowedRoles: UserRole[]) => {
  const r = cleanRole(role);
  return allowedRoles.includes(r as UserRole);
};

// lib/permissions.ts

export const canViewUserList = (role: string | undefined) => {
  const r = role?.trim().toLowerCase();
  // Only Admin and Super Admin can see the user directory
  return [ROLES.SUPER_ADMIN, ROLES.ADMIN,ROLES.CUSTOMER_SUPPORT].includes(r as UserRole);
};

