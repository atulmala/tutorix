import { BadRequestException } from '@nestjs/common';
import { UserRole } from '../../auth/enums/user-role.enum';
import { WalletPurchaseReferenceTypeEnum } from '../../wallet/enums/wallet.enums';
import { ClassSessionDeliveryModeEnum } from '../../tutor-class-session/enums/class-session-delivery-mode.enum';
import { StudentCartService } from './student-cart.service';

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
      user: { firstName: 'Priya', lastName: 'Sharma' },
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
  };

  let findStudent: jest.Mock;
  let findRateCard: jest.Mock;
  let offeringFindOne: jest.Mock;
  let cartFindOne: jest.Mock;
  let itemSave: jest.Mock;
  let itemDelete: jest.Mock;
  let createOrder: jest.Mock;
  let debitPurchase: jest.Mock;
  let generateInvoice: jest.Mock;
  let fulfillPaidOrder: jest.Mock;
  let getWallet: jest.Mock;
  let cart: {
    id: number;
    studentId: number;
    items: Array<{
      id?: number;
      deleted?: boolean;
      tutorOfferingId: number;
      deliveryMode: ClassSessionDeliveryModeEnum;
      quantity: number;
      unitRateInr: number;
      tutorOffering?: typeof tutorOffering;
    }>;
  };
  let service: StudentCartService;

  beforeEach(() => {
    findStudent = jest.fn().mockResolvedValue({ id: 21, userId: 9 });
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
    debitPurchase = jest.fn().mockResolvedValue({ balanceInr: 100 });
    generateInvoice = jest.fn();
    fulfillPaidOrder = jest.fn();
    getWallet = jest.fn().mockResolvedValue({ balanceInr: 5000 });

    service = new StudentCartService(
      { findByUserId: findStudent } as never,
      { findByTutorOfferingId: findRateCard } as never,
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
        findById: jest.fn().mockResolvedValue({ id: 40, items: [] }),
      } as never,
      { generateForOrder: generateInvoice } as never,
      { fulfillPaidOrder } as never,
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
    );
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
});
