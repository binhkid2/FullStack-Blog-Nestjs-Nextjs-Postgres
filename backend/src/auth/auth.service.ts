import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../users/entities/user.entity';
import { RefreshToken } from '../tokens/entities/refresh-token.entity';
import { MagicLinkToken } from '../tokens/entities/magic-link-token.entity';
import { PasswordResetToken } from '../tokens/entities/password-reset-token.entity';
import { OAuthAccount } from '../tokens/entities/oauth-account.entity';
import {
  generateRawToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../common/helpers/jwt.helper';
import { sendMail } from '../common/helpers/mailer.helper';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(MagicLinkToken)
    private readonly magicLinkRepo: Repository<MagicLinkToken>,
    @InjectRepository(PasswordResetToken)
    private readonly pwdResetRepo: Repository<PasswordResetToken>,
    @InjectRepository(OAuthAccount)
    private readonly oauthRepo: Repository<OAuthAccount>,
    private readonly configService: ConfigService,
  ) {}

  // ─── Token helpers ───────────────────────────────────────────────────────────

  private issueTokens(user: User) {
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const accessExpiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const accessToken = signAccessToken(
      { sub: user.id, email: user.email, role: user.role },
      accessSecret,
      accessExpiresIn,
    );
    const rawRefresh = generateRawToken();
    const refreshToken = signRefreshToken({ sub: user.id }, refreshSecret, refreshExpiresIn);

    return { accessToken, rawRefresh, refreshToken };
  }

  private cookieOptions(res: any, accessToken: string, refreshToken: string) {
    const secure = this.configService.get<string>('COOKIE_SECURE') === 'true';
    const domain = this.configService.get<string>('COOKIE_DOMAIN') || undefined;
    const opts = { httpOnly: true, sameSite: 'lax' as const, secure, domain };
    res.cookie('accessToken', accessToken, { ...opts, maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { ...opts, maxAge: 7 * 24 * 60 * 60 * 1000 });
  }

  private clearCookies(res: any) {
    const secure = this.configService.get<string>('COOKIE_SECURE') === 'true';
    const domain = this.configService.get<string>('COOKIE_DOMAIN') || undefined;
    const opts = { httpOnly: true, sameSite: 'lax' as const, secure, domain };
    res.clearCookie('accessToken', opts);
    res.clearCookie('refreshToken', opts);
  }

  private safeUser(user: User) {
    const { passwordHash, ...safe } = user as any;
    return safe;
  }

  private get frontendUrl(): string {
    return this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  // ─── Register ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto, req: any, res: any) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      id: uuidv4(),
      email: dto.email,
      name: dto.name,
      role: UserRole.MEMBER,
      passwordHash,
    });
    await this.userRepo.save(user);

    const { accessToken, rawRefresh, refreshToken } = this.issueTokens(user);
    await this.storeRefreshToken(user.id, rawRefresh, req);
    this.cookieOptions(res, accessToken, refreshToken);

    return res.json({ success: true, accessToken, refreshToken, user: this.safeUser(user) });
  }

  // ─── Login ────────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, req: any, res: any) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid email or password');
    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

    const { accessToken, rawRefresh, refreshToken } = this.issueTokens(user);
    await this.storeRefreshToken(user.id, rawRefresh, req);
    this.cookieOptions(res, accessToken, refreshToken);

    return res.json({ success: true, accessToken, refreshToken, user: this.safeUser(user) });
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────────

  async refresh(req: any, res: any) {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!rawToken) throw new UnauthorizedException('No refresh token provided');

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    let payload: any;
    try {
      payload = verifyRefreshToken(rawToken, refreshSecret);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = hashToken(rawToken);
    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token invalid or revoked');
    }

    const user = stored.user;

    // Rotate: revoke old, issue new
    const newRaw = generateRawToken();
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const newRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const newRefreshToken = signRefreshToken({ sub: user.id }, newRefreshSecret, refreshExpiresIn);
    const newHash = hashToken(newRaw);

    stored.revokedAt = new Date();
    stored.replacedByTokenHash = newHash;
    await this.refreshTokenRepo.save(stored);

    await this.storeRefreshToken(user.id, newRaw, req);

    const { accessToken } = this.issueTokens(user);
    this.cookieOptions(res, accessToken, newRefreshToken);

    return res.json({ success: true, accessToken, refreshToken: newRefreshToken });
  }

  // ─── Logout ───────────────────────────────────────────────────────────────────

  async logout(req: any, res: any) {
    const rawToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await this.refreshTokenRepo.update({ tokenHash }, { revokedAt: new Date() });
    }
    this.clearCookies(res);
    return res.json({ success: true });
  }

  // ─── Magic Link ───────────────────────────────────────────────────────────────

  async requestMagicLink(email: string, req: any, res: any) {
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3001';
    const ttl = this.configService.get<number>('MAGIC_LINK_TTL_MINUTES') || 20;

    const user = await this.userRepo.findOne({ where: { email } });
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

    await this.magicLinkRepo.save(
      this.magicLinkRepo.create({
        id: uuidv4(),
        userId: user?.id || null,
        email,
        tokenHash,
        expiresAt,
      }),
    );

    // Link points to backend verify endpoint which then redirects to frontend
    const link = `${appUrl}/auth/magic-link/verify?token=${rawToken}`;

    await sendMail({
      to: email,
      subject: 'Your Magic Link',
      html: `<p>Click <a href="${link}">here</a> to sign in. Link expires in ${ttl} minutes.</p><p>${link}</p>`,
    });

    return res.json({ success: true, message: 'Magic link sent' });
  }

  async verifyMagicLink(rawToken: string, req: any, res: any) {
    const tokenHash = hashToken(rawToken);
    const record = await this.magicLinkRepo.findOne({ where: { tokenHash } });

    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired magic link');
    }

    record.consumedAt = new Date();
    await this.magicLinkRepo.save(record);

    let user = await this.userRepo.findOne({ where: { email: record.email } });
    if (!user) {
      user = this.userRepo.create({
        id: uuidv4(),
        email: record.email,
        role: UserRole.MEMBER,
        isActive: true,
      });
      await this.userRepo.save(user);
    }

    const { accessToken, rawRefresh, refreshToken } = this.issueTokens(user);
    await this.storeRefreshToken(user.id, rawRefresh, req);
    this.cookieOptions(res, accessToken, refreshToken);

    // Redirect to Next.js frontend dashboard
    return res.redirect(`${this.frontendUrl}/dashboard`);
  }

  // ─── Password Reset ───────────────────────────────────────────────────────────

  async requestPasswordReset(email: string, req: any, res: any) {
    const frontendUrl = this.frontendUrl;
    const ttl = this.configService.get<number>('PASSWORD_RESET_TTL_MINUTES') || 30;

    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      // Return success to avoid enumeration
      return res.json({ success: true });
    }

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + ttl * 60 * 1000);

    await this.pwdResetRepo.save(
      this.pwdResetRepo.create({ id: uuidv4(), userId: user.id, tokenHash, expiresAt }),
    );

    // Link points to Next.js frontend auth page with reset token
    const link = `${frontendUrl}/auth?tab=reset&token=${rawToken}`;
    await sendMail({
      to: email,
      subject: 'Password Reset',
      html: `<p>Click <a href="${link}">here</a> to reset your password. Expires in ${ttl} minutes.</p>`,
    });

    return res.json({ success: true });
  }

  async confirmPasswordReset(dto: PasswordResetConfirmDto, req: any, res: any) {
    const tokenHash = hashToken(dto.token);
    const record = await this.pwdResetRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!record || record.consumedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.userRepo.update(record.userId, { passwordHash });

    record.consumedAt = new Date();
    await this.pwdResetRepo.save(record);

    return res.json({ success: true });
  }

  // ─── Google OAuth ──────────────────────────────────────────────────────────────

  async handleGoogleCallback(googleUser: any, req: any, res: any) {
    const { providerId, email, name } = googleUser;

    let oauthAccount = await this.oauthRepo.findOne({
      where: { provider: 'google', providerId },
      relations: ['user'],
    });

    let user: User;
    if (oauthAccount) {
      user = oauthAccount.user;
    } else {
      user = await this.userRepo.findOne({ where: { email } });
      if (!user) {
        user = this.userRepo.create({
          id: uuidv4(),
          email,
          name,
          role: UserRole.MEMBER,
          isActive: true,
        });
        await this.userRepo.save(user);
      }
      oauthAccount = this.oauthRepo.create({
        id: uuidv4(),
        userId: user.id,
        provider: 'google',
        providerId,
        email,
      });
      await this.oauthRepo.save(oauthAccount);
    }

    const { accessToken, rawRefresh, refreshToken } = this.issueTokens(user);
    await this.storeRefreshToken(user.id, rawRefresh, req);
    this.cookieOptions(res, accessToken, refreshToken);

    // Redirect to Next.js frontend dashboard after Google OAuth
    return res.redirect(`${this.frontendUrl}/dashboard`);
  }

  // ─── Private ──────────────────────────────────────────────────────────────────

  private async storeRefreshToken(userId: string, rawToken: string, req: any) {
    const tokenHash = hashToken(rawToken);
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';
    const days = parseInt(refreshExpiresIn.replace('d', ''), 10) || 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        id: uuidv4(),
        userId,
        tokenHash,
        expiresAt,
        userAgent: req.headers?.['user-agent'] || null,
        ip: req.ip || null,
      }),
    );
  }
}
