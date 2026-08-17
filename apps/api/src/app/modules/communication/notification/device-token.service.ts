import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDeviceTokenEntity } from '../entities/user-device-token.entity';
import { DevicePlatform } from '../enums/device-platform.enum';

@Injectable()
export class DeviceTokenService {
  constructor(
    @InjectRepository(UserDeviceTokenEntity)
    private readonly tokenRepository: Repository<UserDeviceTokenEntity>,
  ) {}

  async register(
    userId: number,
    token: string,
    platform: DevicePlatform,
  ): Promise<boolean> {
    const existing = await this.tokenRepository.findOne({
      where: { token },
    });
    if (existing) {
      existing.userId = userId;
      existing.platform = platform;
      existing.deleted = false;
      existing.active = true;
      await this.tokenRepository.save(existing);
      return true;
    }
    const row = this.tokenRepository.create({ userId, token, platform });
    await this.tokenRepository.save(row);
    return true;
  }

  async unregister(userId: number, token: string): Promise<boolean> {
    const existing = await this.tokenRepository.findOne({
      where: { token, userId },
    });
    if (!existing) {
      return true;
    }
    await this.tokenRepository.remove(existing);
    return true;
  }

  async tokensForUser(userId: number): Promise<UserDeviceTokenEntity[]> {
    return this.tokenRepository.find({
      where: { userId, deleted: false, active: true },
    });
  }

  async deleteTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) {
      return;
    }
    await this.tokenRepository
      .createQueryBuilder()
      .delete()
      .where('token IN (:...tokens)', { tokens })
      .execute();
  }
}
