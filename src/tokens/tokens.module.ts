import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { MagicLinkToken } from './entities/magic-link-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { OAuthAccount } from './entities/oauth-account.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RefreshToken,
      MagicLinkToken,
      PasswordResetToken,
      OAuthAccount,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class TokensModule {}
