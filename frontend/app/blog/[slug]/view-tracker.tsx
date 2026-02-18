"use client";

import { useEffect } from "react";
import { clientFetch } from "@/lib/api";

export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    clientFetch(`/blog-posts/public/${slug}/view`, { method: "POST" }).catch(
      () => {}
    );
  }, [slug]);
  return null;
}
