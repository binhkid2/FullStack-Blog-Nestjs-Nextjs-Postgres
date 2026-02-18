import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { BlogPost, PaginatedResult, TagCloudItem } from "@/lib/types";
import { PostCard } from "@/components/post-card";
import { Pagination } from "@/components/pagination";
import { PostFilterForm } from "@/components/post-filter-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, Star, TrendingUp } from "lucide-react";

interface HomeSearchParams {
  q?: string;
  tags?: string;
  category?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
}

async function getFeatured(): Promise<BlogPost[]> {
  try {
    return await apiFetch<BlogPost[]>("/blog-posts/public/featured");
  } catch {
    return [];
  }
}

async function getPosts(
  params: HomeSearchParams
): Promise<PaginatedResult<BlogPost>> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.tags) qs.set("tags", params.tags);
  if (params.category) qs.set("category", params.category);
  if (params.sort) qs.set("sort", params.sort);
  qs.set("page", params.page || "1");
  qs.set("pageSize", params.pageSize || "9");
  try {
    return await apiFetch<PaginatedResult<BlogPost>>(
      `/blog-posts/public?${qs.toString()}`
    );
  } catch {
    return { items: [], total: 0, page: 1, pageSize: 9, totalPages: 0 };
  }
}

async function getAllPostsForCloud(): Promise<BlogPost[]> {
  try {
    const result = await apiFetch<PaginatedResult<BlogPost>>(
      "/blog-posts/public?pageSize=100"
    );
    return result.items;
  } catch {
    return [];
  }
}

function buildTagCloud(posts: BlogPost[]): TagCloudItem[] {
  const counts: Record<string, number> = {};
  for (const post of posts) {
    for (const tag of post.tags || []) {
      const t = tag.trim();
      if (t) counts[t] = (counts[t] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

function buildCategoryCloud(posts: BlogPost[]): TagCloudItem[] {
  const counts: Record<string, number> = {};
  for (const post of posts) {
    for (const cat of post.categories || []) {
      const c = cat.trim();
      if (c) counts[c] = (counts[c] || 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<HomeSearchParams>;
}) {
  const params = await searchParams;

  const [featured, postsResult, allPosts, popularResult] = await Promise.all([
    getFeatured(),
    getPosts(params),
    getAllPostsForCloud(),
    apiFetch<PaginatedResult<BlogPost>>(
      "/blog-posts/public?sort=most_viewed&pageSize=5"
    ).catch(() => ({ items: [] as BlogPost[] })),
  ]);

  const topTags = buildTagCloud(allPosts);
  const topCategories = buildCategoryCloud(allPosts);
  const popularPosts = (popularResult as PaginatedResult<BlogPost>).items || [];
  const { items: posts, page, totalPages, total } = postsResult;

  return (
    <div className="space-y-6">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl border bg-gradient-to-r from-background via-muted/30 to-background p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight">
              Practical Engineering Stories
            </h1>
            <p className="mt-2 text-muted-foreground">
              Fast backend patterns, frontend craft, and product lessons from
              shipping real systems.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {topCategories.slice(0, 6).map((c) => (
              <Link
                key={c.name}
                href={`/?category=${encodeURIComponent(c.name)}`}
              >
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                >
                  {c.name} ({c.count})
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured posts ─────────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="rounded-2xl border bg-gradient-to-r from-background via-sky-50 to-emerald-50 dark:via-sky-950/20 dark:to-emerald-950/20 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <h2 className="font-semibold text-lg">Featured</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
            {/* Primary featured */}
            <article className="rounded-xl border bg-background/80 p-5">
              <Badge className="mb-3 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-200">
                Featured pick
              </Badge>
              {featured[0].featuredImageUrl && (
                <Link href={`/blog/${featured[0].slug}`} className="block mb-4">
                  <div className="relative h-52 w-full overflow-hidden rounded-lg">
                    <Image
                      src={featured[0].featuredImageUrl}
                      alt={featured[0].featuredImageAlt || featured[0].title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 60vw"
                      priority
                    />
                  </div>
                </Link>
              )}
              <Link href={`/blog/${featured[0].slug}`} className="group">
                <h2 className="text-2xl font-bold leading-tight group-hover:text-primary transition-colors">
                  {featured[0].title}
                </h2>
              </Link>
              <p className="mt-2 text-muted-foreground">
                {featured[0].excerpt}
              </p>
              <p className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {featured[0].views.toLocaleString()} views
              </p>
            </article>

            {/* Secondary featured */}
            <div className="grid gap-3">
              {featured.slice(1).map((post) => (
                <article
                  key={post.id}
                  className="rounded-xl border bg-background/80 p-4 flex gap-3"
                >
                  {post.featuredImageUrl && (
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={post.featuredImageUrl}
                        alt={post.featuredImageAlt || post.title}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <Link href={`/blog/${post.slug}`} className="group">
                      <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                    </Link>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {post.excerpt}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Main content + sidebar ─────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {/* Filter form */}
          <Suspense fallback={null}>
            <PostFilterForm
              topCategories={topCategories}
              currentQ={params.q || ""}
              currentCategory={params.category || ""}
              currentSort={params.sort || "newest"}
              currentTags={params.tags || ""}
            />
          </Suspense>

          {/* Post grid */}
          {posts.length === 0 ? (
            <div className="rounded-xl border bg-muted/30 p-8 text-center">
              <p className="text-muted-foreground">
                No posts found for this filter.
              </p>
              <Button asChild variant="link" className="mt-2">
                <Link href="/">Clear filters</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}

          {/* Pagination */}
          <Suspense fallback={null}>
            <Pagination page={page} totalPages={totalPages} total={total} />
          </Suspense>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Popular Posts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Popular Posts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {popularPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <span className="line-clamp-1 mr-2">{post.title}</span>
                  <span className="text-muted-foreground shrink-0 flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {post.views.toLocaleString()}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Newsletter */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Newsletter</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                One practical note every Friday.
              </p>
              <div className="flex flex-col gap-2">
                <Input type="email" placeholder="you@example.com" />
                <Button className="w-full">Join</Button>
              </div>
            </CardContent>
          </Card>

          {/* Tag Cloud */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tag Cloud</CardTitle>
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
                      #{tag.name} ({tag.count})
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <Separator />
          <p className="text-xs text-center text-muted-foreground">
            Built with NestJS + Next.js 16 + shadcn/ui
          </p>
        </aside>
      </div>
    </div>
  );
}
