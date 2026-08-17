import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Otp } from '../entities/otp.entity';
import { User } from '../entities/user.entity';
import { GenerateOtpInput } from '../dto/generate-otp.input';
import { GenerateOtpResponse } from '../dto/generate-otp-response.dto';
import { VerifyOtpInput } from '../dto/verify-otp.input';
import { VerifyOtpResponse } from '../dto/verify-otp-response.dto';
import { OtpPurpose } from '../enums/otp-purpose.enum';
import { CommunicationService } from '../../communication/communication.service';
import { CommunicationEvent } from '../../communication/enums/communication-event.enum';

@Injectable()
export class OtpService {
  private static readonly OTP_EXPIRY_MINUTES = 30;

  constructor(
    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly communicationService: CommunicationService,
  ) {}

  /**
   * Generate a 6-digit OTP for the given user and purpose.
   * If an entry already exists for the same user and purpose,
   * update it with a new OTP and expiry.
   */
  async generateOtp(input: GenerateOtpInput): Promise<GenerateOtpResponse> {
    const user = await this.userRepository.findOne({
      where: { id: input.userId, active: true, deleted: false },
      select: ['id', 'email', 'mobileCountryCode', 'mobileNumber', 'firstName', 'lastName', 'role'],
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

    const payload = {
      firstName: user.firstName?.trim() || 'there',
      otp: otpValue,
      expiryMinutes: String(OtpService.OTP_EXPIRY_MINUTES),
    };

    if (input.purpose === OtpPurpose.EMAIL_VERIFICATION) {
      if (!user.email) {
        throw new BadRequestException('User email is required for email verification');
      }

      await this.communicationService.emit({
        event: CommunicationEvent.EMAIL_VERIFICATION,
        userId: user.id,
        payload,
      });

      return {
        userId: input.userId,
        purpose: input.purpose,
        expiresAt,
        otp: this.communicationService.returnsOtpInApiResponse() ? otpValue : null,
      };
    }

    if (input.purpose === OtpPurpose.MOBILE_VERIFICATION) {
      await this.communicationService.emit({
        event: CommunicationEvent.MOBILE_VERIFICATION,
        userId: user.id,
        payload,
      });
    }

    return {
      userId: input.userId,
      purpose: input.purpose,
      expiresAt,
      otp: otpValue,
    };
  }

  /**
   * Verify the provided OTP against the stored hash and expiry window.
   */
  async verifyOtp(input: VerifyOtpInput): Promise<VerifyOtpResponse> {
    const record = await this.otpRepository.findOne({
      where: { userId: input.userId, purpose: input.purpose },
    });

    if (!record) {
      throw new BadRequestException('OTP not found for user and purpose');
    }

    const clientTime = new Date(input.timestamp);
    if (Number.isNaN(clientTime.getTime())) {
      throw new BadRequestException('Invalid timestamp');
    }

    if (clientTime > record.expiresAt) {
      throw new BadRequestException('OTP has expired');
    }

    const incomingHash = this.hashOtp(input.otp);
    if (incomingHash !== record.otpHash) {
      throw new BadRequestException('Invalid OTP');
    }

    const user = await this.userRepository.findOne({
      where: { id: input.userId },
      select: ['id', 'isMobileVerified', 'isEmailVerified', 'isSignupComplete'],
    });

    if (user) {
      if (input.purpose === OtpPurpose.MOBILE_VERIFICATION) {
        user.isMobileVerified = true;
      }
      if (input.purpose === OtpPurpose.EMAIL_VERIFICATION) {
        user.isEmailVerified = true;
      }
      if (user.isMobileVerified && user.isEmailVerified) {
        user.isSignupComplete = true;
      }
      await this.userRepository.save(user);
    }

    return {
      success: true,
      message: 'OTP verified successfully',
    };
  }

  private createOtpCode(): string {
    return Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0');
  }

  private hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }
}
