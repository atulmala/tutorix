import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TutorService } from '../../tutor/services/tutor.service';
import { StudentService } from '../../student/services/student.service';
import { UserWalletEntity } from '../entities/user-wallet.entity';
import { WalletTransactionEntity } from '../entities/wallet-transaction.entity';
import { WalletTransactionTypeEnum } from '../enums/wallet.enums';
import {
  UserWalletDto,
  WalletTransactionConnectionDto,
  WalletTransactionDto,
} from '../dto/wallet.dto';

export type WalletCreditParams = {
  userId: number;
  amountInr: number;
  commerceOrderId?: number;
  referenceType?: string;
  referenceId?: number;
  description: string;
};

export type WalletDebitParams = {
  userId: number;
  amountInr: number;
  commerceOrderId?: number;
  referenceType?: string;
  referenceId?: number;
  description: string;
};

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(UserWalletEntity)
    private readonly walletRepo: Repository<UserWalletEntity>,
    @InjectRepository(WalletTransactionEntity)
    private readonly transactionRepo: Repository<WalletTransactionEntity>,
    private readonly dataSource: DataSource,
    private readonly tutorService: TutorService,
    private readonly studentService: StudentService,
  ) {}

  async isUserOnboarded(userId: number): Promise<boolean> {
    const tutor = await this.tutorService.findByUserId(userId);
    if (tutor?.onBoardingComplete) {
      return true;
    }
    const student = await this.studentService.findByUserId(userId);
    return student?.onBoardingComplete === true;
  }

  async assertUserOnboarded(userId: number): Promise<void> {
    if (!(await this.isUserOnboarded(userId))) {
      throw new BadRequestException('Wallet is available after onboarding is complete');
    }
  }

  async ensureWalletForUser(userId: number): Promise<UserWalletEntity> {
    const existing = await this.walletRepo.findOne({
      where: { userId, deleted: false },
    });
    if (existing) {
      return existing;
    }

    const wallet = this.walletRepo.create({
      userId,
      balanceInr: 0,
    });
    return this.walletRepo.save(wallet);
  }

  async getWalletForUser(userId: number): Promise<UserWalletEntity> {
    await this.assertUserOnboarded(userId);
    const wallet = await this.walletRepo.findOne({
      where: { userId, deleted: false },
    });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }
    return wallet;
  }

  toWalletDto(wallet: UserWalletEntity): UserWalletDto {
    return { balanceInr: wallet.balanceInr };
  }

  async creditTopUp(params: WalletCreditParams): Promise<UserWalletEntity> {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager
        .getRepository(UserWalletEntity)
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.user_id = :userId', { userId: params.userId })
        .andWhere('wallet.deleted = false')
        .getOne();

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      wallet.balanceInr += params.amountInr;
      const savedWallet = await manager.getRepository(UserWalletEntity).save(wallet);

      await manager.getRepository(WalletTransactionEntity).save(
        manager.getRepository(WalletTransactionEntity).create({
          walletId: savedWallet.id,
          userId: params.userId,
          type: WalletTransactionTypeEnum.top_up_credit,
          amountInr: params.amountInr,
          balanceAfterInr: savedWallet.balanceInr,
          commerceOrderId: params.commerceOrderId,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          description: params.description,
        }),
      );

      return savedWallet;
    });
  }

  async debitPurchase(params: WalletDebitParams): Promise<UserWalletEntity> {
    return this.dataSource.transaction(async (manager) => {
      const wallet = await manager
        .getRepository(UserWalletEntity)
        .createQueryBuilder('wallet')
        .setLock('pessimistic_write')
        .where('wallet.user_id = :userId', { userId: params.userId })
        .andWhere('wallet.deleted = false')
        .getOne();

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }
      if (wallet.balanceInr < params.amountInr) {
        throw new BadRequestException(
          `Insufficient wallet balance. Available ₹${wallet.balanceInr}, required ₹${params.amountInr}`,
        );
      }

      wallet.balanceInr -= params.amountInr;
      const savedWallet = await manager.getRepository(UserWalletEntity).save(wallet);

      await manager.getRepository(WalletTransactionEntity).save(
        manager.getRepository(WalletTransactionEntity).create({
          walletId: savedWallet.id,
          userId: params.userId,
          type: WalletTransactionTypeEnum.purchase_debit,
          amountInr: params.amountInr,
          balanceAfterInr: savedWallet.balanceInr,
          commerceOrderId: params.commerceOrderId,
          referenceType: params.referenceType,
          referenceId: params.referenceId,
          description: params.description,
        }),
      );

      return savedWallet;
    });
  }

  async listTransactions(
    userId: number,
    limit = 20,
    offset = 0,
  ): Promise<WalletTransactionConnectionDto> {
    await this.assertUserOnboarded(userId);
    const take = Math.min(Math.max(limit, 1), 50);
    const rows = await this.transactionRepo.find({
      where: { userId, deleted: false },
      order: { createdDate: 'DESC', id: 'DESC' },
      take: take + 1,
      skip: offset,
    });

    const hasMore = rows.length > take;
    const items = rows.slice(0, take).map((row) => this.toTransactionDto(row));

    return { items, hasMore };
  }

  toTransactionDto(row: WalletTransactionEntity): WalletTransactionDto {
    return {
      id: row.id,
      createdDate: row.createdDate,
      type: row.type,
      amountInr: row.amountInr,
      balanceAfterInr: row.balanceAfterInr,
      description: row.description,
      commerceOrderId: row.commerceOrderId,
    };
  }
}
