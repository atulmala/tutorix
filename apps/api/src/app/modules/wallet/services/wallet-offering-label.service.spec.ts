import { WalletOfferingLabelService } from './wallet-offering-label.service';
import { WalletTransactionTypeEnum } from '../enums/wallet.enums';

describe('WalletOfferingLabelService', () => {
  let service: WalletOfferingLabelService;
  let tutorOfferingService: { findByIds: jest.Mock };
  let offeringService: { findAll: jest.Mock };
  let proficiencyTestService: { findByIdsWithOfferings: jest.Mock };

  beforeEach(() => {
    tutorOfferingService = { findByIds: jest.fn() };
    offeringService = { findAll: jest.fn() };
    proficiencyTestService = { findByIdsWithOfferings: jest.fn() };

    service = new WalletOfferingLabelService(
      tutorOfferingService as never,
      offeringService as never,
      proficiencyTestService as never,
    );
  });

  function seedSchoolEducationCatalog() {
    const root = {
      id: 1,
      displayName: 'School Education',
      level: 0,
      mediumOfInstruction: 1,
    };
    const board = {
      id: 10,
      displayName: 'CBSE',
      level: 1,
      mediumOfInstruction: 1,
      parentOffering: { id: 1 },
      rootOffering: { id: 1, displayName: 'School Education' },
    };
    const grade5 = {
      id: 105,
      displayName: 'Class 5',
      level: 2,
      mediumOfInstruction: 1,
      parentOffering: { id: 10 },
      rootOffering: { id: 1, displayName: 'School Education' },
    };
    const grade8 = {
      id: 108,
      displayName: 'Class 8',
      level: 2,
      mediumOfInstruction: 1,
      parentOffering: { id: 10 },
      rootOffering: { id: 1, displayName: 'School Education' },
    };
    const history5 = {
      id: 1005,
      displayName: 'History',
      level: 3,
      mediumOfInstruction: 1,
      parentOffering: { id: 105 },
      rootOffering: { id: 1, displayName: 'School Education' },
    };
    const history8 = {
      id: 1008,
      displayName: 'History',
      level: 3,
      mediumOfInstruction: 1,
      parentOffering: { id: 108 },
      rootOffering: { id: 1, displayName: 'School Education' },
    };

    offeringService.findAll.mockResolvedValue([
      root,
      board,
      grade5,
      grade8,
      history5,
      history8,
    ]);
    proficiencyTestService.findByIdsWithOfferings.mockResolvedValue([
      {
        id: 7,
        offerings: [history5, history8],
      },
    ]);
    tutorOfferingService.findByIds.mockResolvedValue([
      {
        id: 53,
        offeringId: 1005,
        proficiencyTestId: 7,
      },
    ]);
  }

  it('builds proficiency test description with full offering path', async () => {
    seedSchoolEducationCatalog();

    await expect(service.buildProficiencyTestDescription(53)).resolves.toBe(
      'Proficiency test — School Education | CBSE | Class 5 - 8 | History',
    );
  });

  it('enriches legacy Offering #N descriptions on purchase debits', async () => {
    seedSchoolEducationCatalog();

    const enriched = await service.enrichTransactionDescriptions([
      {
        id: 1,
        type: WalletTransactionTypeEnum.purchase_debit,
        description: 'Proficiency test — Offering #53',
        referenceType: 'tutor_offering',
        referenceId: 53,
      } as never,
      {
        id: 2,
        type: WalletTransactionTypeEnum.top_up_credit,
        description: 'Wallet top-up',
      } as never,
    ]);

    expect(enriched[0].description).toBe(
      'Proficiency test — School Education | CBSE | Class 5 - 8 | History',
    );
    expect(enriched[1].description).toBe('Wallet top-up');
  });
});
