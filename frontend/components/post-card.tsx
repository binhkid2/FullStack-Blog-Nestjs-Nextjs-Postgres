import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { BlogPost } from "@/lib/types";

interface PostCardProps {
  post: BlogPost;
}

export function PostCard({ post }: PostCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden hover:shadow-md transition-shadow h-full">
      {post.featuredImageUrl && (
        <Link href={`/blog/${post.slug}`} className="block overflow-hidden">
          <div className="relative h-48 w-full">
            <Image
              src={post.featuredImageUrl}
              alt={post.featuredImageAlt || post.title}
              fill
              className="object-cover transition-transform duration-300 hover:scale-[1.02]"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        </Link>
      )}

      <CardContent className="flex-1 pt-4 pb-2">
        {post.categories.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {post.categories.slice(0, 3).map((cat) => (
              <Badge
                key={cat}
                variant="secondary"
                className="text-xs uppercase tracking-wide"
              >
                {cat}
              </Badge>
            ))}
          </div>
        )}

        <Link href={`/blog/${post.slug}`} className="group">
          <h3 className="font-semibold leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>
        </Link>

        {post.excerpt && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
            {post.excerpt}
          </p>
        )}
      </CardContent>

      <CardFooter className="pt-0 pb-4 px-6 flex flex-wrap gap-1.5 items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {post.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              #{tag}
            </Badge>
          ))}
        </div>
        <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
          <Eye className="h-3 w-3" />
          {post.views.toLocaleString()}
        </span>
      </CardFooter>
    </Card>
  );
}
