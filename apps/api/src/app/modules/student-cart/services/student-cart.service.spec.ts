import { BadRequestException } from '@nestjs/common';
import { UserRole } from '../../auth/enums/user-role.enum';
import { WalletPurchaseReferenceTypeEnum } from '../../wallet/enums/wallet.enums';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import { AddressType } from '../../address/enums/address-type.enum';
import { CommunicationAudience } from '../../communication/enums/communication-audience.enum';
import { CommunicationEvent } from '../../communication/enums/communication-event.enum';
import { StudentCartService } from './student-cart.service';

const nearbyStudentAddresses = [
  {
    deleted: false,
    primary: true,
    latitude: 28.6139,
    longitude: 77.209,
  },
];

const nearbyTutorAddresses = [
  {
    deleted: false,
    type: AddressType.TEACHING,
    latitude: 28.6145,
    longitude: 77.2095,
  },
];

describe('StudentCartService', () => {
  const studentUser = { id: 9, role: UserRole.STUDENT };
  const tutorOffering = {
    id: 80,
    tutorId: 3,
    offeringId: 30,
    tutor: {
      id: 3,
      deleted: false,
      onBoardingComplete: true,
      userId: 4,
      user: { id: 4, firstName: 'Priya', lastName: 'Sharma' },
      addresses: nearbyTutorAddresses,
    },
    offering: { displayName: 'Mathematics' },
  };
  const rateCard = {
    offlineEnabled: true,
    offlineBaseRate: 1000,
    offlineBaseDiscountPct: 0,
    offlineSlab2DiscountPct: 10,
    offlineSlab3DiscountPct: 20,
    onlineEnabled: true,
    onlineBaseRate: 800,
    onlineBaseDiscountPct: 5,
    freeDemoOffered: false,
  };

  let findStudent: jest.Mock;
  let findRateCard: jest.Mock;
  let offeringFindOne: jest.Mock;
  let cartFindOne: jest.Mock;
  let itemSave: jest.Mock;
  let itemDelete: jest.Mock;
  let createOrder: jest.Mock;
  let findOrder: jest.Mock;
  let debitPurchase: jest.Mock;
  let generateInvoice: jest.Mock;
  let fulfillPaidOrder: jest.Mock;
  let hasActiveDemo: jest.Mock;
  let issueDemoCredit: jest.Mock;
  let emit: jest.Mock;
  let getWallet: jest.Mock;
  let cart: {
    id: number;
    studentId: number;
    items: Array<{
      id?: number;
      deleted?: boolean;
      tutorOfferingId: number;
      catalogOfferingId?: number;
      deliveryMode: ClassSessionDeliveryModeEnum;
      quantity: number;
      unitRateInr: number;
      tutorOffering?: typeof tutorOffering;
    }>;
  };
  let service: StudentCartService;

  beforeEach(() => {
    rateCard.freeDemoOffered = false;
    findStudent = jest.fn().mockResolvedValue({
      id: 21,
      userId: 9,
      addresses: nearbyStudentAddresses,
    });
    findRateCard = jest.fn().mockResolvedValue(rateCard);
    offeringFindOne = jest.fn().mockResolvedValue(tutorOffering);
    cart = { id: 5, studentId: 21, items: [] };
    cartFindOne = jest.fn().mockImplementation(async () => ({
      ...cart,
      items: [...cart.items],
    }));
    itemSave = jest.fn().mockImplementation(async (row) => {
      if (!row.id) {
        row.id = cart.items.length + 11;
        cart.items.push(row);
      }
      return row;
    });
    itemDelete = jest.fn().mockImplementation(async (idOrWhere: number | { cartId?: number }) => {
      if (typeof idOrWhere === 'number') {
        cart.items = cart.items.filter((item) => item.id !== idOrWhere);
      } else if (idOrWhere.cartId) {
        cart.items = [];
      }
      return { affected: 1 };
    });
    createOrder = jest.fn().mockResolvedValue({ id: 40, orderNumber: 'ORD-1' });
    findOrder = jest.fn().mockResolvedValue({ id: 40, items: [] });
    debitPurchase = jest.fn().mockResolvedValue({ balanceInr: 100 });
    generateInvoice = jest.fn().mockResolvedValue({
      invoice: { invoiceNumber: 'INV-1' },
      pdfBuffer: Buffer.from('pdf-bytes'),
    });
    fulfillPaidOrder = jest.fn();
    hasActiveDemo = jest.fn().mockResolvedValue(false);
    issueDemoCredit = jest.fn().mockResolvedValue({
      id: 9,
      isDemo: true,
      offeringLabel: 'Mathematics',
    });
    emit = jest.fn().mockResolvedValue(undefined);
    getWallet = jest.fn().mockResolvedValue({ balanceInr: 5000 });

    service = new StudentCartService(
      { findByUserId: findStudent } as never,
      {
        findByTutorOfferingId: findRateCard,
        resolveCompleteRateCards: jest.fn(async (offerings: Array<{ id: number }>) => {
          const map = new Map<number, typeof rateCard>();
          for (const offering of offerings) {
            map.set(offering.id, rateCard);
          }
          return map;
        }),
      } as never,
      { findActiveTestForOffering: jest.fn().mockResolvedValue(null) } as never,
      {
        getWalletForUser: getWallet,
        debitPurchase,
        toWalletDto: (wallet: { balanceInr: number }) => ({
          balanceInr: wallet.balanceInr,
        }),
      } as never,
      {
        createOrderWithItems: createOrder,
        markOrderPaid: jest.fn(),
        findById: findOrder,
      } as never,
      { generateForOrderWithPdf: generateInvoice } as never,
      { fulfillPaidOrder, hasActiveDemo, issueDemoCredit } as never,
      {
        findOne: cartFindOne,
        save: jest.fn(async (row) => ({ ...row, id: 5, items: [] })),
        create: (row: unknown) => row,
      } as never,
      {
        save: itemSave,
        delete: itemDelete,
        create: (row: unknown) => row,
      } as never,
      { findOne: offeringFindOne } as never,
      { findAll: jest.fn().mockResolvedValue([]) } as never,
      { emit } as never,
    );
  });

  it('rejects offline cart lines when tutor is more than 25 km away', async () => {
    findStudent.mockResolvedValue({
      id: 21,
      userId: 9,
      addresses: [
        {
          deleted: false,
          primary: true,
          latitude: 28.6139,
          longitude: 77.209,
        },
      ],
    });
    offeringFindOne.mockResolvedValue({
      ...tutorOffering,
      tutor: {
        ...tutorOffering.tutor,
        addresses: [
          {
            deleted: false,
            type: AddressType.TEACHING,
            latitude: 28.35,
            longitude: 77.05,
          },
        ],
      },
    });

    await expect(
      service.addToCart(
        studentUser as never,
        3,
        30,
        ClassSessionDeliveryModeEnum.offline,
        1,
      ),
    ).rejects.toThrow(/25 km/i);
  });

  it('merges the same offering and mode and reprices on the slab', async () => {
    await service.addToCart(
      studentUser as never,
      3,
      30,
      ClassSessionDeliveryModeEnum.offline,
      3,
    );
    const cartDto = await service.addToCart(
      studentUser as never,
      3,
      30,
      ClassSessionDeliveryModeEnum.offline,
      2,
    );

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].catalogOfferingId).toBe(30);
    expect(cart.items[0].quantity).toBe(5);
    expect(cart.items[0].unitRateInr).toBe(900);
    expect(cartDto.totalInr).toBe(4500);
  });

  it('reprices when quantity is updated', async () => {
    cart.items = [
      {
        id: 11,
        deleted: false,
        tutorOfferingId: 80,
        deliveryMode: ClassSessionDeliveryModeEnum.offline,
        quantity: 2,
        unitRateInr: 1000,
        tutorOffering,
      },
    ];

    const updated = await service.updateCartItem(studentUser as never, 11, 11);

    expect(cart.items[0].quantity).toBe(11);
    expect(cart.items[0].unitRateInr).toBe(800);
    expect(updated.totalInr).toBe(8800);
  });

  it('creates an order, debits the wallet, fulfills credits, and clears the cart', async () => {
    cart.items = [
      {
        id: 11,
        deleted: false,
        tutorOfferingId: 80,
        deliveryMode: ClassSessionDeliveryModeEnum.offline,
        quantity: 2,
        unitRateInr: 1000,
        tutorOffering,
      },
    ];

    const result = await service.completePaidCart(studentUser as never);

    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'cart',
        lines: [
          expect.objectContaining({
            itemType: 'CLASS_BOOKING',
            quantity: 2,
            amountDueInr: 2000,
          }),
        ],
      }),
    );
    expect(debitPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        amountInr: 2000,
        commerceOrderId: 40,
        referenceType: WalletPurchaseReferenceTypeEnum.cart,
        referenceId: 5,
      }),
    );
    expect(fulfillPaidOrder).toHaveBeenCalledTimes(1);
    expect(generateInvoice).toHaveBeenCalledTimes(1);
    expect(itemDelete).toHaveBeenCalledWith({ cartId: 5 });
    expect(result.orderNumber).toBe('ORD-1');
    expect(emit).toHaveBeenCalledTimes(2);
    const studentMail = emit.mock.calls.find(
      (call) => call[0].audience === CommunicationAudience.STUDENT,
    )?.[0];
    const tutorMail = emit.mock.calls.find(
      (call) => call[0].audience === CommunicationAudience.TUTOR,
    )?.[0];
    expect(studentMail).toMatchObject({
      event: CommunicationEvent.CLASS_BOOKED,
      userId: 9,
      entityId: 40,
    });
    expect(studentMail.emailAttachments).toEqual([
      expect.objectContaining({
        filename: 'invoice-INV-1.pdf',
        contentType: 'application/pdf',
      }),
    ]);
    expect(studentMail.payload.linesHtml).toContain('Priya Sharma');
    expect(studentMail.payload.linesHtml).toContain('₹2,000');
    expect(tutorMail).toMatchObject({
      event: CommunicationEvent.CLASS_BOOKED,
      userId: 4,
    });
    expect(tutorMail.emailAttachments).toBeUndefined();
    expect(tutorMail.payload.linesHtml).toContain('Mathematics');
    expect(tutorMail.payload.linesHtml).not.toContain('₹');
  });

  it('leaves the cart intact when the wallet cannot cover the total', async () => {
    getWallet.mockResolvedValue({ balanceInr: 100 });
    cart.items = [
      {
        id: 11,
        deleted: false,
        tutorOfferingId: 80,
        deliveryMode: ClassSessionDeliveryModeEnum.offline,
        quantity: 2,
        unitRateInr: 1000,
        tutorOffering,
      },
    ];

    await expect(service.completePaidCart(studentUser as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(createOrder).not.toHaveBeenCalled();
    expect(debitPurchase).not.toHaveBeenCalled();
    expect(itemDelete).not.toHaveBeenCalled();
    expect(cart.items).toHaveLength(1);
  });

  it('books a free demo without charging the wallet', async () => {
    rateCard.freeDemoOffered = true;
    findOrder.mockResolvedValue({ id: 40, items: [{ id: 7 }] });

    const credit = await service.bookFreeDemo(
      studentUser as never,
      3,
      30,
      ClassSessionDeliveryModeEnum.online,
    );

    expect(credit.id).toBe(9);
    expect(debitPurchase).not.toHaveBeenCalled();
    expect(createOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          expect.objectContaining({
            unitRateInr: 0,
            amountDueInr: 0,
            quantity: 1,
            waiverApplied: true,
          }),
        ],
      }),
    );
    expect(issueDemoCredit).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: 21,
        catalogOfferingId: 30,
        deliveryMode: ClassSessionDeliveryModeEnum.online,
      }),
    );
  });

  it('refuses a second free demo for the same subject and tutor', async () => {
    rateCard.freeDemoOffered = true;
    hasActiveDemo.mockResolvedValue(true);

    await expect(
      service.bookFreeDemo(
        studentUser as never,
        3,
        30,
        ClassSessionDeliveryModeEnum.online,
      ),
    ).rejects.toThrow(/already booked a free demo/);
    expect(createOrder).not.toHaveBeenCalled();
  });
});
