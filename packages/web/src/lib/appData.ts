import { apiFetch } from "./api";
import { labs as demoLabs } from "./demoData";

export type DashboardSummary = {
  stats: {
    totalLabs: number;
    totalItems: number;
    availableItems: number;
    borrowedItems: number;
    maintenanceItems: number;
    outOfServiceItems: number;
    activeBorrows: number;
    overdueItems: number;
  };
  recent: Array<{
    itemName: string;
    elabsTag: string;
    labName: string;
    updatedAt: string;
    status: string;
  }>;
};

export async function fetchDashboardSummary(): Promise<DashboardSummary | null> {
  const res = await apiFetch("/dashboard/summary");
  if (!res.ok) return null;
  return res.json();
}

export type LabRow = {
  id: number;
  name: string;
  location: string | null;
  floor: string | null;
  totalItems: number;
  availableItems: number;
  borrowedItems: number;
  maintenanceItems: number;
  outOfServiceItems: number;
};

export async function fetchLabs(): Promise<LabRow[]> {
  const res = await apiFetch("/labs");
  if (!res.ok) {
    return demoLabs.map((l, idx) => ({
      id: idx + 1,
      name: l.name,
      location: "Main Campus",
      floor: String(idx + 1),
      totalItems: 20 + idx * 7,
      availableItems: 10 + idx * 3,
      borrowedItems: 3 + (idx % 4),
      maintenanceItems: idx % 2,
      outOfServiceItems: idx % 3 === 0 ? 1 : 0,
    }));
  }

  const data = await res.json();
  return (data.labs ?? []) as LabRow[];
}

export async function fetchLabDetail(labId: string | number) {
  const res = await apiFetch(`/labs/${labId}`);
  if (!res.ok) return null;
  return res.json();
}

export type AdminUser = {
  id: number;
  fullName: string;
  email: string;
  indexNo?: string | null;
  groupCode?: string | null;
  department?: string | null;
  semester?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roles: string[];
};

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const res = await apiFetch("/admin/users");
  if (!res.ok) return [];
  const data = await res.json();
  return (data.users ?? []) as AdminUser[];
}

export type RoleDefinition = {
  id: number;
  name: string;
  description: string;
  permissions: string[];
};

export type PermissionDefinition = {
  id: number;
  code: string;
  description: string;
};

export async function fetchAdminRoles(): Promise<{
  roles: RoleDefinition[];
  permissions: PermissionDefinition[];
}> {
  const res = await apiFetch("/admin/roles");
  if (!res.ok) return { roles: [], permissions: [] };
  const data = await res.json();
  return {
    roles: (data.roles ?? []) as RoleDefinition[],
    permissions: (data.permissions ?? []) as PermissionDefinition[],
  };
}

export async function updateUserRole(userId: number, role: string) {
  const res = await apiFetch(`/admin/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
  return res.json();
}

export async function updateUserStatus(userId: number, isActive: boolean) {
  const res = await apiFetch(`/admin/users/${userId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  return res.json();
}

export async function createAdminUser(payload: {
  fullName: string;
  email: string;
  password?: string;
  role: string;
  indexNo?: string;
}) {
  const res = await apiFetch("/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function updateRolePermissions(roleId: number, permissionCodes: string[]) {
  const res = await apiFetch(`/admin/roles/${roleId}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permissionCodes }),
  });
  return res.json();
}

export type AuditLog = {
  id: number;
  action: string;
  entity: string | null;
  entityId: string | null;
  createdAt: string;
  actorName: string | null;
  actorEmail: string | null;
};

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const res = await apiFetch("/admin/audit-logs");
  if (!res.ok) return [];
  const data = await res.json();
  return (data.logs ?? []) as AuditLog[];
}


