import { Module } from '@nestjs/common';
import { GoogleStrategy } from './google.strategy.js';
import { JwtStrategy } from './jwt.strategy.js';
import { GoogleAuthAdapter } from './google-auth.adapter.js';
import {
  ExternalAuthProvider,
  USER_AUTH_PORT_TOKEN,
  UserAuthPort,
} from '../../domain/ports/auth.port.js';
import { JwtAuthAdapter } from './jwt-auth.adapter.js';
import { RepositoriesModule } from '../repositories/repositories.module.js';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AnonymousStrategy } from './anonymous.strategy.js';

// 創建 ExternalAuthProvider 的令牌
export const EXTERNAL_AUTH_PROVIDER_TOKEN = Symbol('ExternalAuthProvider');

/**
 * 認證基礎設施模組
 * 提供外部認證適配器，實現領域層定義的出站埠接口
 */
@Module({
  imports: [
    // 引入儲存庫模組以解決 USER_REPOSITORY_TOKEN 依賴
    RepositoriesModule,

    // 引入 JwtModule 以提供 JwtService
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN') || '1d';

        if (!secret) {
          throw new Error('JWT configuration not found');
        }

        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  providers: [
    // 基礎設施層適配器
    GoogleStrategy,
    JwtStrategy,
    AnonymousStrategy,
    GoogleAuthAdapter,
    JwtAuthAdapter,

    // 將 GoogleAuthAdapter 繫結到領域層定義的出站埠接口
    {
      provide: EXTERNAL_AUTH_PROVIDER_TOKEN,
      useExisting: GoogleAuthAdapter,
    },

    // 將 JwtAuthAdapter 繫結到領域層定義的入站埠接口
    {
      provide: USER_AUTH_PORT_TOKEN,
      useExisting: JwtAuthAdapter,
    },
  ],
  exports: [
    // 導出領域層定義的接口，而非具體實現
    {
      provide: EXTERNAL_AUTH_PROVIDER_TOKEN,
      useExisting: GoogleAuthAdapter,
    },
    {
      provide: USER_AUTH_PORT_TOKEN,
      useExisting: JwtAuthAdapter,
    },

    // 導出 JwtModule 供其他模組使用
    JwtModule,
  ],
})
export class AuthModule {}
