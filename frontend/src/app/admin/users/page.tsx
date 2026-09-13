"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch, apiDelete } from "@/lib/api";
import type { User, Role } from "@/lib/types";

const ROLES: Role[] = ["CUSTOMER", "RESTAURANT_OWNER", "DELIVERY", "ADMIN"];

const ROLE_COLORS: Record<Role, string> = {
  CUSTOMER: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  RESTAURANT_OWNER: "bg-orange-500/15 text-orange-400 border border-orange-500/30",
  DELIVERY: "bg-green-500/15 text-green-400 border border-green-500/30",
  ADMIN: "bg-primary/15 text-primary border border-primary/30",
};

function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`px-2 py-0.5 rounded-full font-label-sm text-[11px] font-semibold ${ROLE_COLORS[role]}`}>
      {role.replace("_", " ")}
    </span>
  );
}

type ConfirmModal =
  | { type: "role"; user: User; newRole: Role }
  | { type: "delete"; user: User }
  | null;

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<ConfirmModal>(null);
  const [roleSelect, setRoleSelect] = useState<Record<string, Role>>({});
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => apiGet<{ users: User[]; count: number }>("/users"),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: Role }) =>
      apiPatch<{ user: User }>(`/users/${userId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      showToast("Role updated successfully");
      setModal(null);
    },
    onError: () => {
      showToast("Failed to update role", false);
      setModal(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => apiDelete(`/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      showToast("User deleted");
      setModal(null);
    },
    onError: () => {
      showToast("Failed to delete user", false);
      setModal(null);
    },
  });

  const allUsers = data?.users ?? [];
  const filtered = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.ok
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-primary/20 text-primary border border-primary/30"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Confirm Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            {modal.type === "role" ? (
              <>
                <h3 className="text-[20px] font-bold text-on-surface mb-2">Change Role</h3>
                <p className="text-on-surface-variant text-[14px] mb-6">
                  Change <span className="text-on-surface font-semibold">{modal.user.name}</span>'s role to{" "}
                  <span className="text-primary font-semibold">{modal.newRole.replace("_", " ")}</span>?
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    id="cancel-role-change"
                    onClick={() => setModal(null)}
                    className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-[14px] hover:bg-surface-container transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-role-change"
                    onClick={() => updateRoleMutation.mutate({ userId: modal.user.id, role: modal.newRole })}
                    disabled={updateRoleMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-primary text-on-primary text-[14px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {updateRoleMutation.isPending ? "Saving..." : "Confirm"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-[20px] font-bold text-on-surface mb-2">Delete User</h3>
                <p className="text-on-surface-variant text-[14px] mb-6">
                  Permanently delete <span className="text-on-surface font-semibold">{modal.user.name}</span>? This cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    id="cancel-delete-user"
                    onClick={() => setModal(null)}
                    className="px-4 py-2 rounded-lg border border-outline-variant text-on-surface-variant text-[14px] hover:bg-surface-container transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-delete-user"
                    onClick={() => deleteUserMutation.mutate(modal.user.id)}
                    disabled={deleteUserMutation.isPending}
                    className="px-4 py-2 rounded-lg bg-error text-on-error text-[14px] font-semibold hover:bg-error/90 transition-colors disabled:opacity-50"
                  >
                    {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="mb-[32px] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-headline-md text-[32px] font-bold text-on-surface mb-[4px]">Users</h1>
          <p className="font-body-md text-[16px] text-on-surface-variant">
            {data?.count ?? 0} total users
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
            search
          </span>
          <input
            id="users-search"
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10 pr-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/50 text-on-surface text-[14px] placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary/60 w-72 transition-colors"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest dark:bg-surface-dim border border-white/40 shadow-[0_8px_32px_0_rgba(181,35,48,0.04)] rounded-xl backdrop-blur-md overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-secondary font-label-md text-[13px] bg-surface-container/30">
                    <th className="py-3 px-6 font-semibold">Name</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">Role</th>
                    <th className="py-3 px-4 font-semibold">Joined</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((u) => (
                    <tr key={u.id} className="border-b border-outline-variant/10 hover:bg-surface-container/20 transition-colors group">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[13px] shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-body-md text-[14px] text-on-surface font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-body-md text-[14px] text-on-surface-variant">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="py-3.5 px-4 font-body-md text-[13px] text-on-surface-variant">
                        {u.created_at
                          ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Role change dropdown */}
                          <select
                            id={`role-select-${u.id}`}
                            value={roleSelect[u.id] ?? u.role}
                            onChange={(e) => {
                              const newRole = e.target.value as Role;
                              setRoleSelect((prev) => ({ ...prev, [u.id]: newRole }));
                              if (newRole !== u.role) {
                                setModal({ type: "role", user: u, newRole });
                              }
                            }}
                            className="px-2 py-1.5 rounded-lg bg-surface-container border border-outline-variant/50 text-on-surface text-[12px] focus:outline-none focus:border-primary/60 transition-colors cursor-pointer"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>{r.replace("_", " ")}</option>
                            ))}
                          </select>

                          {/* Delete button */}
                          <button
                            id={`delete-user-${u.id}`}
                            onClick={() => setModal({ type: "delete", user: u })}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                            title="Delete user"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-on-surface-variant text-[14px]">
                        <span className="material-symbols-outlined text-[40px] block mb-2 opacity-40">group</span>
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/20">
                <span className="text-[13px] text-on-surface-variant">
                  Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                </span>
                <div className="flex gap-2">
                  <button
                    id="users-prev-page"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 rounded-lg border border-outline-variant/50 text-[13px] text-on-surface disabled:opacity-40 hover:bg-surface-container transition-colors"
                  >
                    ← Prev
                  </button>
                  <span className="px-3 py-1.5 text-[13px] text-on-surface-variant">
                    {page} / {totalPages}
                  </span>
                  <button
                    id="users-next-page"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-outline-variant/50 text-[13px] text-on-surface disabled:opacity-40 hover:bg-surface-container transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
