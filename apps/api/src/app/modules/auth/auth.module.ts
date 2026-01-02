import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './services/auth.service';
import { AuthResolver } from './resolvers/auth.resolver';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Tutor } from '../tutor/entities/tutor.entity';
import { PasswordService } from './services/password.service';
import { JwtService } from './services/jwt.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Otp } from './entities/otp.entity';
import { OtpService } from './services/otp.service';
import { OtpResolver } from './resolvers/otp.resolver';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken, Tutor, Otp]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'your-secret-key-change-in-production',
        signOptions: {
          expiresIn: '15m', // Access token expires in 15 minutes
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  providers: [
    AuthService,
    AuthResolver,
    OtpService,
    OtpResolver,
    PasswordService,
    JwtService,
    JwtStrategy,
  ],
  exports: [AuthService, JwtService],
})
export class AuthModule {}

