import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum ContentFormat {
  MARKDOWN = 'markdown',
  HTML = 'html',
}

@Entity('blog_posts')
export class BlogPost {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ length: 300, nullable: true, unique: true })
  slug: string;

  @Column({ type: 'varchar', length: 20, default: PostStatus.DRAFT })
  status: PostStatus;

  @Column({ type: 'text', default: '' })
  excerpt: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'content_format', type: 'varchar', length: 20, default: ContentFormat.MARKDOWN })
  contentFormat: ContentFormat;

  @Column({ name: 'author_id' })
  authorId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'featured_image_url', length: 500, nullable: true })
  featuredImageUrl: string;

  @Column({ name: 'featured_image_alt', length: 255, nullable: true })
  featuredImageAlt: string;

  @Column({ name: 'is_featured', default: false })
  isFeatured: boolean;

  @Column({ default: 0 })
  views: number;

  @Column({ type: 'simple-array', default: '' })
  tags: string[];

  @Column({ type: 'simple-array', default: '' })
  categories: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  /** Virtual getter — templates use `post.featuredImage.url` and `post.featuredImage.alt` */
  get featuredImage(): { url: string; alt: string } | null {
    if (!this.featuredImageUrl) return null;
    return { url: this.featuredImageUrl, alt: this.featuredImageAlt || '' };
  }
}
