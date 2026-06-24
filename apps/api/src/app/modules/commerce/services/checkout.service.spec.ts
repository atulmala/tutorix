import { PlatformFeeCodeEnum } from '../../platform-fee/enums/platform-fee-code.enum';
import { PlatformFeeDiscountTypeEnum } from '../../platform-fee/enums/platform-fee-discount-type.enum';
import { PlatformFeeConfigEntity } from '../../platform-fee/entities/platform-fee-config.entity';
import { PlatformFeeService } from '../../platform-fee/services/platform-fee.service';
import { PaymentGatewayFactory } from '../../payment/services/payment-gateway.factory';
import { User } from '../../auth/entities/user.entity';
import {
  OrderItemReferenceTypeEnum,
  OrderItemTypeEnum,
  OrderPaymentMethodEnum,
  OrderPayerRoleEnum,
  OrderSourceEnum,
  OrderStatusEnum,
  PaymentAttemptStatusEnum,
} from '../enums/commerce.enums';
import { OrderEntity } from '../entities/order.entity';
import { PaymentAttemptEntity } from '../entities/payment-attempt.entity';
import { CheckoutService } from './checkout.service';
import { InvoiceService } from './invoice.service';
import { OrderFulfillmentService } from './order-fulfillment.service';
import { OrderPricingService } from './order-pricing.service';
import { OrderService } from './order.service';

describe('CheckoutService helpers', () => {
  it('maps tutor registration fee code to item type and payer role', () => {
    expect(CheckoutService.mapFeeCodeToItemType(PlatformFeeCodeEnum.TUTOR_REGISTRATION)).toBe(
      OrderItemTypeEnum.TUTOR_REGISTRATION,
    );
    expect(CheckoutService.mapFeeCodeToPayerRole(PlatformFeeCodeEnum.TUTOR_REGISTRATION)).toBe(
      OrderPayerRoleEnum.tutor,
    );
    expect(
      CheckoutService.mapContextTypeToReferenceType(
        'tutor' as never,
      ),
    ).toBe(OrderItemReferenceTypeEnum.tutor);
  });

  it('maps student registration fee code to student payer role', () => {
    expect(CheckoutService.mapFeeCodeToPayerRole(PlatformFeeCodeEnum.STUDENT_REGISTRATION)).toBe(
      OrderPayerRoleEnum.student,
    );
  });
});

