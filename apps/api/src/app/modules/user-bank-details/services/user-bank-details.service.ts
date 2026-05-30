import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  maskAccountNumber,
  isBankDetailsComplete,
  normalizePanNumber,
} from '@tutorix/shared-utils';
import { UserBankDetailsEntity } from '../entities/user-bank-details.entity';
import { SaveUserBankDetailsInput } from '../dto/save-user-bank-details.input';
import { UserBankDetails } from '../dto/user-bank-details.dto';

@Injectable()
export class UserBankDetailsService {
  constructor(
    @InjectRepository(UserBankDetailsEntity)
    private readonly repo: Repository<UserBankDetailsEntity>,
  ) {}

  async findByUserId(userId: number): Promise<UserBankDetailsEntity | null> {
    return this.repo.findOne({
      where: { userId, deleted: false },
    });
  }

  async saveForUser(
    userId: number,
    input: SaveUserBankDetailsInput,
  ): Promise<UserBankDetails> {
    const normalized = this.normalizeInput(input);
    let entity = await this.findByUserId(userId);

    if (entity) {
      entity.bankName = normalized.bankName;
      entity.accountNumber = normalized.accountNumber;
      entity.ifscCode = normalized.ifscCode;
      entity.gstNumber = normalized.gstNumber;
      entity.panNumber = normalized.panNumber;
    } else {
      entity = this.repo.create({
        userId,
        bankName: normalized.bankName,
        accountNumber: normalized.accountNumber,
        ifscCode: normalized.ifscCode,
        gstNumber: normalized.gstNumber,
        panNumber: normalized.panNumber,
      });
    }

    const saved = await this.repo.save(entity);
    return this.mapEntityToGraphql(saved);
  }

  mapToGraphql(entity: UserBankDetailsEntity | null): UserBankDetails | null {
    if (!entity) {
      return null;
    }
    return this.mapEntityToGraphql(entity);
  }

  private mapEntityToGraphql(entity: UserBankDetailsEntity): UserBankDetails {
    return {
      bankName: entity.bankName,
      ifscCode: entity.ifscCode,
      gstNumber: entity.gstNumber ?? null,
      panNumber: entity.panNumber ?? null,
      accountNumberMasked: maskAccountNumber(entity.accountNumber),
      isComplete: isBankDetailsComplete({
        bankName: entity.bankName,
        accountNumber: entity.accountNumber,
        ifscCode: entity.ifscCode,
        panNumber: entity.panNumber,
      }),
      fullAccountNumber: entity.accountNumber,
    };
  }

  private normalizeInput(input: SaveUserBankDetailsInput): {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    gstNumber: string | null;
    panNumber: string;
  } {
    const gst = input.gstNumber?.trim();
    return {
      bankName: input.bankName.trim(),
      accountNumber: input.accountNumber.trim(),
      ifscCode: input.ifscCode.trim().toUpperCase(),
      gstNumber: gst ? gst.toUpperCase() : null,
      panNumber: normalizePanNumber(input.panNumber),
    };
  }
}
