import { Args, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlatformFeeService } from '../services/platform-fee.service';
import { PlatformFeePublicInfo } from '../dto/platform-fee-public-info.dto';
import { PlatformFeeCodeEnum } from '../enums/platform-fee-code.enum';

@Resolver()
export class PlatformFeeResolver {
  constructor(private readonly platformFeeService: PlatformFeeService) {}

  @Query(() => PlatformFeePublicInfo, {
    description: 'Public platform fee config for authenticated users',
  })
  @UseGuards(JwtAuthGuard)
  async platformFee(
    @Args('code', { type: () => PlatformFeeCodeEnum }) code: PlatformFeeCodeEnum,
  ): Promise<PlatformFeePublicInfo> {
    const config = await this.platformFeeService.findByCode(code);
    return this.platformFeeService.buildPublicFeeInfo(config);
  }
}
