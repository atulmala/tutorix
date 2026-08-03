import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletTransactionTypeEnum } from '../enums/wallet.enums';
import { UserWalletEntity } from '../entities/user-wallet.entity';
import { WalletTransactionEntity } from '../entities/wallet-transaction.entity';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let transactionRepo: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let dataSource: { transaction: jest.Mock };
  let tutorService: { findByUserId: jest.Mock };
  let studentService: { findByUserId: jest.Mock };
  let walletOfferingLabelService: {
    enrichTransactionDescriptions: jest.Mock;
  };

  beforeEach(() => {
    walletRepo = {
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 1, ...value })),
    };
    transactionRepo = {
      find: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 10, ...value })),
    };
    dataSource = {
      transaction: jest.fn(async (fn) =>
        fn({
          getRepository: (entity: unknown) => {
            if (entity === UserWalletEntity) {
              return {
                createQueryBuilder: () => ({
                  setLock: () => ({
                    where: () => ({
                      andWhere: () => ({
                        getOne: walletRepo.findOne,
                      }),
                    }),
                  }),
                }),
                save: walletRepo.save,
                create: walletRepo.create,
              };
            }
            if (entity === WalletTransactionEntity) {
              return {
                create: transactionRepo.create,
                save: transactionRepo.save,
              };
            }
            throw new Error('Unexpected entity');
          },
        }),
      ),
    };
    tutorService = { findByUserId: jest.fn() };
    studentService = { findByUserId: jest.fn() };
    walletOfferingLabelService = {
      enrichTransactionDescriptions: jest.fn(async (rows) => rows),
    };

    service = new WalletService(
      walletRepo as never,
      transactionRepo as never,
      dataSource as never,
      tutorService as never,
      studentService as never,
      walletOfferingLabelService as never,
    );
  });

  it('creates wallet idempotently with zero balance', async () => {
    walletRepo.findOne.mockResolvedValueOnce(null);
    walletRepo.save.mockResolvedValueOnce({ id: 5, userId: 42, balanceInr: 0 });

    const wallet = await service.ensureWalletForUser(42);

    expect(wallet.balanceInr).toBe(0);
    expect(walletRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 42, balanceInr: 0 }),
    );
  });

  it('rejects wallet access before onboarding completes', async () => {
    tutorService.findByUserId.mockResolvedValue({ onBoardingComplete: false });
    studentService.findByUserId.mockResolvedValue({ onBoardingComplete: false });

    await expect(service.getWalletForUser(7)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('debits wallet and writes ledger entry', async () => {
    tutorService.findByUserId.mockResolvedValue({ onBoardingComplete: true });
    studentService.findByUserId.mockResolvedValue(null);
    walletRepo.findOne
      .mockResolvedValueOnce({ id: 1, userId: 9, balanceInr: 150 })
      .mockResolvedValueOnce({ id: 1, userId: 9, balanceInr: 150 });
    walletRepo.save.mockResolvedValueOnce({ id: 1, userId: 9, balanceInr: 50 });

    const wallet = await service.debitPurchase({
      userId: 9,
      amountInr: 100,
      description: 'Proficiency test',
    });

    expect(wallet.balanceInr).toBe(50);
    expect(transactionRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        type: WalletTransactionTypeEnum.purchase_debit,
        amountInr: 100,
        balanceAfterInr: 50,
      }),
    );
  });

  it('throws when debit exceeds balance', async () => {
    tutorService.findByUserId.mockResolvedValue({ onBoardingComplete: true });
    studentService.findByUserId.mockResolvedValue(null);
    walletRepo.findOne.mockResolvedValue({ id: 1, userId: 9, balanceInr: 20 });

    await expect(
      service.debitPurchase({
        userId: 9,
        amountInr: 100,
        description: 'Proficiency test',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns paginated transactions', async () => {
    tutorService.findByUserId.mockResolvedValue({ onBoardingComplete: true });
    studentService.findByUserId.mockResolvedValue(null);
    transactionRepo.find.mockResolvedValue([
      {
        id: 1,
        createdDate: new Date('2026-07-01'),
        type: WalletTransactionTypeEnum.top_up_credit,
        amountInr: 100,
        balanceAfterInr: 100,
        description: 'Wallet top-up',
      },
    ]);

    const result = await service.listTransactions(9, 20, 0);

    expect(result.items).toHaveLength(1);
    expect(result.hasMore).toBe(false);
  });

  it('throws when wallet row missing for onboarded user', async () => {
    tutorService.findByUserId.mockResolvedValue({ onBoardingComplete: true });
    studentService.findByUserId.mockResolvedValue(null);
    walletRepo.findOne.mockResolvedValue(null);

    await expect(service.getWalletForUser(9)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findWalletForUser returns null when onboarding incomplete', async () => {
    tutorService.findByUserId.mockResolvedValue({ onBoardingComplete: false });
    studentService.findByUserId.mockResolvedValue({ onBoardingComplete: false });

    await expect(service.findWalletForUser(7)).resolves.toBeNull();
    expect(walletRepo.findOne).not.toHaveBeenCalled();
  });

  it('findWalletForUser returns wallet when onboarded', async () => {
    tutorService.findByUserId.mockResolvedValue({ onBoardingComplete: true });
    studentService.findByUserId.mockResolvedValue(null);
    walletRepo.findOne.mockResolvedValue({ id: 1, userId: 9, balanceInr: 40 });

    await expect(service.findWalletForUser(9)).resolves.toEqual(
      expect.objectContaining({ balanceInr: 40 }),
    );
  });

  it('listTransactionsForAdmin returns empty when not onboarded', async () => {
    tutorService.findByUserId.mockResolvedValue(null);
    studentService.findByUserId.mockResolvedValue({ onBoardingComplete: false });

    await expect(service.listTransactionsForAdmin(7)).resolves.toEqual({
      items: [],
      hasMore: false,
    });
    expect(transactionRepo.find).not.toHaveBeenCalled();
  });
});
