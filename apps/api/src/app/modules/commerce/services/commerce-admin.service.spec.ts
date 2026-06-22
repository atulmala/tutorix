import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { OrderEntity } from '../entities/order.entity';
import { PaymentAttemptEntity } from '../entities/payment-attempt.entity';
import {
  OrderPaymentMethodEnum,
  OrderPayerRoleEnum,
  OrderSourceEnum,
  OrderStatusEnum,
} from '../enums/commerce.enums';
import { CommerceAdminService } from './commerce-admin.service';
import { InvoiceService } from './invoice.service';
import { OrderService } from './order.service';

describe('CommerceAdminService', () => {
  const mockOrder = {
    id: 1,
    orderNumber: 'TX250615ABC',
    status: OrderStatusEnum.paid,
    paymentMethod: OrderPaymentMethodEnum.waived,
    payerRole: OrderPayerRoleEnum.tutor,
    source: OrderSourceEnum.onboarding,
    userId: 10,
    subtotalInr: 999,
    discountInr: 999,
    taxInr: 0,
    pointsRedeemed: 0,
    pointsValueInr: 0,
    amountDueInr: 0,
    amountPaidInr: 0,
    billingName: 'Test Tutor',
    billingEmail: 'tutor@example.com',
    billingPhone: '9999999999',
    paidAt: new Date('2026-06-15T10:00:00Z'),
    createdDate: new Date('2026-06-15T09:00:00Z'),
    items: [
      {
        id: 1,
        itemType: 'TUTOR_REGISTRATION',
        description: 'Tutor registration fee',
        quantity: 1,
        unitRateInr: 999,
        lineSubtotalInr: 999,
        discountInr: 999,
        waiverApplied: true,
        cgstInr: 0,
        sgstInr: 0,
        igstInr: 0,
        gstRatePercent: 0,
        referenceType: 'tutor',
        referenceId: 5,
        fulfillmentStatus: 'fulfilled',
      },
    ],
  } as OrderEntity;

  function buildQueryBuilder(rows: unknown[], totalCount = rows.length) {
    const qb = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(totalCount),
      getRawMany: jest.fn().mockResolvedValue(rows),
    };
    return qb;
  }

  it('maps list rows with payer display fields', async () => {
    const orderRepo = {
      createQueryBuilder: jest.fn(() =>
        buildQueryBuilder([
          {
            id: 1,
            orderNumber: 'TX250615ABC',
            status: OrderStatusEnum.paid,
            paymentMethod: OrderPaymentMethodEnum.waived,
            payerRole: OrderPayerRoleEnum.tutor,
            source: OrderSourceEnum.onboarding,
            userId: 10,
            subtotalInr: 999,
            discountInr: 999,
            amountDueInr: 0,
            amountPaidInr: 0,
            paidAt: new Date('2026-06-15T10:00:00Z'),
            createdDate: new Date('2026-06-15T09:00:00Z'),
            firstName: 'Test',
            lastName: 'Tutor',
            email: 'tutor@example.com',
          },
        ]),
      ),
    } as unknown as Repository<OrderEntity>;

    const orderService = {
      findById: jest.fn(),
      toDto: jest.fn(),
    } as unknown as OrderService;

    const service = new CommerceAdminService(
      orderRepo,
      {} as Repository<PaymentAttemptEntity>,
      {} as Repository<User>,
      orderService,
      {} as InvoiceService,
    );

    const result = await service.listOrders({
      paymentMethod: OrderPaymentMethodEnum.waived,
      page: 1,
      pageSize: 20,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].orderNumber).toBe('TX250615ABC');
    expect(result.items[0].payerName).toBe('Test Tutor');
    expect(result.items[0].amountDueInr).toBe(0);
  });

  it('throws when order detail is missing', async () => {
    const orderService = {
      findById: jest.fn().mockResolvedValue(null),
      toDto: jest.fn(),
    } as unknown as OrderService;

    const service = new CommerceAdminService(
      {} as Repository<OrderEntity>,
      {} as Repository<PaymentAttemptEntity>,
      {} as Repository<User>,
      orderService,
      {} as InvoiceService,
    );

    await expect(service.getOrderDetail(999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps order detail with invoice and payment attempts', async () => {
    const orderService = {
      findById: jest.fn().mockResolvedValue(mockOrder),
      toDto: jest.fn().mockReturnValue({
        id: 1,
        orderNumber: 'TX250615ABC',
        items: mockOrder.items,
      }),
    } as unknown as OrderService;

    const invoiceService = {
      findByOrderId: jest.fn().mockResolvedValue({ id: 7, invoiceNumber: 'INV202606ABC' }),
      toSummaryDto: jest.fn().mockResolvedValue({
        id: 7,
        invoiceNumber: 'INV202606ABC',
        orderNumber: 'TX250615ABC',
        amountDueInr: 0,
        amountPaidInr: 0,
        paymentMethod: OrderPaymentMethodEnum.waived,
        issuedAt: new Date('2026-06-15T10:00:00Z'),
        pdfUrl: 'https://example.com/invoice.pdf',
      }),
    } as unknown as InvoiceService;

    const userRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 10,
        firstName: 'Test',
        lastName: 'Tutor',
        email: 'tutor@example.com',
        mobile: '9999999999',
      }),
    } as unknown as Repository<User>;

    const paymentAttemptRepo = {
      find: jest.fn().mockResolvedValue([]),
    } as unknown as Repository<PaymentAttemptEntity>;

    const service = new CommerceAdminService(
      {} as Repository<OrderEntity>,
      paymentAttemptRepo,
      userRepo,
      orderService,
      invoiceService,
    );

    const detail = await service.getOrderDetail(1);

    expect(detail.orderNumber).toBe('TX250615ABC');
    expect(detail.payer.userId).toBe(10);
    expect(detail.items).toHaveLength(1);
    expect(detail.invoice?.invoiceNumber).toBe('INV202606ABC');
    expect(detail.paymentAttempts).toEqual([]);
  });
});
