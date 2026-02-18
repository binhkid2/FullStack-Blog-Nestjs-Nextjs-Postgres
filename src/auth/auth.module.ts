import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../tokens/entities/refresh-token.entity';
import { MagicLinkToken } from '../tokens/entities/magic-link-token.entity';
import { PasswordResetToken } from '../tokens/entities/password-reset-token.entity';
import { OAuthAccount } from '../tokens/entities/oauth-account.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: (configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m') as any },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      User,
      RefreshToken,
      MagicLinkToken,
      PasswordResetToken,
      OAuthAccount,
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}
