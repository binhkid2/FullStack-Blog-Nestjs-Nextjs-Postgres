"use client";

import { useEffect, useState } from "react";
import { clientFetch } from "@/lib/api";
import { toast } from "sonner";
import { BlogPost, PostStatus, ContentFormat, UserRole } from "@/lib/types";
import { TiptapEditor } from "@/components/dashboard/tiptap-editor";
import { ImageUploader } from "@/components/dashboard/image-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Loader2, FileText, Settings2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** If provided, the sheet is in edit mode. Otherwise, create mode. */
  post?: BlogPost | null;
  userRole: UserRole;
  onSuccess: () => void;
}

const defaultStatus = (role: UserRole): PostStatus =>
  role === UserRole.ADMIN ? PostStatus.PUBLISHED : PostStatus.DRAFT;

export function PostSheet({ open, onOpenChange, post, userRole, onSuccess }: Props) {
  const isEdit = !!post;

  /* ── form state ─────────────────────────────────────────────────────────── */
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [contentFormat, setContentFormat] = useState<ContentFormat>(ContentFormat.HTML);
  const [status, setStatus] = useState<PostStatus>(defaultStatus(userRole));
  const [isFeatured, setIsFeatured] = useState(false);
  const [categories, setCategories] = useState("");
  const [tags, setTags] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [loading, setLoading] = useState(false);

  /* ── populate when sheet opens ──────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    if (post) {
      setTitle(post.title);
      setSlug(post.slug);
      setExcerpt(post.excerpt ?? "");
      setContent(post.content ?? "");
      setContentFormat(post.contentFormat);
      setStatus(post.status);
      setIsFeatured(post.isFeatured);
      setCategories(post.categories.join(","));
      setTags(post.tags.join(","));
      setImageUrl(post.featuredImageUrl ?? "");
      setImageAlt(post.featuredImageAlt ?? "");
    } else {
      setTitle("");
      setSlug("");
      setExcerpt("");
      setContent("");
      setContentFormat(ContentFormat.HTML);
      setStatus(defaultStatus(userRole));
      setIsFeatured(false);
      setCategories("");
      setTags("");
      setImageUrl("");
      setImageAlt("");
    }
  }, [open, post, userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content || content === "<p></p>") {
      toast.error("Content cannot be empty.");
      return;
    }

    const body = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      excerpt: excerpt.trim() || undefined,
      content,
      contentFormat,
      status: userRole !== UserRole.ADMIN ? PostStatus.DRAFT : status,
      isFeatured,
      categories: categories.trim() || undefined,
      tags: tags.trim() || undefined,
      featuredImageUrl: imageUrl || undefined,
      featuredImageAlt: imageAlt || undefined,
    };

    setLoading(true);
    try {
      if (isEdit && post) {
        await clientFetch(`/blog-posts/${post.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast.success("Post updated!");
      } else {
        await clientFetch("/blog-posts", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success("Post created!");
      }
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const statusColor: Record<PostStatus, string> = {
    [PostStatus.PUBLISHED]: "text-emerald-600",
    [PostStatus.DRAFT]: "text-zinc-500",
    [PostStatus.ARCHIVED]: "text-amber-600",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* Wide sheet — takes 60% of screen on large displays */}
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl lg:max-w-3xl flex flex-col p-0 gap-0"
      >
        {/* ── Sheet header ──────────────────────────────────────────────────── */}
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            {isEdit ? "Edit Post" : "New Post"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? `Editing "${post?.title}"`
              : "Fill in the details below and hit Publish (or save as Draft)."}
          </SheetDescription>
        </SheetHeader>

        {/* ── Scrollable form body ──────────────────────────────────────────── */}
        <form
          id="post-sheet-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto"
        >
          <div className="px-6 py-5 space-y-5">

            {/* Title + Slug */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="ps-title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ps-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="My awesome post"
                  required
                  className="text-base font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ps-slug" className="text-muted-foreground text-xs">
                  Slug <span className="text-muted-foreground/60">(auto-generated if empty)</span>
                </Label>
                <Input
                  id="ps-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-awesome-post"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <Separator />

            {/* Content editor */}
            <div className="space-y-1.5">
              <Label>
                Content <span className="text-destructive">*</span>
              </Label>
              <TiptapEditor
                value={content}
                onChange={setContent}
                placeholder="Write your post content here…"
                minHeight="340px"
              />
            </div>

            {/* Excerpt */}
            <div className="space-y-1.5">
              <Label htmlFor="ps-excerpt">Excerpt</Label>
              <Textarea
                id="ps-excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="A short description shown in post listings…"
                rows={2}
                className="resize-none"
              />
            </div>

            <Separator />

            {/* Settings row */}
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Settings2 className="h-3.5 w-3.5" />
                Post settings
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Status — admin only */}
                {userRole === UserRole.ADMIN ? (
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select
                      value={status}
                      onValueChange={(v) => setStatus(v as PostStatus)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PostStatus.DRAFT}>
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-zinc-400" />
                            Draft
                          </span>
                        </SelectItem>
                        <SelectItem value={PostStatus.PUBLISHED}>
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Published
                          </span>
                        </SelectItem>
                        <SelectItem value={PostStatus.ARCHIVED}>
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Archived
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="flex h-9 items-center text-sm text-muted-foreground border rounded-md px-3">
                      Saved as Draft (Manager)
                    </div>
                  </div>
                )}

                {/* Format */}
                <div className="space-y-1.5">
                  <Label>Content format</Label>
                  <Select
                    value={contentFormat}
                    onValueChange={(v) => setContentFormat(v as ContentFormat)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ContentFormat.HTML}>HTML (Tiptap)</SelectItem>
                      <SelectItem value={ContentFormat.MARKDOWN}>Markdown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Categories + Tags */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ps-cats">Categories</Label>
                  <Input
                    id="ps-cats"
                    value={categories}
                    onChange={(e) => setCategories(e.target.value)}
                    placeholder="tech, tutorials"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ps-tags">Tags</Label>
                  <Input
                    id="ps-tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="nextjs, react"
                  />
                </div>
              </div>

              {/* Featured toggle */}
              {userRole === UserRole.ADMIN && (
                <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Featured post</p>
                    <p className="text-xs text-muted-foreground">
                      Shown in the hero/featured section on the home page
                    </p>
                  </div>
                  <Switch
                    checked={isFeatured}
                    onCheckedChange={setIsFeatured}
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* Featured image */}
            <ImageUploader
              value={imageUrl}
              onChange={setImageUrl}
              altValue={imageAlt}
              onAltChange={setImageAlt}
              label="Featured Image"
            />
          </div>
        </form>

        {/* ── Sticky footer ────────────────────────────────────────────────── */}
        <div className="border-t px-6 py-4 flex items-center justify-between gap-3 bg-background shrink-0">
          {isEdit && (
            <span className={`text-xs font-medium capitalize ${statusColor[status]}`}>
              ● {status}
            </span>
          )}
          <div className="flex gap-2 ml-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" form="post-sheet-form" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Save changes" : status === PostStatus.PUBLISHED ? "Publish" : "Save Draft"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
