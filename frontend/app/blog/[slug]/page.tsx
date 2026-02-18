import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { marked } from "marked";
import { apiFetch } from "@/lib/api";
import { BlogPost, PaginatedResult, TagCloudItem } from "@/lib/types";
import { ViewTracker } from "./view-tracker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye, TrendingUp, ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const { post } = await apiFetch<{ post: BlogPost }>(
      `/blog-posts/public/${slug}`
    );
    return {
      title: post.title,
      description: post.excerpt,
      openGraph: {
        title: post.title,
        description: post.excerpt,
        images: post.featuredImageUrl ? [post.featuredImageUrl] : [],
      },
    };
  } catch {
    return { title: "Post not found" };
  }
}

async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const data = await apiFetch<{ success: boolean; post: BlogPost }>(
      `/blog-posts/public/${slug}`
    );
    return data.post;
  } catch {
    return null;
  }
}

async function getRelatedPosts(post: BlogPost): Promise<BlogPost[]> {
  try {
    // Get posts with shared category
    const cat = post.categories[0];
    if (cat) {
      const result = await apiFetch<PaginatedResult<BlogPost>>(
        `/blog-posts/public?category=${encodeURIComponent(cat)}&pageSize=4`
      );
      const filtered = result.items.filter((p) => p.id !== post.id);
      if (filtered.length > 0) return filtered.slice(0, 4);
    }
    // Fallback: latest
    const result = await apiFetch<PaginatedResult<BlogPost>>(
      "/blog-posts/public?pageSize=4"
    );
    return result.items.filter((p) => p.id !== post.id).slice(0, 4);
  } catch {
    return [];
  }
}

async function getPopularPosts(excludeId: string): Promise<BlogPost[]> {
  try {
    const result = await apiFetch<PaginatedResult<BlogPost>>(
      "/blog-posts/public?sort=most_viewed&pageSize=6"
    );
    return result.items.filter((p) => p.id !== excludeId).slice(0, 5);
  } catch {
    return [];
  }
}

async function getTopTags(): Promise<TagCloudItem[]> {
  try {
    const result = await apiFetch<PaginatedResult<BlogPost>>(
      "/blog-posts/public?pageSize=100"
    );
    const counts: Record<string, number> = {};
    for (const post of result.items) {
      for (const tag of post.tags || []) {
        const t = tag.trim();
        if (t) counts[t] = (counts[t] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  } catch {
    return [];
  }
}

export default async function BlogDetailPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) return notFound();

  const [relatedPosts, popularPosts, topTags] = await Promise.all([
    getRelatedPosts(post),
    getPopularPosts(post.id),
    getTopTags(),
  ]);

  const contentHtml =
    post.contentFormat === "markdown"
      ? await marked(post.content)
      : post.content;

  const publishedDate = new Date(post.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <ViewTracker slug={slug} />

      {/* ── Back button ────────────────────────────────────────────────────── */}
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Blog
        </Link>
      </Button>

      {/* ── Article ────────────────────────────────────────────────────────── */}
      <article className="rounded-2xl border bg-card p-5 shadow-sm">
        {/* Categories */}
        {post.categories.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {post.categories.map((cat) => (
              <Badge key={cat} variant="secondary" className="uppercase tracking-wide text-xs">
                {cat}
              </Badge>
            ))}
          </div>
        )}

        <h1 className="text-3xl font-bold leading-tight">{post.title}</h1>

        {post.excerpt && (
          <p className="mt-3 text-lg text-muted-foreground">{post.excerpt}</p>
        )}

        {/* Meta */}
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" /> {publishedDate}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" /> {post.views.toLocaleString()} views
          </span>
          {post.author && (
            <span>by {post.author.name || post.author.email}</span>
          )}
        </div>

        {/* Featured image */}
        {post.featuredImageUrl && (
          <div className="mt-5 relative h-64 md:h-96 w-full overflow-hidden rounded-xl">
            <Image
              src={post.featuredImageUrl}
              alt={post.featuredImageAlt || post.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 800px"
              priority
            />
          </div>
        )}

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Link key={tag} href={`/?tags=${encodeURIComponent(tag)}`}>
                <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                  #{tag}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        <Separator className="my-6" />

        {/* Content */}
        <div
          className="prose prose-zinc dark:prose-invert max-w-none
            prose-headings:font-bold prose-headings:tracking-tight
            prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg
            prose-blockquote:border-l-4 prose-blockquote:border-muted-foreground/30
            prose-img:rounded-xl prose-img:border"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />
      </article>

      {/* ── Related + Sidebar ──────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* Related posts */}
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-4 text-xl font-bold">More from the blog</h2>
          {relatedPosts.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {relatedPosts.map((related) => (
                <article
                  key={related.id}
                  className="rounded-xl border bg-muted/30 p-4"
                >
                  {related.categories.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {related.categories.slice(0, 2).map((cat) => (
                        <Badge
                          key={cat}
                          variant="secondary"
                          className="text-xs uppercase"
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Link href={`/blog/${related.slug}`} className="group">
                    <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                      {related.title}
                    </h3>
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {related.excerpt}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {related.views.toLocaleString()}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No related posts yet.
            </p>
          )}
        </section>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Popular Posts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {popularPosts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <span className="line-clamp-1 mr-2">{p.title}</span>
                  <span className="text-muted-foreground shrink-0 flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {p.views.toLocaleString()}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {topTags.map((tag) => (
                  <Link
                    key={tag.name}
                    href={`/?tags=${encodeURIComponent(tag.name)}`}
                  >
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-muted transition-colors"
                    >
                      #{tag.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
