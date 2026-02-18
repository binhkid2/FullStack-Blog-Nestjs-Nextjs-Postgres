"use client";

import { useState } from "react";
import { clientFetch } from "@/lib/api";
import { toast } from "sonner";
import { User, UserRole } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Pencil, X, Check } from "lucide-react";

interface Props {
  initialUsers: User[];
}

const roleColor: Record<UserRole, string> = {
  [UserRole.ADMIN]: "bg-red-100 text-red-800 border-red-200",
  [UserRole.MANAGER]: "bg-amber-100 text-amber-800 border-amber-200",
  [UserRole.MEMBER]: "bg-blue-100 text-blue-700 border-blue-200",
};

export function UsersTable({ initialUsers }: Props) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>(UserRole.MEMBER);
  const [loading, setLoading] = useState(false);

  const startEdit = (user: User) => {
    setEditingId(user.id);
    setEditName(user.name || "");
    setEditRole(user.role);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = async (user: User) => {
    setLoading(true);
    try {
      // Update name if changed
      let updated = user;
      if (editName !== (user.name || "")) {
        const res = await clientFetch<{ success: boolean; user: User }>(
          `/users/${user.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ name: editName || undefined }),
          }
        );
        updated = res.user;
      }

      // Update role if changed
      if (editRole !== user.role) {
        const res = await clientFetch<{ success: boolean; user: User }>(
          `/users/${user.id}/role`,
          {
            method: "PATCH",
            body: JSON.stringify({ role: editRole }),
          }
        );
        updated = res.user;
      }

      toast.success("User updated.");
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      setEditingId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {users.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No users found.
        </div>
      ) : (
        users.map((user) => (
          <div
            key={user.id}
            className="rounded-xl border bg-card p-4 shadow-sm flex flex-wrap items-center gap-3"
          >
            {editingId === user.id ? (
              /* ── Edit row ─────────────────────────────────────────────── */
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <Input
                  className="h-8 w-40"
                  placeholder="Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <Select
                  value={editRole}
                  onValueChange={(v) => setEditRole(v as UserRole)}
                >
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserRole.MEMBER}>MEMBER</SelectItem>
                    <SelectItem value={UserRole.MANAGER}>MANAGER</SelectItem>
                    <SelectItem value={UserRole.ADMIN}>ADMIN</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={() => handleUpdate(user)}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              /* ── View row ─────────────────────────────────────────────── */
              <>
                <div className="flex flex-1 flex-wrap items-center gap-3 min-w-0">
                  {/* Avatar placeholder */}
                  <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-semibold uppercase">
                    {(user.name || user.email).charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {user.name ?? (
                        <span className="italic text-muted-foreground">
                          No name
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${roleColor[user.role]}`}
                  >
                    {user.role}
                  </span>

                  {!user.isActive && (
                    <Badge
                      variant="outline"
                      className="text-xs text-muted-foreground"
                    >
                      Inactive
                    </Badge>
                  )}

                  <p className="text-xs text-muted-foreground shrink-0">
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => startEdit(user)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}
