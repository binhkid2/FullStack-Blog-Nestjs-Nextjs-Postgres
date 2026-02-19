import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { MagicLinkRequestDto } from './dto/magic-link-request.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { PasswordResetRequestDto } from './dto/password-reset-request.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Returns the JWT payload of the currently logged-in user.
   *  Used by the frontend to restore auth state (e.g. after Google OAuth redirect). */
  @Get('me')
  me(@CurrentUser() user: any) {
    return { success: true, user };
  }

  @Post('register')
  @Public()
  register(@Body() dto: RegisterDto, @Req() req: Request, @Res() res: Response) {
    return this.authService.register(dto, req, res);
  }

  @Post('login')
  @Public()
  login(@Body() dto: LoginDto, @Req() req: Request, @Res() res: Response) {
    return this.authService.login(dto, req, res);
  }

  @Post('refresh')
  @Public()
  refresh(@Req() req: Request, @Res() res: Response) {
    return this.authService.refresh(req, res);
  }

  @Post('logout')
  @Public()
  logout(@Req() req: Request, @Res() res: Response) {
    return this.authService.logout(req, res);
  }

  @Post('magic-link')
  @Public()
  requestMagicLink(
    @Body() dto: MagicLinkRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.authService.requestMagicLink(dto.email, req, res);
  }

  @Get('magic-link/verify')
  @Public()
  verifyMagicLink(
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.authService.verifyMagicLink(token, req, res);
  }

  @Post('password-reset/request')
  @Public()
  requestPasswordReset(
    @Body() dto: PasswordResetRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.authService.requestPasswordReset(dto.email, req, res);
  }

  @Post('password-reset/confirm')
  @Public()
  confirmPasswordReset(
    @Body() dto: PasswordResetConfirmDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.authService.confirmPasswordReset(dto, req, res);
  }

  @Get('google')
  @Public()
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Passport redirects to Google
  }

  @Get('google/callback')
  @Public()
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: Request, @Res() res: Response) {
    return this.authService.handleGoogleCallback((req as any).user, req, res);
  }
}
