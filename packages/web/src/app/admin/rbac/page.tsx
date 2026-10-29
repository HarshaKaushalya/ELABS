"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  AdminUser,
  fetchAdminUsers,
  fetchAdminRoles,
  updateUserRole,
  updateUserStatus,
  createAdminUser,
  updateRolePermissions,
  fetchAuditLogs,
  AuditLog,
  RoleDefinition,
  PermissionDefinition,
} from "@/lib/appData";
import {
  Users,
  ShieldCheck,
  ClipboardList,
  UserPlus,
  Download,
  Search,
  Check,
  X,
  AlertCircle,
  Edit3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Info,
} from "lucide-react";

function roleBadge(role: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    SYSTEM_ADMIN: { label: "System Admin", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
    LECTURER:     { label: "Lecturer",     color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)" },
    TECHNICIAN:   { label: "Technician",   color: "#06b6d4", bg: "rgba(6, 182, 212, 0.12)" },
    STUDENT:      { label: "Student",      color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.12)" },
  };
  const c = map[role] || { label: role, color: "#94a3b8", bg: "rgba(148, 163, 184, 0.12)" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 6,
        fontSize: "0.74rem",
        fontWeight: 600,
        color: c.color,
        background: c.bg,
        border: `1px solid ${c.color}25`,
      }}
    >
      {c.label}
    </span>
  );
}

