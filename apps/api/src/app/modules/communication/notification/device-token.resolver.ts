import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/entities/user.entity';
import {
  RegisterDeviceTokenInput,
  UnregisterDeviceTokenInput,
} from '../dto/device-token.input';
import { DeviceTokenService } from './device-token.service';

@Resolver()
export class DeviceTokenResolver {
  constructor(private readonly deviceTokenService: DeviceTokenService) {}

  @Mutation(() => Boolean, {
    description: 'Register an FCM device token for the signed-in user',
  })
  @UseGuards(JwtAuthGuard)
  async registerDeviceToken(
    @CurrentUser() user: User,
    @Args('input') input: RegisterDeviceTokenInput,
  ): Promise<boolean> {
    return this.deviceTokenService.register(
      user.id,
      input.token.trim(),
      input.platform,
    );
  }

  @Mutation(() => Boolean, {
    description: 'Remove an FCM device token for the signed-in user',
  })
  @UseGuards(JwtAuthGuard)
  async unregisterDeviceToken(
    @CurrentUser() user: User,
    @Args('input') input: UnregisterDeviceTokenInput,
  ): Promise<boolean> {
    return this.deviceTokenService.unregister(user.id, input.token.trim());
  }
}
