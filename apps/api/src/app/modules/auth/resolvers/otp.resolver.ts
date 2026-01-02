import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { GenerateOtpInput } from '../dto/generate-otp.input';
import { GenerateOtpResponse } from '../dto/generate-otp-response.dto';
import { OtpService } from '../services/otp.service';
import { Otp } from '../entities/otp.entity';

@Resolver(() => Otp)
export class OtpResolver {
  constructor(private readonly otpService: OtpService) {}

  @Mutation(() => GenerateOtpResponse)
  async generateOtp(
    @Args('input') input: GenerateOtpInput,
  ): Promise<GenerateOtpResponse> {
    return this.otpService.generateOtp(input);
  }
}

