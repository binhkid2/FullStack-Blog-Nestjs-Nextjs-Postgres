import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import * as crypto from 'crypto';

const EXEMPT_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/magic-link',
  '/auth/refresh',
  '/auth/google',
  '/auth/google/callback',
  '/auth/password-reset',
  '/health',
];

const STATE_CHANGING_METHODS = ['POST', 'PATCH', 'PUT', 'DELETE'];

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Read or generate CSRF token
    let csrfToken: string = req.cookies?.csrfToken;
    if (!csrfToken) {
      csrfToken = crypto.randomBytes(24).toString('hex');
    }

    // Set as non-httpOnly cookie so JS can read it
    // SameSite=none required for cross-subdomain (frontend ↔ backend on different subdomains)
    const secure = process.env.COOKIE_SECURE === 'true';
    const domain = process.env.COOKIE_DOMAIN || undefined;
    const sameSite = secure ? ('none' as const) : ('lax' as const);
    res.cookie('csrfToken', csrfToken, {
      httpOnly: false,
      sameSite,
      secure,
      domain,
    });

    (req as any).csrfToken = csrfToken;

    // Validate on state-changing methods
    if (STATE_CHANGING_METHODS.includes(req.method)) {
      const isExempt = EXEMPT_PATHS.some((p) => req.path.startsWith(p));
      if (!isExempt) {
        const hasCookieAuth =
          req.cookies?.accessToken || req.cookies?.refreshToken;
        if (hasCookieAuth) {
          const tokenFromHeader = req.headers['x-csrf-token'] as string;
          const tokenFromBody = (req.body as any)?._csrf;
          const provided = tokenFromHeader || tokenFromBody;
          if (!provided || provided !== csrfToken) {
            throw new ForbiddenException('Invalid CSRF token');
          }
        }
      }
    }

    next();
  }
}
