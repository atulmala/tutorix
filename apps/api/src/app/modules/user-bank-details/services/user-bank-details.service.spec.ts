import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserBankDetailsService } from './user-bank-details.service';
import { UserBankDetailsEntity } from '../entities/user-bank-details.entity';

describe('UserBankDetailsService', () => {
  let service: UserBankDetailsService;
  let repo: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 1, ...value })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserBankDetailsService,
        {
          provide: getRepositoryToken(UserBankDetailsEntity),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get(UserBankDetailsService);
  });

  describe('saveForUser', () => {
    it('creates new bank details when none exist', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.saveForUser(5, {
        bankName: 'HDFC Bank',
        accountNumber: '123456789012',
        ifscCode: 'hdfc0001234',
        gstNumber: null,
      });

      expect(repo.create).toHaveBeenCalledWith({
        userId: 5,
        bankName: 'HDFC Bank',
        accountNumber: '123456789012',
        ifscCode: 'HDFC0001234',
        gstNumber: null,
      });
      expect(result).toMatchObject({
        bankName: 'HDFC Bank',
        ifscCode: 'HDFC0001234',
        accountNumberMasked: 'xxxxxxxx9012',
        isComplete: true,
        fullAccountNumber: '123456789012',
      });
    });

    it('updates existing bank details', async () => {
      repo.findOne.mockResolvedValue({
        id: 9,
        userId: 5,
        bankName: 'Old Bank',
        accountNumber: '111111111',
        ifscCode: 'OLD0001111',
        gstNumber: null,
      });

      const result = await service.saveForUser(5, {
        bankName: 'ICICI Bank',
        accountNumber: '987654321098',
        ifscCode: 'ICIC0001234',
        gstNumber: '22AAAAA0000A1Z5',
      });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          bankName: 'ICICI Bank',
          accountNumber: '987654321098',
          ifscCode: 'ICIC0001234',
          gstNumber: '22AAAAA0000A1Z5',
        }),
      );
      expect(result.gstNumber).toBe('22AAAAA0000A1Z5');
    });

    it('stores null GST when omitted or blank', async () => {
      repo.findOne.mockResolvedValue(null);

      await service.saveForUser(5, {
        bankName: 'SBI',
        accountNumber: '123456789',
        ifscCode: 'SBIN0001234',
        gstNumber: '   ',
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          gstNumber: null,
        }),
      );
    });
  });

  describe('mapToGraphql', () => {
    it('returns null when entity is missing', () => {
      expect(service.mapToGraphql(null)).toBeNull();
    });

    it('masks account number and marks complete details', () => {
      const mapped = service.mapToGraphql({
        bankName: 'Axis Bank',
        accountNumber: '1234567890',
        ifscCode: 'UTIB0000123',
        gstNumber: null,
      } as UserBankDetailsEntity);

      expect(mapped).toMatchObject({
        bankName: 'Axis Bank',
        ifscCode: 'UTIB0000123',
        accountNumberMasked: 'xxxxxx7890',
        isComplete: true,
        fullAccountNumber: '1234567890',
      });
    });
  });
});