export default function RBACPage() {
  const [activeTab, setActiveTab] = useState<"users" | "matrix" | "audit">("users");

  // Users state
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // RBAC Roles & Permissions state
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditSearch, setAuditSearch] = useState("");

  // Modals state
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState("");
  const [newStatus, setNewStatus] = useState(true);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  const [userModalError, setUserModalError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState("STUDENT");
  const [addIndexNo, setAddIndexNo] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [addModalError, setAddModalError] = useState("");

  // Load users
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await fetchAdminUsers();
      setUsers(data);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load RBAC Matrix
  const loadRoles = async () => {
    setLoadingRoles(true);
    try {
      const data = await fetchAdminRoles();
      setRoles(data.roles);
      setPermissions(data.permissions);
    } finally {
      setLoadingRoles(false);
    }
  };

  // Load Audit logs
  const loadAudit = async () => {
    setLoadingAudit(true);
    try {
      const data = await fetchAuditLogs();
      setAuditLogs(data);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  useEffect(() => {
    if (activeTab === "audit" && auditLogs.length === 0) {
      loadAudit();
    }
  }, [activeTab]);

  // Filtered users
  const filteredUsers = useMemo(() => {
    const key = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && !u.roles.includes(roleFilter)) return false;
      if (statusFilter === "active" && !u.isActive) return false;
      if (statusFilter === "inactive" && u.isActive) return false;
      if (!key) return true;
      return [
        u.fullName,
        u.email,
        u.indexNo ?? "",
        u.groupCode ?? "",
        u.department ?? "",
        u.roles.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(key);
    });
  }, [users, search, roleFilter, statusFilter]);

  // Paginated users
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredUsers.slice(start, start + pageSize);
  }, [filteredUsers, currentPage]);

  // User stats
  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.isActive).length;
  const adminCount = users.filter((u) => u.roles.includes("SYSTEM_ADMIN")).length;
  const lecturerCount = users.filter((u) => u.roles.includes("LECTURER")).length;
  const techCount = users.filter((u) => u.roles.includes("TECHNICIAN")).length;
  const studentCount = users.filter((u) => u.roles.includes("STUDENT")).length;

  // Open Edit User modal
  const openEditModal = (u: AdminUser) => {
    setEditingUser(u);
    setNewRole(u.roles[0] || "STUDENT");
    setNewStatus(u.isActive);
    setUserModalError("");
  };

  // Handle Edit User save
  const handleSaveUser = async () => {
    if (!editingUser) return;
    setIsUpdatingUser(true);
    setUserModalError("");
    try {
      // 1. Role update if changed
      if (newRole && !editingUser.roles.includes(newRole)) {
        const resRole = await updateUserRole(editingUser.id, newRole);
        if (resRole.error) throw new Error(resRole.error);
      }
      // 2. Status update if changed
      if (newStatus !== editingUser.isActive) {
        const resStatus = await updateUserStatus(editingUser.id, newStatus);
        if (resStatus.error) throw new Error(resStatus.error);
      }
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      setUserModalError(err.message || "Failed to update user.");
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // Handle Add User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addEmail.trim()) {
      return setAddModalError("Name and email are required.");
    }
    setIsCreatingUser(true);
    setAddModalError("");
    try {
      const res = await createAdminUser({
        fullName: addName.trim(),
        email: addEmail.trim(),
        password: addPassword.trim() || undefined,
        role: addRole,
        indexNo: addIndexNo.trim() || undefined,
      });
      if (res.error) throw new Error(res.error);
      setShowAddModal(false);
      setAddName("");
      setAddEmail("");
      setAddPassword("");
      setAddIndexNo("");
      await loadUsers();
    } catch (err: any) {
      setAddModalError(err.message || "Failed to create user.");
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Export filtered users to CSV
  const handleExportCSV = () => {
    if (filteredUsers.length === 0) return;
    const headers = ["ID", "Full Name", "Email", "Index/Reg No", "Roles", "Status", "Created At"];
    const rows = filteredUsers.map((u) => [
      u.id,
      `"${u.fullName.replace(/"/g, '""')}"`,
      `"${u.email.replace(/"/g, '""')}"`,
      `"${(u.indexNo ?? "").replace(/"/g, '""')}"`,
      `"${u.roles.join(", ")}"`,
      u.isActive ? "Active" : "Inactive",
      `"${new Date(u.createdAt).toISOString()}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `elabs_users_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Open Edit Permissions modal for a role
  const openEditRole = (role: RoleDefinition) => {
    setEditingRole(role);
    setSelectedPerms(new Set(role.permissions));
  };

  const togglePermission = (code: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleSaveRolePerms = async () => {
    if (!editingRole) return;
    try {
      await updateRolePermissions(editingRole.id, Array.from(selectedPerms));
      setEditingRole(null);
      await loadRoles();
    } catch (err) {
      alert("Failed to update role permissions.");
    }
  };

  return (
    <AppShell
      title="Admin & RBAC"
      subtitle="User directory, role assignments, and system permission governance"
    >
      {/* Navigation Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, borderBottom: "1px solid var(--border-color)", paddingBottom: 10 }}>
        <button
          onClick={() => setActiveTab("users")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: activeTab === "users" ? "rgba(37,99,235,0.12)" : "transparent",
            color: activeTab === "users" ? "#2563eb" : "var(--text-muted)",
            fontWeight: 600,
            fontSize: "0.86rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Users size={16} />
          <span>Users & Role Assignment</span>
          <span style={{ fontSize: "0.72rem", background: "rgba(37,99,235,0.15)", padding: "1px 6px", borderRadius: 10, color: "#2563eb" }}>
            {totalUsers}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("matrix")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: activeTab === "matrix" ? "rgba(37,99,235,0.12)" : "transparent",
            color: activeTab === "matrix" ? "#2563eb" : "var(--text-muted)",
            fontWeight: 600,
            fontSize: "0.86rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ShieldCheck size={16} />
          <span>RBAC Permissions Matrix</span>
          <span style={{ fontSize: "0.72rem", background: "rgba(5,150,105,0.15)", padding: "1px 6px", borderRadius: 10, color: "#059669" }}>
            {roles.length} Roles
          </span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "none",
            background: activeTab === "audit" ? "rgba(37,99,235,0.12)" : "transparent",
            color: activeTab === "audit" ? "#2563eb" : "var(--text-muted)",
            fontWeight: 600,
            fontSize: "0.86rem",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <ClipboardList size={16} />
          <span>Security Audit Trail</span>
        </button>
      </div>

      {/* ── TAB 1: USERS DIRECTORY & ROLE ASSIGNMENT ────────────────────────── */}
      {activeTab === "users" && (
        <>
          {/* Stats Bar */}
          <section className="stats-grid" style={{ marginBottom: 20 }}>
            <article className="stat-card">
              <div className="stat-value">{totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </article>
            <article className="stat-card">
              <div className="stat-value" style={{ color: "#10b981" }}>{activeCount}</div>
              <div className="stat-label">Active Accounts</div>
            </article>
            <article className="stat-card">
              <div className="stat-value" style={{ color: "#f59e0b" }}>{adminCount}</div>
              <div className="stat-label">System Admins</div>
            </article>
            <article className="stat-card">
              <div className="stat-value" style={{ color: "#06b6d4" }}>{lecturerCount + techCount}</div>
              <div className="stat-label">Academic & Tech Staff</div>
            </article>
            <article className="stat-card">
              <div className="stat-value" style={{ color: "#8b5cf6" }}>{studentCount}</div>
              <div className="stat-label">Enrolled Students</div>
            </article>
          </section>

          {/* Controls & Filter Bar */}
          <section className="panel" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
              {/* Left: Search & Filter */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", flex: 1, minWidth: 300 }}>
                <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
                  <Search size={15} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-muted)" }} />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    placeholder="Search by name, email, reg no, or role..."
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 36px",
                      background: "var(--bg-app)",
                      border: "1px solid var(--border-color)",
                      borderRadius: 8,
                      color: "var(--text-main)",
                      fontSize: "0.86rem",
                    }}
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                  style={{
                    background: "var(--bg-app)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                  }}
                >
                  <option value="all">All Roles</option>
                  <option value="SYSTEM_ADMIN">System Admin</option>
                  <option value="LECTURER">Lecturer</option>
                  <option value="TECHNICIAN">Technician</option>
                  <option value="STUDENT">Student</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  style={{
                    background: "var(--bg-app)",
                    border: "1px solid var(--border-color)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "var(--text-main)",
                    fontSize: "0.85rem",
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
              </div>

              {/* Right: Actions */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={filteredUsers.length === 0}
                  className="secondary-btn"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.85rem", padding: "8px 14px" }}
                >
                  <Download size={14} />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(true); setAddModalError(""); }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "0.85rem",
                    padding: "8px 16px",
                    background: "#2563eb",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <UserPlus size={15} />
                  <span>+ Add User</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role(s)</th>
                    <th>Index / Reg No</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                        Loading system directory...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>
                        No users match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div>
                            <strong style={{ color: "var(--text-main)", fontSize: "0.88rem" }}>{u.fullName}</strong>
                            {u.groupCode && (
                              <span style={{ marginLeft: 6, fontSize: "0.72rem", background: "rgba(37,99,235,0.08)", color: "#2563eb", padding: "1px 6px", borderRadius: 4 }}>
                                {u.groupCode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.84rem" }}>{u.email}</td>
                        <td>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {u.roles.map((r) => (
                              <span key={`${u.id}-${r}`}>{roleBadge(r)}</span>
                            ))}
                          </div>
                        </td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.82rem", color: u.indexNo ? "var(--text-main)" : "var(--text-muted)" }}>
                          {u.indexNo || "—"}
                        </td>
                        <td>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "2px 8px",
                              borderRadius: 6,
                              fontSize: "0.74rem",
                              fontWeight: 600,
                              color: u.isActive ? "#10b981" : "#ef4444",
                              background: u.isActive ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                              border: `1px solid ${u.isActive ? "rgba(16, 185, 129, 0.25)" : "rgba(239, 68, 68, 0.25)"}`,
                            }}
                          >
                            {u.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {new Date(u.updatedAt || u.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              padding: "4px 10px",
                              borderRadius: 6,
                              border: "1px solid var(--border-color)",
                              background: "transparent",
                              color: "var(--text-main)",
                              fontSize: "0.78rem",
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                          >
                            <Edit3 size={12} />
                            <span>Edit Role</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border-color)", fontSize: "0.84rem", color: "var(--text-muted)" }}>
                <div>
                  Showing {Math.min(filteredUsers.length, (currentPage - 1) * pageSize + 1)}–
                  {Math.min(filteredUsers.length, currentPage * pageSize)} of {filteredUsers.length} users
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-app)", color: "var(--text-main)", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.5 : 1 }}
                  >
                    <ChevronLeft size={14} style={{ verticalAlign: "middle" }} />
                  </button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-app)", color: "var(--text-main)", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.5 : 1 }}
                  >
                    <ChevronRight size={14} style={{ verticalAlign: "middle" }} />
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {/* ── TAB 2: RBAC PERMISSIONS MATRIX ─────────────────────────────────── */}
      {activeTab === "matrix" && (
        <section className="panel" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, color: "var(--text-main)" }}>System Roles & Access Matrix</h3>
              <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Permissions assigned to each institutional role within the ELABS platform
              </p>
            </div>
            <button className="secondary-btn" onClick={loadRoles} disabled={loadingRoles}>
              ↻ Refresh Matrix
            </button>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 220 }}>Permission Capability</th>
                  {roles.map((r) => (
                    <th key={r.id} style={{ textAlign: "center", minWidth: 140 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        {roleBadge(r.name)}
                        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 400 }}>
                          {r.description}
                        </span>
                        <button
                          onClick={() => openEditRole(r)}
                          style={{
                            marginTop: 4,
                            padding: "2px 8px",
                            fontSize: "0.7rem",
                            borderRadius: 4,
                            border: "1px solid var(--border-color)",
                            background: "var(--bg-app)",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                          }}
                        >
                          Configure
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div>
                        <strong style={{ color: "var(--text-main)", fontFamily: "monospace", fontSize: "0.85rem" }}>
                          {p.code}
                        </strong>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                          {p.description}
                        </div>
                      </div>
                    </td>
                    {roles.map((r) => {
                      const hasPerm = r.permissions.includes(p.code);
                      return (
                        <td key={`${r.id}-${p.code}`} style={{ textAlign: "center" }}>
                          {hasPerm ? (
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
                              <Check size={14} strokeWidth={3} />
                            </span>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", background: "rgba(148, 163, 184, 0.08)", color: "var(--text-muted)" }}>
                              <X size={13} strokeWidth={2} />
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── TAB 3: AUDIT TRAIL ──────────────────────────────────────────────── */}
      {activeTab === "audit" && (
        <section className="panel" style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, color: "var(--text-main)" }}>Administrative & Security Audit Trail</h3>
              <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Immutable event timeline of all user creation, role modifications, and status changes
              </p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                type="text"
                placeholder="Filter logs..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                style={{ padding: "6px 12px", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 6, color: "var(--text-main)", fontSize: "0.84rem" }}
              />
              <button className="secondary-btn" onClick={loadAudit} disabled={loadingAudit}>↻ Refresh</button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {loadingAudit ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 32 }}>Loading audit trail...</td></tr>
                ) : auditLogs.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 32 }}>No audit events logged.</td></tr>
                ) : (
                  auditLogs
                    .filter((l) => {
                      if (!auditSearch) return true;
                      const q = auditSearch.toLowerCase();
                      return [l.action, l.actorName ?? "", l.entity ?? ""].join(" ").toLowerCase().includes(q);
                    })
                    .map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: "var(--text-main)", fontSize: "0.85rem" }}>
                            {log.actorName || "System / Automated"}
                          </div>
                          {log.actorEmail && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{log.actorEmail}</div>}
                        </td>
                        <td>
                          <span style={{ fontSize: "0.78rem", fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "rgba(37,99,235,0.1)", color: "#2563eb", fontFamily: "monospace" }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                          {log.entity || "—"}{log.entityId ? ` #${log.entityId}` : ""}
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {/* Format metadata if object */}
                          Audit event logged
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── MODAL 1: EDIT USER ROLE & STATUS ────────────────────────────────── */}
      {editingUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, padding: 24, maxWidth: 440, width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(37,99,235,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" }}>
                <Edit3 size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "1.05rem" }}>Edit User Access & Role</h3>
                <p style={{ margin: "2px 0 0", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                  {editingUser.fullName} ({editingUser.email})
                </p>
              </div>
            </div>

            {userModalError && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "8px 12px", color: "#ef4444", fontSize: "0.82rem", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={15} />
                <span>{userModalError}</span>
              </div>
            )}

            {/* Select Role */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Assigned Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "9px 12px", color: "var(--text-main)", fontSize: "0.88rem" }}
              >
                <option value="SYSTEM_ADMIN">SYSTEM_ADMIN (Full Administrative Rights)</option>
                <option value="LECTURER">LECTURER (Academic & Grading Management)</option>
                <option value="TECHNICIAN">TECHNICIAN (Laboratory & Equipment Operations)</option>
                <option value="STUDENT">STUDENT (Student Portal & Practical Attendance)</option>
              </select>
            </div>

            {/* Account Status */}
            <div style={{ marginBottom: 18, background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.86rem", color: "var(--text-main)" }}>Account Active Status</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  {newStatus ? "Account can authenticate and access platform" : "Account suspended from logging in"}
                </div>
              </div>
              <input
                type="checkbox"
                checked={newStatus}
                onChange={(e) => setNewStatus(e.target.checked)}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                disabled={isUpdatingUser}
                style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveUser}
                disabled={isUpdatingUser}
                style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: "#2563eb", color: "#ffffff", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
              >
                {isUpdatingUser ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ADD USER MODAL ─────────────────────────────────────────── */}
      {showAddModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)" }}>
          <form onSubmit={handleCreateUser} style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, padding: 24, maxWidth: 460, width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(16,185,129,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981" }}>
                <UserPlus size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "1.05rem" }}>Create New User Account</h3>
                <p style={{ margin: "2px 0 0", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                  Provision institutional credentials for faculty, technicians, or students
                </p>
              </div>
            </div>

            {addModalError && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "8px 12px", color: "#ef4444", fontSize: "0.82rem", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={15} />
                <span>{addModalError}</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase" }}>Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. K. Silva or Weerasinghe T.H.K."
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px 12px", color: "var(--text-main)", fontSize: "0.88rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase" }}>Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. user@engug.ruh.ac.lk"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px 12px", color: "var(--text-main)", fontSize: "0.88rem" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase" }}>Initial Password</label>
                <input
                  type="password"
                  placeholder="Default: Elabs@123"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px 12px", color: "var(--text-main)", fontSize: "0.88rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase" }}>Assigned Role *</label>
                  <select
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px 10px", color: "var(--text-main)", fontSize: "0.86rem" }}
                  >
                    <option value="STUDENT">Student</option>
                    <option value="LECTURER">Lecturer</option>
                    <option value="TECHNICIAN">Technician</option>
                    <option value="SYSTEM_ADMIN">System Admin</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: 4, textTransform: "uppercase" }}>Index / Reg No</label>
                  <input
                    type="text"
                    placeholder="e.g. EG/2022/5401"
                    value={addIndexNo}
                    onChange={(e) => setAddIndexNo(e.target.value)}
                    style={{ width: "100%", background: "var(--bg-app)", border: "1px solid var(--border-color)", borderRadius: 8, padding: "8px 10px", color: "var(--text-main)", fontSize: "0.86rem" }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                disabled={isCreatingUser}
                style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreatingUser}
                style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: "#10b981", color: "#ffffff", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
              >
                {isCreatingUser ? "Creating…" : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── MODAL 3: CONFIGURE ROLE PERMISSIONS ─────────────────────────────── */}
      {editingRole && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, backdropFilter: "blur(4px)" }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", borderRadius: 14, padding: 24, maxWidth: 500, width: "100%", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(37,99,235,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#2563eb" }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, color: "var(--text-main)", fontSize: "1.05rem" }}>
                  Configure Permissions: {editingRole.name}
                </h3>
                <p style={{ margin: "2px 0 0", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                  Select which system capabilities are granted to this role
                </p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto", marginBottom: 18 }}>
              {permissions.map((p) => {
                const checked = selectedPerms.has(p.code);
                return (
                  <div
                    key={p.code}
                    onClick={() => togglePermission(p.code)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderRadius: 6,
                      background: checked ? "rgba(37,99,235,0.08)" : "var(--bg-app)",
                      border: `1px solid ${checked ? "#2563eb" : "var(--border-color)"}`,
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <strong style={{ color: "var(--text-main)", fontSize: "0.85rem", fontFamily: "monospace" }}>{p.code}</strong>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>{p.description}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePermission(p.code)}
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setEditingRole(null)}
                style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRolePerms}
                style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: "#2563eb", color: "#ffffff", fontWeight: 600, cursor: "pointer", fontSize: "0.85rem" }}
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
