import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cookieParser = require('cookie-parser');
import * as nunjucks from 'nunjucks';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ─── CORS — allow Next.js frontend ──────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
  });

  // ─── Static assets ──────────────────────────────────────────────────────────
  app.useStaticAssets(join(process.cwd(), 'public'));

  // ─── Nunjucks view engine ────────────────────────────────────────────────────
  // process.cwd() is always the project root, regardless of __dirname in dist/
  const viewsDir = join(process.cwd(), 'src', 'views');
  app.setBaseViewsDir(viewsDir);
  app.setViewEngine('njk');

  const nunjucksEnv = nunjucks.configure(viewsDir, {
    autoescape: true,
    throwOnUndefined: false,
    watch: process.env.NODE_ENV === 'development',
    express: app.getHttpAdapter().getInstance(),
  });

  nunjucksEnv.addFilter('urlencode', (s: string) => encodeURIComponent(s ?? ''));
  nunjucksEnv.addFilter('truncate', (s: string, len: number) => {
    if (!s) return '';
    return s.length > len ? s.substring(0, len) + '...' : s;
  });
  nunjucksEnv.addFilter('date', (d: Date | string, fmt?: string) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });
  nunjucksEnv.addGlobal('appName', 'Duc Binh Blog');
  nunjucksEnv.addGlobal('year', new Date().getFullYear());

  // ─── Middleware ──────────────────────────────────────────────────────────────
  app.use(cookieParser());

  // ─── Global pipes ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // ─── Start ───────────────────────────────────────────────────────────────────
  const port = process.env.PORT || 3000;
  const host = process.env.HOST || '0.0.0.0';
  await app.listen(port, host);
  console.log(`🚀 Server running at http://${host}:${port}`);
}

bootstrap();
