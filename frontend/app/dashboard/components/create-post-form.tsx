"use client";

import { useState } from "react";
import { clientFetch } from "@/lib/api";
import { toast } from "sonner";
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
import { Loader2, PlusCircle } from "lucide-react";
import { PostStatus, ContentFormat, UserRole } from "@/lib/types";

interface Props {
  userRole: UserRole;
  onCreated: () => void;
}

export function CreatePostForm({ userRole, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<PostStatus>(PostStatus.DRAFT);
  const [contentFormat, setContentFormat] = useState<ContentFormat>(
    ContentFormat.MARKDOWN
  );
  const [isFeatured, setIsFeatured] = useState("false");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      title: fd.get("title"),
      slug: fd.get("slug") || undefined,
      excerpt: fd.get("excerpt") || undefined,
      content: fd.get("content"),
      contentFormat,
      status: userRole === UserRole.ADMIN ? status : PostStatus.DRAFT,
      isFeatured: isFeatured === "true",
      categories: fd.get("categories") || undefined,
      tags: fd.get("tags") || undefined,
      featuredImageUrl: fd.get("featuredImageUrl") || undefined,
      featuredImageAlt: fd.get("featuredImageAlt") || undefined,
    };

    setLoading(true);
    try {
      await clientFetch("/blog-posts", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast.success("Post created!");
      (e.target as HTMLFormElement).reset();
      onCreated();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border bg-muted/30 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <PlusCircle className="h-4 w-4" /> Create New Post
        </h3>
        {userRole !== UserRole.ADMIN && (
          <span className="text-xs text-muted-foreground border rounded-full px-2 py-0.5">
            Status forced to Draft (Manager)
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="cp-title">Title *</Label>
          <Input id="cp-title" name="title" placeholder="Post title" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cp-slug">Slug (optional)</Label>
          <Input id="cp-slug" name="slug" placeholder="custom-slug" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="cp-excerpt">Excerpt</Label>
        <Textarea
          id="cp-excerpt"
          name="excerpt"
          placeholder="Short description…"
          rows={2}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="cp-content">Content *</Label>
        <Textarea
          id="cp-content"
          name="content"
          placeholder="Write your post content…"
          rows={8}
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <Label>Format</Label>
          <Select
            value={contentFormat}
            onValueChange={(v) => setContentFormat(v as ContentFormat)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ContentFormat.MARKDOWN}>Markdown</SelectItem>
              <SelectItem value={ContentFormat.HTML}>HTML</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {userRole === UserRole.ADMIN && (
          <>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as PostStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PostStatus.DRAFT}>Draft</SelectItem>
                  <SelectItem value={PostStatus.PUBLISHED}>Published</SelectItem>
                  <SelectItem value={PostStatus.ARCHIVED}>Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Featured</Label>
              <Select value={isFeatured} onValueChange={setIsFeatured}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Not featured</SelectItem>
                  <SelectItem value="true">Featured</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="cp-categories">Categories (comma separated)</Label>
          <Input
            id="cp-categories"
            name="categories"
            placeholder="backend,api"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cp-tags">Tags (comma separated)</Label>
          <Input id="cp-tags" name="tags" placeholder="rest,pagination" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="cp-imgurl">Featured Image URL</Label>
          <Input
            id="cp-imgurl"
            name="featuredImageUrl"
            placeholder="https://…"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cp-imgalt">Image Alt Text</Label>
          <Input id="cp-imgalt" name="featuredImageAlt" placeholder="Alt text" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Post
        </Button>
      </div>
    </form>
  );
}
