import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Otp } from '../entities/otp.entity';
import { User } from '../entities/user.entity';
import { GenerateOtpInput } from '../dto/generate-otp.input';
import { GenerateOtpResponse } from '../dto/generate-otp-response.dto';

@Injectable()
export class OtpService {
  private static readonly OTP_EXPIRY_MINUTES = 30;

  constructor(
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Generate a 4-digit OTP for the given user and purpose.
   * If an entry already exists for the same user and purpose,
   * update it with a new OTP and expiry.
   */
  async generateOtp(input: GenerateOtpInput): Promise<GenerateOtpResponse> {
    const user = await this.userRepository.findOne({
      where: { id: input.userId, active: true, deleted: false },
    });

    if (!user) {
      throw new BadRequestException('User not found or inactive');
    }

    const otpValue = this.createOtpCode();
    const otpHash = this.hashOtp(otpValue);
    const expiresAt = new Date(
      Date.now() + OtpService.OTP_EXPIRY_MINUTES * 60 * 1000,
    );

    const existing = await this.otpRepository.findOne({
      where: { userId: input.userId, purpose: input.purpose },
    });

    if (existing) {
      existing.otpHash = otpHash;
      existing.expiresAt = expiresAt;
      await this.otpRepository.save(existing);
    } else {
      const otp = this.otpRepository.create({
        userId: input.userId,
        user,
        purpose: input.purpose,
        otpHash,
        expiresAt,
      });
      await this.otpRepository.save(otp);
    }

    // NOTE: Hook email/SMS/WhatsApp delivery here. For now we return
    // the OTP so callers can wire delivery or use for testing.
    return {
      userId: input.userId,
      purpose: input.purpose,
      expiresAt,
      otp: otpValue,
    };
  }

  private createOtpCode(): string {
    return Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
  }

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }
}

