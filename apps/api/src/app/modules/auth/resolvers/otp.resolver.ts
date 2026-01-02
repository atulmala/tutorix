import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { GenerateOtpInput } from '../dto/generate-otp.input';
import { GenerateOtpResponse } from '../dto/generate-otp-response.dto';
import { OtpService } from '../services/otp.service';
import { Otp } from '../entities/otp.entity';
import { VerifyOtpInput } from '../dto/verify-otp.input';
import { VerifyOtpResponse } from '../dto/verify-otp-response.dto';

@Resolver(() => Otp)
export class OtpResolver {
  constructor(private readonly otpService: OtpService) {}

  @Mutation(() => GenerateOtpResponse)
  async generateOtp(
    @Args('input') input: GenerateOtpInput,
  ): Promise<GenerateOtpResponse> {
    return this.otpService.generateOtp(input);
  }

  @Mutation(() => VerifyOtpResponse)
  async verifyOtp(
    @Args('input') input: VerifyOtpInput,
  ): Promise<VerifyOtpResponse> {
    return this.otpService.verifyOtp(input);
  }
}

