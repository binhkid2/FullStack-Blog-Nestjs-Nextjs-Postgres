import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module';

describe('RBAC (e2e)', () => {
  let app: INestApplication;

  // We'll store cookies per user role
  let adminCookies: string[];
  let managerCookies: string[];
  let memberCookies: string[];

  const ts = Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Register three users, then promote via direct DB or use existing seed
    // For simplicity, register all as MEMBER — we test permission differences

    const adminEmail = `admin-rbac-${ts}@test.com`;
    const managerEmail = `manager-rbac-${ts}@test.com`;
    const memberEmail = `member-rbac-${ts}@test.com`;
    const pw = 'RbacTest123!';

    // Register all
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: adminEmail, password: pw });

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: managerEmail, password: pw });

    const memberReg = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: memberEmail, password: pw });

    // Store member cookies
    memberCookies = memberReg.headers['set-cookie'] as string[];

    // Login as the newly registered users
    const adminLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: adminEmail, password: pw });
    adminCookies = adminLogin.headers['set-cookie'] as string[];

    const managerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: managerEmail, password: pw });
    managerCookies = managerLogin.headers['set-cookie'] as string[];
  });

  afterAll(async () => {
    await app.close();
  });

  describe('MEMBER permissions', () => {
    it('should NOT be able to create a blog post', async () => {
      await request(app.getHttpServer())
        .post('/blog-posts')
        .set('Cookie', memberCookies)
        .send({ title: 'Member Post', content: 'Content' })
        .expect(403);
    });

    it('should NOT be able to list users', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Cookie', memberCookies)
        .expect(403);
    });

    it('should be able to view dashboard', async () => {
      await request(app.getHttpServer())
        .get('/dashboard')
        .set('Cookie', memberCookies)
        .expect(200);
    });
  });

  describe('Unauthenticated access', () => {
    it('should allow access to public posts', async () => {
      await request(app.getHttpServer())
        .get('/blog-posts/public')
        .expect(200);
    });

    it('should deny access to dashboard', async () => {
      await request(app.getHttpServer())
        .get('/dashboard')
        .expect(401);
    });

    it('should deny access to users list', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .expect(401);
    });
  });

  describe('Public endpoints', () => {
    it('GET /health should be publicly accessible', async () => {
      const res = await request(app.getHttpServer())
        .get('/health')
        .expect(200);
      expect(res.body.status).toBe('ok');
    });

    it('GET / should be publicly accessible', async () => {
      await request(app.getHttpServer())
        .get('/')
        .expect(200);
    });
  });
});