describe('CheckoutService checkout flows', () => {
  const user = {
    id: 10,
    firstName: 'Test',
    lastName: 'Student',
    email: 'student@example.com',
    mobile: '9999999999',
  } as User;

  const waivedConfig = {
    code: PlatformFeeCodeEnum.STUDENT_REGISTRATION,
    displayName: 'Student registration fee',
    amountInr: 199,
    discountType: PlatformFeeDiscountTypeEnum.NONE,
    discountValue: 0,
    waived: true,
  } as PlatformFeeConfigEntity;

  const paidConfig = {
    code: PlatformFeeCodeEnum.TUTOR_REGISTRATION,
    displayName: 'Tutor registration fee',
    amountInr: 999,
    discountType: PlatformFeeDiscountTypeEnum.NONE,
    discountValue: 0,
    waived: false,
  } as PlatformFeeConfigEntity;

  let service: CheckoutService;
  let platformFeeService: {
    findByCode: jest.Mock;
    getDiscountAmountInr: jest.Mock;
    getEffectiveAmountInr: jest.Mock;
  };
  let orderService: {
    findPaidOrderByItemReference: jest.Mock;
    createOrderWithItems: jest.Mock;
    markOrderPaid: jest.Mock;
    markOrderPendingPayment: jest.Mock;
    markOrderFailed: jest.Mock;
    findById: jest.Mock;
    toDto: jest.Mock;
  };
  let orderFulfillmentService: {
    fulfillOrderItems: jest.Mock;
  };
  let invoiceService: {
    generateForOrder: jest.Mock;
  };
  let paymentAttemptRepo: {
    save: jest.Mock;
    create: jest.Mock;
    findOne: jest.Mock;
  };
  let paymentGatewayFactory: { getActiveGateway: jest.Mock };

  beforeEach(() => {
    platformFeeService = {
      findByCode: jest.fn(),
      getDiscountAmountInr: jest.fn(() => 0),
      getEffectiveAmountInr: jest.fn((config: PlatformFeeConfigEntity) =>
        config.waived ? 0 : config.amountInr,
      ),
    };
    orderService = {
      findPaidOrderByItemReference: jest.fn().mockResolvedValue(null),
      createOrderWithItems: jest.fn(),
      markOrderPaid: jest.fn(async (order: OrderEntity, paymentMethod, amountPaidInr) =>
        Object.assign(order, {
          status: OrderStatusEnum.paid,
          paymentMethod,
          amountPaidInr,
          paidAt: new Date('2026-06-21T10:00:00Z'),
        }),
      ),
      markOrderPendingPayment: jest.fn(async (order: OrderEntity) =>
        Object.assign(order, { status: OrderStatusEnum.pending_payment }),
      ),
      markOrderFailed: jest.fn(async (order: OrderEntity) =>
        Object.assign(order, { status: OrderStatusEnum.failed }),
      ),
      findById: jest.fn(),
      toDto: jest.fn((order: OrderEntity) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        amountDueInr: order.amountDueInr,
        amountPaidInr: order.amountPaidInr,
        paymentMethod: order.paymentMethod,
        paidAt: order.paidAt,
      })),
    };
    orderFulfillmentService = {
      fulfillOrderItems: jest.fn().mockResolvedValue(undefined),
    };
    invoiceService = {
      generateForOrder: jest.fn().mockResolvedValue({ id: 7, invoiceNumber: 'INV202606ABC' }),
    };
    paymentAttemptRepo = {
      save: jest.fn(async (entity) => ({ id: 1, ...entity })),
      create: jest.fn((entity) => entity),
      findOne: jest.fn(),
    };
    paymentGatewayFactory = {
      getActiveGateway: jest.fn().mockReturnValue({
        provider: 'razorpay',
        createOrder: jest.fn().mockResolvedValue({
          provider: 'razorpay',
          orderId: 'order_test123',
          amountInr: 999,
          currency: 'INR',
          checkoutPayload: { key: 'test' },
        }),
      }),
    };

    service = new CheckoutService(
      platformFeeService as unknown as PlatformFeeService,
      new OrderPricingService(platformFeeService as unknown as PlatformFeeService),
      orderService as unknown as OrderService,
      orderFulfillmentService as unknown as OrderFulfillmentService,
      invoiceService as unknown as InvoiceService,
      paymentGatewayFactory as unknown as PaymentGatewayFactory,
      paymentAttemptRepo as never,
    );
  });

  it('waived checkout creates paid order, fulfills, and generates invoice without gateway attempt', async () => {
    platformFeeService.findByCode.mockResolvedValue(waivedConfig);
    const createdOrder = {
      id: 42,
      orderNumber: 'TX260621ABC',
      userId: 10,
      status: OrderStatusEnum.paid,
      amountDueInr: 0,
      items: [{ itemType: OrderItemTypeEnum.STUDENT_REGISTRATION }],
    } as OrderEntity;
    orderService.createOrderWithItems.mockResolvedValue(createdOrder);

    const result = await service.initiatePlatformFeeCheckout({
      feeCode: PlatformFeeCodeEnum.STUDENT_REGISTRATION,
      user,
      payerRole: OrderPayerRoleEnum.student,
      referenceType: OrderItemReferenceTypeEnum.student,
      referenceId: 5,
    });

    expect(orderService.createOrderWithItems).toHaveBeenCalledWith(
      expect.objectContaining({
        initialStatus: OrderStatusEnum.paid,
        payerRole: OrderPayerRoleEnum.student,
        source: OrderSourceEnum.onboarding,
      }),
    );
    expect(orderService.markOrderPaid).toHaveBeenCalledWith(
      createdOrder,
      OrderPaymentMethodEnum.waived,
      0,
    );
    expect(orderFulfillmentService.fulfillOrderItems).toHaveBeenCalledWith(
      42,
      10,
      waivedConfig,
      0,
    );
    expect(invoiceService.generateForOrder).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: OrderPaymentMethodEnum.waived }),
    );
    expect(paymentAttemptRepo.save).not.toHaveBeenCalled();
    expect(result.session.skipped).toBe(true);
  });

  it('returns existing paid order without generating a new invoice', async () => {
    platformFeeService.findByCode.mockResolvedValue(waivedConfig);
    const existingOrder = {
      id: 99,
      orderNumber: 'TX260621OLD',
      status: OrderStatusEnum.paid,
      amountDueInr: 0,
    } as OrderEntity;
    orderService.findPaidOrderByItemReference.mockResolvedValue(existingOrder);

    const result = await service.initiatePlatformFeeCheckout({
      feeCode: PlatformFeeCodeEnum.STUDENT_REGISTRATION,
      user,
      payerRole: OrderPayerRoleEnum.student,
      referenceType: OrderItemReferenceTypeEnum.student,
      referenceId: 5,
    });

    expect(orderService.createOrderWithItems).not.toHaveBeenCalled();
    expect(invoiceService.generateForOrder).not.toHaveBeenCalled();
    expect(result.order.orderNumber).toBe('TX260621OLD');
    expect(result.session.skipped).toBe(true);
  });

  it('paid checkout creates pending order and payment attempt', async () => {
    platformFeeService.findByCode.mockResolvedValue(paidConfig);
    const createdOrder = {
      id: 43,
      orderNumber: 'TX260621DEF',
      amountDueInr: 999,
      items: [{ itemType: OrderItemTypeEnum.TUTOR_REGISTRATION }],
    } as OrderEntity;
    orderService.createOrderWithItems.mockResolvedValue(createdOrder);

    const result = await service.initiatePlatformFeeCheckout({
      feeCode: PlatformFeeCodeEnum.TUTOR_REGISTRATION,
      user,
      payerRole: OrderPayerRoleEnum.tutor,
      referenceType: OrderItemReferenceTypeEnum.tutor,
      referenceId: 7,
    });

    expect(orderService.createOrderWithItems).toHaveBeenCalledWith(
      expect.objectContaining({ initialStatus: OrderStatusEnum.pending_payment }),
    );
    expect(orderService.markOrderPendingPayment).toHaveBeenCalled();
    expect(paymentAttemptRepo.save).toHaveBeenCalled();
    expect(invoiceService.generateForOrder).not.toHaveBeenCalled();
    expect(result.session.skipped).toBe(false);
    expect(result.session.orderId).toBe('order_test123');
  });

  it('completePaidOrderFromGateway marks attempt paid, fulfills, and generates invoice', async () => {
    const pendingAttempt = {
      id: 1,
      orderId: 43,
      gatewayOrderId: 'order_test123',
      status: PaymentAttemptStatusEnum.pending,
    } as PaymentAttemptEntity;
    paymentAttemptRepo.findOne.mockResolvedValue(pendingAttempt);

    const pendingOrder = {
      id: 43,
      orderNumber: 'TX260621DEF',
      status: OrderStatusEnum.pending_payment,
      items: [{ itemType: OrderItemTypeEnum.TUTOR_REGISTRATION }],
    } as OrderEntity;
    const paidOrder = {
      ...pendingOrder,
      status: OrderStatusEnum.paid,
      paymentMethod: OrderPaymentMethodEnum.gateway,
      amountPaidInr: 999,
    } as OrderEntity;

    orderService.findById
      .mockResolvedValueOnce(pendingOrder)
      .mockResolvedValueOnce(Object.assign(paidOrder, { items: pendingOrder.items }));

    const result = await service.completePaidOrderFromGateway(
      'order_test123',
      'pay_test456',
      paidConfig,
      10,
      999,
    );

    expect(orderService.markOrderPaid).toHaveBeenCalledWith(
      pendingOrder,
      OrderPaymentMethodEnum.gateway,
      999,
    );
    expect(orderFulfillmentService.fulfillOrderItems).toHaveBeenCalledWith(
      43,
      10,
      paidConfig,
      999,
    );
    expect(invoiceService.generateForOrder).toHaveBeenCalled();
    expect(result?.status).toBe(OrderStatusEnum.paid);
  });

  it('completePaidOrderFromGateway is idempotent when order is already paid', async () => {
    paymentAttemptRepo.findOne.mockResolvedValue({
      id: 1,
      orderId: 43,
      gatewayOrderId: 'order_test123',
      status: PaymentAttemptStatusEnum.pending,
    });
    orderService.findById.mockResolvedValue({
      id: 43,
      status: OrderStatusEnum.paid,
    } as OrderEntity);

    await service.completePaidOrderFromGateway(
      'order_test123',
      'pay_test456',
      paidConfig,
      10,
      999,
    );

    expect(orderService.markOrderPaid).not.toHaveBeenCalled();
    expect(invoiceService.generateForOrder).not.toHaveBeenCalled();
  });

  it('markPaymentAttemptFailed does not generate invoice', async () => {
    paymentAttemptRepo.findOne.mockResolvedValue({
      id: 1,
      orderId: 43,
      gatewayOrderId: 'order_test123',
      status: PaymentAttemptStatusEnum.pending,
    });
    orderService.findById.mockResolvedValue({
      id: 43,
      status: OrderStatusEnum.pending_payment,
    } as OrderEntity);

    await service.markPaymentAttemptFailed('order_test123');

    expect(orderService.markOrderFailed).toHaveBeenCalled();
    expect(invoiceService.generateForOrder).not.toHaveBeenCalled();
  });

  it('waived PT fee checkout generates invoice with tutor_offering reference', async () => {
    const ptConfig = {
      code: PlatformFeeCodeEnum.PROFICIENCY_TEST,
      displayName: 'Proficiency test fee',
      amountInr: 99,
      discountType: PlatformFeeDiscountTypeEnum.NONE,
      discountValue: 0,
      waived: true,
    } as PlatformFeeConfigEntity;
    platformFeeService.findByCode.mockResolvedValue(ptConfig);
    const createdOrder = {
      id: 44,
      orderNumber: 'TX260621PT1',
      userId: 10,
      status: OrderStatusEnum.paid,
      amountDueInr: 0,
      items: [{ itemType: OrderItemTypeEnum.PROFICIENCY_TEST }],
    } as OrderEntity;
    orderService.createOrderWithItems.mockResolvedValue(createdOrder);

    await service.initiatePlatformFeeCheckout({
      feeCode: PlatformFeeCodeEnum.PROFICIENCY_TEST,
      user,
      payerRole: OrderPayerRoleEnum.tutor,
      referenceType: OrderItemReferenceTypeEnum.tutor_offering,
      referenceId: 12,
    });

    expect(orderService.createOrderWithItems).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          expect.objectContaining({
            itemType: OrderItemTypeEnum.PROFICIENCY_TEST,
            referenceType: OrderItemReferenceTypeEnum.tutor_offering,
            referenceId: 12,
          }),
        ],
      }),
    );
    expect(invoiceService.generateForOrder).toHaveBeenCalled();
  });
});
