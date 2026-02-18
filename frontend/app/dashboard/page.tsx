import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { apiFetch, ApiError } from "@/lib/api";
import { BlogPost, User, UserRole, CurrentUser } from "@/lib/types";
import { PostsTable } from "./components/posts-table";
import { UsersTable } from "./components/users-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LayoutDashboard, Users, FileText, ShieldAlert } from "lucide-react";

// ── Decode JWT payload without verification (public payload info only) ─────────
function decodeJwtPayload(token: string): CurrentUser | null {
  try {
    const base64Payload = token.split(".")[1];
    const decoded = Buffer.from(base64Payload, "base64url").toString("utf-8");
    return JSON.parse(decoded) as CurrentUser;
  } catch {
    return null;
  }
}

const roleColor: Record<UserRole, string> = {
  [UserRole.ADMIN]: "bg-red-100 text-red-800 border-red-200",
  [UserRole.MANAGER]: "bg-amber-100 text-amber-800 border-amber-200",
  [UserRole.MEMBER]: "bg-blue-100 text-blue-700 border-blue-200",
};

export default async function DashboardPage() {
  // ── Auth check ─────────────────────────────────────────────────────────────
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;

  if (!accessToken) {
    redirect("/auth");
  }

  const currentUser = decodeJwtPayload(accessToken);
  if (!currentUser) {
    redirect("/auth");
  }

  // ── Fetch posts ────────────────────────────────────────────────────────────
  let posts: BlogPost[] = [];
  try {
    const data = await apiFetch<{ posts: BlogPost[]; total: number }>(
      "/blog-posts?pageSize=50"
    );
    posts = data.posts;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      redirect("/auth");
    }
    // Non-fatal — show empty list
  }

  // ── Fetch users (ADMIN only) ───────────────────────────────────────────────
  let users: User[] = [];
  if (currentUser.role === UserRole.ADMIN) {
    try {
      const data = await apiFetch<{ users: User[]; total: number }>(
        "/users?pageSize=50"
      );
      users = data.users;
    } catch {
      // Non-fatal — show empty list
    }
  }

  const displayName = currentUser.name || currentUser.email;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Manage your blog content and users
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{displayName}</span>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleColor[currentUser.role as UserRole]}`}
          >
            {currentUser.role}
          </span>
        </div>
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-muted-foreground/60" />
              <div>
                <p className="text-2xl font-bold">{posts.length}</p>
                <p className="text-xs text-muted-foreground">Total posts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-emerald-500/60" />
              <div>
                <p className="text-2xl font-bold">
                  {posts.filter((p) => p.status === "published").length}
                </p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-zinc-400/60" />
              <div>
                <p className="text-2xl font-bold">
                  {posts.filter((p) => p.status === "draft").length}
                </p>
                <p className="text-xs text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* ── Posts section ───────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Posts</h2>
          <Badge variant="secondary" className="text-xs">
            {posts.length}
          </Badge>
        </div>
        <PostsTable initialPosts={posts} userRole={currentUser.role as UserRole} />
      </section>

      {/* ── Users section (ADMIN only) ───────────────────────────────────────── */}
      {currentUser.role === UserRole.ADMIN && (
        <>
          <Separator />
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-xl font-semibold">Users</h2>
              <Badge variant="secondary" className="text-xs">
                {users.length}
              </Badge>
            </div>
            {users.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldAlert className="h-4 w-4" /> No users loaded
                  </CardTitle>
                  <CardDescription>
                    Unable to fetch user list. Check your backend connection.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <UsersTable initialUsers={users} />
            )}
          </section>
        </>
      )}

      {/* ── Member notice ───────────────────────────────────────────────────── */}
      {currentUser.role === UserRole.MEMBER && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              Read-only access
            </CardTitle>
            <CardDescription>
              You have the <strong>MEMBER</strong> role. You can view posts but
              cannot create, edit, or delete them. Contact an admin to upgrade
              your role.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
