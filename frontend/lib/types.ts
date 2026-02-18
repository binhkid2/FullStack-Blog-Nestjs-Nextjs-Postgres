export enum PostStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}

export enum ContentFormat {
  MARKDOWN = "markdown",
  HTML = "html",
}

export enum UserRole {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  MEMBER = "MEMBER",
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface FeaturedImage {
  url: string;
  alt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: PostStatus;
  excerpt: string;
  content: string;
  contentFormat: ContentFormat;
  authorId: string;
  author?: Pick<User, "id" | "email" | "name" | "role">;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  isFeatured: boolean;
  views: number;
  tags: string[];
  categories: string[];
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TagCloudItem {
  name: string;
  count: number;
}

export interface CreatePostDto {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  contentFormat?: ContentFormat;
  status?: PostStatus;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  isFeatured?: boolean;
  tags?: string; // comma-separated string
  categories?: string; // comma-separated string
}

export interface CurrentUser {
  sub: string;
  email: string;
  role: UserRole;
  name?: string;
  iat?: number;
  exp?: number;
}
