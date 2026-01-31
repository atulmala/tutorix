import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';
import { JwtPayload } from '../services/jwt.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production',
    });
  }

  async validate(payload: JwtPayload) {
    console.log(`[JwtStrategy] Validating JWT payload:`, { sub: payload.sub, loginId: payload.loginId, role: payload.role });
    const user = await this.authService.validateUser(payload.sub);

    if (!user) {
      console.log(`[JwtStrategy] User not found for sub: ${payload.sub}`);
      throw new UnauthorizedException('User not found or inactive');
    }

    console.log(`[JwtStrategy] User validated: ${user.id}`);
    return user;
  }
}

