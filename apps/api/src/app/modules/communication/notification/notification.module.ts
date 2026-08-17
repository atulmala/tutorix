import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserDeviceTokenEntity } from '../entities/user-device-token.entity';
import { DeviceTokenService } from './device-token.service';
import { DeviceTokenResolver } from './device-token.resolver';
import { NotificationService } from './notification.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([UserDeviceTokenEntity])],
  providers: [DeviceTokenService, NotificationService, DeviceTokenResolver],
  exports: [DeviceTokenService, NotificationService],
})
export class NotificationModule {}
