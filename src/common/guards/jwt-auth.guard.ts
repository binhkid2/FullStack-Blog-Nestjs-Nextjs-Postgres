import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { verifyAccessToken } from '../helpers/jwt.helper';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      const isHtmx = request.headers['hx-request'] === 'true';
      if (isHtmx) throw new UnauthorizedException('Please log in to continue');
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
      const payload = verifyAccessToken(token, secret);
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: any): string | null {
    // Check Authorization header
    const authHeader = request.headers?.authorization as string;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    // Check cookie
    if (request.cookies?.accessToken) {
      return request.cookies.accessToken;
    }
    return null;
  }
}
