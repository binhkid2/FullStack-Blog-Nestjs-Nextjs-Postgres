"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { TagCloudItem } from "@/lib/types";

interface PostFilterFormProps {
  topCategories: TagCloudItem[];
  currentQ: string;
  currentCategory: string;
  currentSort: string;
  currentTags: string;
}

export function PostFilterForm({
  topCategories,
  currentQ,
  currentCategory,
  currentSort,
  currentTags,
}: PostFilterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val) {
          params.set(key, val);
        } else {
          params.delete(key);
        }
      }
      params.set("page", "1");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    updateParam({
      q: fd.get("q") as string,
      tags: fd.get("tags") as string,
    });
  };

  const clearFilters = () => {
    router.push("/");
  };

  const hasFilters = currentQ || currentCategory || currentTags || (currentSort && currentSort !== "newest");

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-card p-4 shadow-sm space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Search */}
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={currentQ}
            placeholder="Search posts…"
            className="pl-9"
          />
        </div>

        {/* Category */}
        <Select
          defaultValue={currentCategory || "all"}
          onValueChange={(val) =>
            updateParam({ category: val === "all" ? "" : val })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {topCategories.map((c) => (
              <SelectItem key={c.name} value={c.name}>
                {c.name} ({c.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          defaultValue={currentSort || "newest"}
          onValueChange={(val) => updateParam({ sort: val })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="most_viewed">Most viewed</SelectItem>
            <SelectItem value="featured">Featured first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input
            name="tags"
            defaultValue={currentTags}
            placeholder="Tags (comma separated): nextjs, typescript"
          />
        </div>
        <Button type="submit">Apply</Button>
        {hasFilters && (
          <Button type="button" variant="ghost" onClick={clearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
