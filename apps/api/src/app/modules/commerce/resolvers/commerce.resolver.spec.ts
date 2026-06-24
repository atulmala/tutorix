import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from '../../auth/entities/user.entity';
import {
  OrderPaymentMethodEnum,
  OrderStatusEnum,
} from '../enums/commerce.enums';
import { OrderEntity } from '../entities/order.entity';
import { CommerceResolver } from './commerce.resolver';
import { InvoiceService } from '../services/invoice.service';
import { OrderService } from '../services/order.service';

describe('CommerceResolver', () => {
  let resolver: CommerceResolver;
  let orderService: {
    findByIdForUser: jest.Mock;
    toDto: jest.Mock;
  };
  let invoiceService: {
    findByOrderId: jest.Mock;
    toSummaryDto: jest.Mock;
  };

  const user = { id: 10 } as User;
  const paidOrder = {
    id: 42,
    userId: 10,
    orderNumber: 'TX260621ABC',
    status: OrderStatusEnum.paid,
  } as OrderEntity;

  beforeEach(async () => {
    orderService = {
      findByIdForUser: jest.fn(),
      toDto: jest.fn().mockReturnValue({ id: 42, orderNumber: 'TX260621ABC' }),
    };
    invoiceService = {
      findByOrderId: jest.fn(),
      toSummaryDto: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommerceResolver,
        { provide: OrderService, useValue: orderService },
        { provide: InvoiceService, useValue: invoiceService },
      ],
    }).compile();

    resolver = module.get(CommerceResolver);
  });

  describe('myOrder', () => {
    it('returns order dto for the current user', async () => {
      orderService.findByIdForUser.mockResolvedValue(paidOrder);

      const result = await resolver.myOrder(user, 42);

      expect(orderService.findByIdForUser).toHaveBeenCalledWith(42, 10);
      expect(result.orderNumber).toBe('TX260621ABC');
    });

    it('throws NotFoundException when order is missing', async () => {
      orderService.findByIdForUser.mockResolvedValue(null);

      await expect(resolver.myOrder(user, 999)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('myOrderInvoice', () => {
    it('returns invoice summary for own paid order', async () => {
      orderService.findByIdForUser.mockResolvedValue(paidOrder);
      invoiceService.findByOrderId.mockResolvedValue({
        id: 7,
        invoiceNumber: 'INV202606ABC',
      });
      invoiceService.toSummaryDto.mockResolvedValue({
        id: 7,
        invoiceNumber: 'INV202606ABC',
        orderNumber: 'TX260621ABC',
        amountDueInr: 0,
        amountPaidInr: 0,
        paymentMethod: OrderPaymentMethodEnum.waived,
        issuedAt: new Date('2026-06-21T00:00:00Z'),
        pdfUrl: 'https://example.com/invoice.pdf',
      });

      const result = await resolver.myOrderInvoice(user, 42);

      expect(result?.invoiceNumber).toBe('INV202606ABC');
      expect(result?.pdfUrl).toBe('https://example.com/invoice.pdf');
    });

    it('returns null when order belongs to another user', async () => {
      orderService.findByIdForUser.mockResolvedValue(null);

      const result = await resolver.myOrderInvoice(user, 99);

      expect(result).toBeNull();
      expect(invoiceService.findByOrderId).not.toHaveBeenCalled();
    });

    it('returns null when order exists but invoice is not generated yet', async () => {
      orderService.findByIdForUser.mockResolvedValue({
        ...paidOrder,
        status: OrderStatusEnum.pending_payment,
      });
      invoiceService.findByOrderId.mockResolvedValue(null);

      const result = await resolver.myOrderInvoice(user, 42);

      expect(result).toBeNull();
    });
  });
});
