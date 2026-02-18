"use client";

import { useState, useCallback } from "react";
import { clientFetch } from "@/lib/api";
import { toast } from "sonner";
import { BlogPost, PostStatus, ContentFormat, UserRole } from "@/lib/types";
import { CreatePostForm } from "./create-post-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Eye, Loader2, Pencil, Trash2, X, Check, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Props {
  initialPosts: BlogPost[];
  userRole: UserRole;
}

export function PostsTable({ initialPosts, userRole }: Props) {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await clientFetch(`/blog-posts/${id}`, { method: "DELETE" });
      toast.success("Post deleted.");
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (
    e: React.FormEvent<HTMLFormElement>,
    id: string
  ) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = {
      title: fd.get("title"),
      slug: fd.get("slug") || undefined,
      excerpt: fd.get("excerpt") || undefined,
      content: fd.get("content"),
      contentFormat: fd.get("contentFormat"),
      status: fd.get("status"),
      isFeatured: fd.get("isFeatured") === "true",
      categories: fd.get("categories") || undefined,
      tags: fd.get("tags") || undefined,
      featuredImageUrl: fd.get("featuredImageUrl") || undefined,
      featuredImageAlt: fd.get("featuredImageAlt") || undefined,
    };
    setLoading(true);
    try {
      await clientFetch(`/blog-posts/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      toast.success("Post updated!");
      setEditingId(null);
      await refreshPosts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const statusColor: Record<PostStatus, string> = {
    [PostStatus.PUBLISHED]: "bg-emerald-100 text-emerald-800 border-emerald-200",
    [PostStatus.DRAFT]: "bg-zinc-100 text-zinc-700 border-zinc-200",
    [PostStatus.ARCHIVED]: "bg-amber-100 text-amber-800 border-amber-200",
  };

  return (
    <div className="space-y-4">
      {/* Create form for ADMIN/MANAGER */}
      {(userRole === UserRole.ADMIN || userRole === UserRole.MANAGER) && (
        <CreatePostForm userRole={userRole} onCreated={refreshPosts} />
      )}

      {/* Posts list */}
      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No posts yet.
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="rounded-xl border bg-card p-4 shadow-sm"
            >
              {editingId === post.id && userRole === UserRole.ADMIN ? (
                /* ── Edit form ─────────────────────────────────────────── */
                <form
                  onSubmit={(e) => handleUpdate(e, post.id)}
                  className="space-y-3"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">Editing post</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input name="title" defaultValue={post.title} required placeholder="Title" />
                    <Input name="slug" defaultValue={post.slug} placeholder="Slug" />
                  </div>
                  <Textarea name="excerpt" defaultValue={post.excerpt} placeholder="Excerpt" rows={2} />
                  <Textarea name="content" defaultValue={post.content} placeholder="Content" rows={6} required />

                  <div className="grid gap-2 sm:grid-cols-3">
                    <Select name="contentFormat" defaultValue={post.contentFormat}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ContentFormat.MARKDOWN}>Markdown</SelectItem>
                        <SelectItem value={ContentFormat.HTML}>HTML</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select name="status" defaultValue={post.status}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PostStatus.DRAFT}>Draft</SelectItem>
                        <SelectItem value={PostStatus.PUBLISHED}>Published</SelectItem>
                        <SelectItem value={PostStatus.ARCHIVED}>Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select name="isFeatured" defaultValue={String(post.isFeatured)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">Not featured</SelectItem>
                        <SelectItem value="true">Featured</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input name="categories" defaultValue={post.categories.join(",")} placeholder="Categories" />
                    <Input name="tags" defaultValue={post.tags.join(",")} placeholder="Tags" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input name="featuredImageUrl" defaultValue={post.featuredImageUrl || ""} placeholder="Image URL" />
                    <Input name="featuredImageAlt" defaultValue={post.featuredImageAlt || ""} placeholder="Image Alt" />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Check className="mr-1 h-4 w-4" /> Save
                    </Button>
                  </div>
                </form>
              ) : (
                /* ── Post card view ─────────────────────────────────────── */
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="font-semibold hover:text-primary transition-colors"
                        target="_blank"
                      >
                        {post.title}
                        <ExternalLink className="inline-block ml-1 h-3 w-3" />
                      </Link>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      /{post.slug}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusColor[post.status]}`}>
                        {post.status}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" /> {post.views.toLocaleString()}
                      </span>
                      {post.isFeatured && (
                        <Badge variant="secondary" className="text-xs">⭐ featured</Badge>
                      )}
                      {post.author && (
                        <span className="text-xs text-muted-foreground">
                          by {post.author.name || post.author.email}
                        </span>
                      )}
                    </div>
                    {post.excerpt && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {post.categories.map((c) => (
                        <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                      {post.tags.map((t) => (
                        <Badge key={t} variant="outline" className="text-xs">#{t}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    {userRole === UserRole.ADMIN && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(post.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete post?</AlertDialogTitle>
                              <AlertDialogDescription>
                                &quot;{post.title}&quot; will be permanently deleted.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleDelete(post.id)}
                                disabled={loading}
                              >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
