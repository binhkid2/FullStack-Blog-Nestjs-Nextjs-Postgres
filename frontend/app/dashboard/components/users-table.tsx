"use client";

import { useState } from "react";
import { clientFetch } from "@/lib/api";
import { toast } from "sonner";
import { User, UserRole } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Pencil, Trash2, Check, Users2 } from "lucide-react";

interface Props {
  initialUsers: User[];
}

const roleMeta: Record<UserRole, { label: string; classes: string }> = {
  [UserRole.ADMIN]: {
    label: "Admin",
    classes: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300",
  },
  [UserRole.MANAGER]: {
    label: "Manager",
    classes: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
  },
  [UserRole.MEMBER]: {
    label: "Member",
    classes: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  },
};

function Avatar({ name, email }: { name?: string; email: string }) {
  const letter = (name || email).charAt(0).toUpperCase();
  return (
    <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary select-none">
      {letter}
    </div>
  );
}

export function UsersTable({ initialUsers }: Props) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<UserRole>(UserRole.MEMBER);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name || "");
    setEditRole(user.role);
  };

  const closeEdit = () => setEditingUser(null);

  const handleUpdate = async () => {
    if (!editingUser) return;
    setLoading(true);
    try {
      let updated = editingUser;

      if (editName.trim() !== (editingUser.name || "")) {
        const res = await clientFetch<{ success: boolean; user: User }>(
          `/users/${editingUser.id}`,
          {
            method: "PATCH",
            body: JSON.stringify({ name: editName.trim() || undefined }),
          }
        );
        updated = res.user;
      }

      if (editRole !== editingUser.role) {
        const res = await clientFetch<{ success: boolean; user: User }>(
          `/users/${editingUser.id}/role`,
          {
            method: "PATCH",
            body: JSON.stringify({ role: editRole }),
          }
        );
        updated = res.user;
      }

      toast.success("User updated.");
      setUsers((prev) =>
        prev.map((u) => (u.id === editingUser.id ? updated : u))
      );
      closeEdit();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleteLoading(true);
    try {
      await clientFetch(`/users/${deletingUser.id}`, { method: "DELETE" });
      toast.success(`User "${deletingUser.email}" deleted.`);
      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      setDeletingUser(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        No users found.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border overflow-hidden divide-y">
        {users.map((user) => {
          const role = roleMeta[user.role];
          return (
            <div
              key={user.id}
              className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/30 transition-colors"
            >
              <Avatar name={user.name} email={user.email} />

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {user.name || (
                      <span className="italic text-muted-foreground">
                        No name
                      </span>
                    )}
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${role.classes}`}
                  >
                    {role.label}
                  </span>
                  {!user.isActive && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Inactive
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
              </div>

              <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0"
                onClick={() => openEdit(user)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeletingUser(user)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
      </div>

      {/* ── Edit sheet ───────────────────────────────────────────────────── */}
      <Sheet open={!!editingUser} onOpenChange={(o) => !o && closeEdit()}>
        <SheetContent side="right" className="sm:max-w-sm">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Users2 className="h-4 w-4 text-muted-foreground" />
              Edit User
            </SheetTitle>
            <SheetDescription>{editingUser?.email}</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4 px-1">
            {/* Avatar preview */}
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-semibold text-primary">
                {(editName || editingUser?.email || "?").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{editName || "No name"}</p>
                <p className="text-xs text-muted-foreground">{editingUser?.email}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eu-name">Display name</Label>
              <Input
                id="eu-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Full name"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={editRole}
                onValueChange={(v) => setEditRole(v as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.MEMBER}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Member
                    </span>
                  </SelectItem>
                  <SelectItem value={UserRole.MANAGER}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Manager
                    </span>
                  </SelectItem>
                  <SelectItem value={UserRole.ADMIN}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Admin
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {editRole === UserRole.ADMIN
                  ? "Full access: create, edit, delete posts and manage users."
                  : editRole === UserRole.MANAGER
                  ? "Can create posts (saved as draft for review)."
                  : "Read-only access to the dashboard."}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={closeEdit} disabled={loading}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleUpdate} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Save
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Delete confirmation dialog ────────────────────────────────────── */}
      <AlertDialog open={!!deletingUser} onOpenChange={(o) => !o && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {deletingUser?.name || deletingUser?.email}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
