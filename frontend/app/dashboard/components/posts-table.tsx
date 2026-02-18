"use client";

import { useState, useCallback } from "react";
import { clientFetch } from "@/lib/api";
import { toast } from "sonner";
import { BlogPost, PostStatus, UserRole } from "@/lib/types";
import { PostSheet } from "./post-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Eye,
  Loader2,
  Pencil,
  Trash2,
  PlusCircle,
  ExternalLink,
  Star,
  Search,
} from "lucide-react";
import Link from "next/link";

interface Props {
  initialPosts: BlogPost[];
  userRole: UserRole;
}

const statusMeta: Record<PostStatus, { label: string; dot: string; row: string }> = {
  [PostStatus.PUBLISHED]: {
    label: "Published",
    dot: "bg-emerald-500",
    row: "border-l-emerald-400",
  },
  [PostStatus.DRAFT]: {
    label: "Draft",
    dot: "bg-zinc-400",
    row: "border-l-zinc-300",
  },
  [PostStatus.ARCHIVED]: {
    label: "Archived",
    dot: "bg-amber-400",
    row: "border-l-amber-400",
  },
};

export function PostsTable({ initialPosts, userRole }: Props) {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const refreshPosts = useCallback(async () => {
    try {
      const data = await clientFetch<{ posts: BlogPost[]; total: number }>(
        "/blog-posts?pageSize=50"
      );
      setPosts(data.posts);
    } catch {
      /* ignore */
    }
  }, []);

  const openCreate = () => {
    setEditingPost(null);
    setSheetOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditingPost(post);
    setSheetOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await clientFetch(`/blog-posts/${id}`, { method: "DELETE" });
      toast.success("Post deleted.");
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const canEdit = userRole === UserRole.ADMIN;
  const canCreate = userRole === UserRole.ADMIN || userRole === UserRole.MANAGER;

  const filtered = search.trim()
    ? posts.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.slug.toLowerCase().includes(search.toLowerCase())
      )
    : posts;

  return (
    <>
      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search posts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 w-56 text-sm"
          />
        </div>
        {canCreate && (
          <Button size="sm" onClick={openCreate} className="gap-1.5">
            <PlusCircle className="h-4 w-4" />
            New Post
          </Button>
        )}
      </div>

      {/* ── Posts list ────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          {search
            ? "No posts match your search."
            : "No posts yet. Create your first post!"}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden divide-y">
          {filtered.map((post) => {
            const meta = statusMeta[post.status];
            return (
              <div
                key={post.id}
                className={`flex items-start gap-3 px-4 py-3.5 border-l-4 bg-card hover:bg-muted/30 transition-colors ${meta.row}`}
              >
                {/* Thumbnail */}
                {post.featuredImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.featuredImageUrl}
                    alt={post.featuredImageAlt || ""}
                    className="h-12 w-20 rounded-md object-cover shrink-0 border hidden sm:block"
                  />
                ) : (
                  <div className="h-12 w-20 rounded-md bg-muted shrink-0 hidden sm:flex items-center justify-center">
                    <span className="text-xs text-muted-foreground/50">No img</span>
                  </div>
                )}

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {meta.label}
                    </span>
                    {post.isFeatured && (
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                    )}
                  </div>

                  <Link
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    className="font-semibold text-sm hover:text-primary transition-colors line-clamp-1"
                  >
                    {post.title}
                    <ExternalLink className="inline-block ml-1 h-2.5 w-2.5 opacity-50" />
                  </Link>

                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground font-mono">
                      /{post.slug}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3 w-3" /> {post.views.toLocaleString()}
                    </span>
                    {post.author && (
                      <span className="text-xs text-muted-foreground">
                        {post.author.name || post.author.email}
                      </span>
                    )}
                  </div>

                  {(post.categories.length > 0 || post.tags.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {post.categories.map((c) => (
                        <Badge
                          key={c}
                          variant="secondary"
                          className="text-xs h-4 px-1.5"
                        >
                          {c}
                        </Badge>
                      ))}
                      {post.tags.slice(0, 3).map((t) => (
                        <Badge
                          key={t}
                          variant="outline"
                          className="text-xs h-4 px-1.5"
                        >
                          #{t}
                        </Badge>
                      ))}
                      {post.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{post.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Date */}
                <span className="text-xs text-muted-foreground shrink-0 hidden md:block">
                  {new Date(post.updatedAt).toLocaleDateString()}
                </span>

                {/* Actions */}
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => openEdit(post)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete post?</AlertDialogTitle>
                          <AlertDialogDescription>
                            &quot;{post.title}&quot; will be permanently deleted.
                            This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(post.id)}
                            disabled={deletingId === post.id}
                          >
                            {deletingId === post.id && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Post create/edit sheet ─────────────────────────────────────────── */}
      <PostSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        post={editingPost}
        userRole={userRole}
        onSuccess={refreshPosts}
      />
    </>
  );
}
