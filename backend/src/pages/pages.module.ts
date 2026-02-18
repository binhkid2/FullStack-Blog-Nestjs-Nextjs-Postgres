import { Module } from '@nestjs/common';
import { BlogPostsModule } from '../blog-posts/blog-posts.module';
import { UsersModule } from '../users/users.module';
import { PagesController } from './pages.controller';

@Module({
  imports: [BlogPostsModule, UsersModule],
  controllers: [PagesController],
})
export class PagesModule {}
