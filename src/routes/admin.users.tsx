import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Trash2, User, CheckCircle2, Clock, Search, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  display_name: string | null;
  sections_complete: number;
  has_child_profile: boolean;
  has_vault_docs: boolean;
};

function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [confirmUser, setConfirmUser] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const { data: users = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
  });

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.display_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  async function handleDelete() {
    if (!confirmUser || confirmText !== confirmUser.email) return;
    setDeleting(confirmUser.id);
    try {
      const { error } = await supabase.rpc("admin_delete_user", { target_user_id: confirmUser.id });
      if (error) throw error;
      toast.success(`Account and all data for ${confirmUser.email} permanently deleted.`);
      setConfirmUser(null);
      setConfirmText("");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    } catch (e) {
      toast.error(`Deletion failed: ${(e as Error).message}`);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">User Management</h1>
          <p className="text-sm text-white/50 mt-0.5">{users.length} registered user{users.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        <input
          type="text"
          placeholder="Search by email or name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/30"
        />
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-white/40">Loading users…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-white/40">
          <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>{search ? "No users match your search." : "No users yet."}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => (
            <div
              key={u.id}
              className="bg-white/5 border border-white/10 rounded-xl px-5 py-4 flex items-center gap-4 flex-wrap"
            >
              {/* Avatar */}
              <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {(u.display_name || u.email)[0].toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{u.email}</div>
                {u.display_name && (
                  <div className="text-xs text-white/50 truncate">{u.display_name}</div>
                )}
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-white/40 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Joined {new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {u.last_sign_in_at && (
                    <span className="text-xs text-white/40">
                      Last seen {new Date(u.last_sign_in_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
                  <CheckCircle2 className="h-3 w-3 inline mr-1 text-green-400" />
                  {u.sections_complete} sections
                </span>
                {u.has_child_profile && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">Profile</span>
                )}
                {u.has_vault_docs && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">Vault</span>
                )}
              </div>

              {/* Delete */}
              <button
                onClick={() => { setConfirmUser(u); setConfirmText(""); }}
                disabled={deleting === u.id}
                className="shrink-0 p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-30"
                title="Delete user and all data"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-white">Delete User Account</p>
                  <p className="text-xs text-white/50 mt-0.5">This cannot be undone.</p>
                </div>
              </div>
              <button onClick={() => setConfirmUser(null)} className="text-white/30 hover:text-white/60">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-lg bg-white/5 px-4 py-3 text-sm text-white/70 space-y-1">
              <p><span className="text-white/40">Email:</span> {confirmUser.email}</p>
              {confirmUser.display_name && <p><span className="text-white/40">Name:</span> {confirmUser.display_name}</p>}
              <p><span className="text-white/40">Joined:</span> {new Date(confirmUser.created_at).toLocaleDateString("en-IN")}</p>
            </div>

            <p className="text-sm text-white/70">
              This will permanently delete <strong className="text-white">all data</strong> — child profile, medical records, legal documents, vault files, and the auth account.
            </p>

            <div className="space-y-2">
              <label className="text-xs text-white/50">
                Type the user's email to confirm: <span className="font-mono text-white/80">{confirmUser.email}</span>
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="Paste email here…"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-red-400/50"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={confirmText !== confirmUser.email || deleting === confirmUser.id}
                className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {deleting === confirmUser.id ? (
                  <><RefreshCw className="h-4 w-4 animate-spin" /> Deleting…</>
                ) : (
                  <><Trash2 className="h-4 w-4" /> Permanently Delete</>
                )}
              </button>
              <button
                onClick={() => { setConfirmUser(null); setConfirmText(""); }}
                className="px-4 rounded-lg border border-white/10 text-white/60 hover:bg-white/10 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
