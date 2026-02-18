import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { apiFetch, ApiError } from "@/lib/api";
import { BlogPost, User, UserRole, CurrentUser, PostStatus } from "@/lib/types";
import { PostsTable } from "./components/posts-table";
import { UsersTable } from "./components/users-table";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Users,
  Eye,
  TrendingUp,
  CheckCircle2,
  Clock,
  Archive,
} from "lucide-react";

// ── JWT decode (no verification — display only) ────────────────────────────
function decodeJwtPayload(token: string): CurrentUser | null {
  try {
    const base64Payload = token.split(".")[1];
    const decoded = Buffer.from(base64Payload, "base64url").toString("utf-8");
    return JSON.parse(decoded) as CurrentUser;
  } catch {
    return null;
  }
}

const rolePill: Record<UserRole, string> = {
  [UserRole.ADMIN]: "bg-red-100 text-red-700 border-red-200",
  [UserRole.MANAGER]: "bg-amber-100 text-amber-700 border-amber-200",
  [UserRole.MEMBER]: "bg-blue-100 text-blue-700 border-blue-200",
};

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  accent?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              {label}
            </p>
            <p className={`text-3xl font-bold tracking-tight ${accent ?? ""}`}>
              {value}
            </p>
            {sub && (
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            )}
          </div>
          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-4.5 w-4.5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  /* Auth */
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  if (!accessToken) redirect("/auth");

  const currentUser = decodeJwtPayload(accessToken);
  if (!currentUser) redirect("/auth");

  /* Posts */
  let posts: BlogPost[] = [];
  try {
    const data = await apiFetch<{ posts: BlogPost[]; total: number }>(
      "/blog-posts?pageSize=100"
    );
    posts = data.posts;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) redirect("/auth");
  }

  /* Users (ADMIN only) */
  let users: User[] = [];
  if (currentUser.role === UserRole.ADMIN) {
    try {
      const data = await apiFetch<{ users: User[]; total: number }>(
        "/users?pageSize=100"
      );
      users = data.users;
    } catch { /* non-fatal */ }
  }

  /* Stats */
  const published = posts.filter((p) => p.status === PostStatus.PUBLISHED).length;
  const drafts = posts.filter((p) => p.status === PostStatus.DRAFT).length;
  const archived = posts.filter((p) => p.status === PostStatus.ARCHIVED).length;
  const totalViews = posts.reduce((s, p) => s + (p.views ?? 0), 0);

  const displayName = currentUser.name || currentUser.email;
  const isAdmin = currentUser.role === UserRole.ADMIN;

  return (
    <div className="min-h-screen bg-muted/20">
      {/* ── Top header bar ──────────────────────────────────────────────────── */}
      <div className="border-b bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              Welcome back, <span className="font-medium text-foreground">{displayName}</span>
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${rolePill[currentUser.role as UserRole]}`}
          >
            {currentUser.role}
          </span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Stats grid ────────────────────────────────────────────────────── */}
        <div className={`grid gap-4 ${isAdmin ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
          <StatCard
            icon={FileText}
            label="Total posts"
            value={posts.length}
            sub={`${published} published`}
          />
          <StatCard
            icon={CheckCircle2}
            label="Published"
            value={published}
            accent="text-emerald-600"
          />
          <StatCard
            icon={Clock}
            label="Drafts"
            value={drafts}
            accent="text-zinc-500"
          />
          {isAdmin && (
            <>
              <StatCard
                icon={Eye}
                label="Total views"
                value={totalViews.toLocaleString()}
                sub="across all posts"
                accent="text-primary"
              />
            </>
          )}
        </div>

        {/* Second row for admin — archived + users */}
        {isAdmin && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={Archive}
              label="Archived"
              value={archived}
              accent="text-amber-600"
            />
            <StatCard
              icon={Users}
              label="Total users"
              value={users.length}
              sub={`${users.filter((u) => u.isActive).length} active`}
            />
            <StatCard
              icon={TrendingUp}
              label="Avg. views / post"
              value={posts.length ? Math.round(totalViews / posts.length).toLocaleString() : "—"}
            />
          </div>
        )}

        {/* ── Tabs ──────────────────────────────────────────────────────────── */}
        <Tabs defaultValue="posts" className="space-y-4">
          <TabsList className={isAdmin ? "" : "w-auto"}>
            <TabsTrigger value="posts" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Posts
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground ml-0.5">
                {posts.length}
              </span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="users" className="gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Users
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground ml-0.5">
                  {users.length}
                </span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Posts tab */}
          <TabsContent value="posts" className="mt-0">
            <PostsTable
              initialPosts={posts}
              userRole={currentUser.role as UserRole}
            />
          </TabsContent>

          {/* Users tab (admin only) */}
          {isAdmin && (
            <TabsContent value="users" className="mt-0">
              <UsersTable initialUsers={users} />
            </TabsContent>
          )}
        </Tabs>

        {/* Member read-only notice */}
        {currentUser.role === UserRole.MEMBER && (
          <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
            <CardContent className="py-4 px-5">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Read-only access.</span>{" "}
                You can view posts but cannot create, edit, or delete them. Contact an admin to upgrade your role.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
