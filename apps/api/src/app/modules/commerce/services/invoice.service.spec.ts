import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Student } from '../../student/entities/student.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';
import { InvoiceEntity } from '../entities/invoice.entity';
import { InvoiceLineEntity } from '../entities/invoice-line.entity';
import { OrderEntity } from '../entities/order.entity';
import { OrderItemEntity } from '../entities/order-item.entity';
import {
  OrderItemReferenceTypeEnum,
  OrderItemTypeEnum,
  OrderPaymentMethodEnum,
  OrderPayerRoleEnum,
  OrderStatusEnum,
} from '../enums/commerce.enums';
import { InvoiceService } from './invoice.service';

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((input: unknown) => input),
  GetObjectCommand: jest.fn().mockImplementation((input: unknown) => input),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://example.com/signed-invoice.pdf'),
}));

function buildPaidOrder(overrides: Partial<OrderEntity> = {}): OrderEntity {
  const paidAt = new Date('2026-06-21T10:00:00Z');
  return {
    id: 42,
    orderNumber: 'TX260621ABC',
    userId: 10,
    payerRole: OrderPayerRoleEnum.student,
    status: OrderStatusEnum.paid,
    subtotalInr: 199,
    discountInr: 199,
    taxInr: 0,
    pointsValueInr: 0,
    amountDueInr: 0,
    amountPaidInr: 0,
    paymentMethod: OrderPaymentMethodEnum.waived,
    paidAt,
    items: [
      {
        id: 1,
        itemType: OrderItemTypeEnum.STUDENT_REGISTRATION,
        description: 'Student registration fee',
        quantity: 1,
        unitRateInr: 199,
        lineSubtotalInr: 199,
        discountInr: 199,
        waiverApplied: true,
        cgstInr: 0,
        sgstInr: 0,
        igstInr: 0,
        gstRatePercent: 0,
        referenceType: OrderItemReferenceTypeEnum.student,
        referenceId: 5,
      } as OrderItemEntity,
    ],
    ...overrides,
  } as OrderEntity;
}

describe('InvoiceService', () => {
  let service: InvoiceService;
  let invoiceRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
  };
  let invoiceLineRepo: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let savedInvoices: InvoiceEntity[];
  let savedLines: InvoiceLineEntity[];
  let invoiceIdCounter: number;

  beforeEach(() => {
    mockSend.mockReset();
    savedInvoices = [];
    savedLines = [];
    invoiceIdCounter = 1;

    invoiceRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data: Partial<InvoiceEntity>) => ({ ...data } as InvoiceEntity)),
      save: jest.fn(async (entity: InvoiceEntity) => {
        const saved = { ...entity, id: entity.id ?? invoiceIdCounter++ } as InvoiceEntity;
        const index = savedInvoices.findIndex((row) => row.id === saved.id);
        if (index >= 0) {
          savedInvoices[index] = saved;
        } else {
          savedInvoices.push(saved);
        }
        return saved;
      }),
    };

    invoiceLineRepo = {
      create: jest.fn((data: Partial<InvoiceLineEntity>) => ({ ...data } as InvoiceLineEntity)),
      save: jest.fn(async (entities: InvoiceLineEntity[]) => {
        const withIds = entities.map((line, index) =>
          ({ ...line, id: line.id ?? savedLines.length + index + 1 }) as InvoiceLineEntity,
        );
        savedLines.push(...withIds);
        return withIds;
      }),
    };

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'S3_DOCUMENTS_BUCKET') {
          return '';
        }
        if (key === 'AWS_REGION') {
          return 'us-east-1';
        }
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new InvoiceService(
      configService,
      invoiceRepo as unknown as Repository<InvoiceEntity>,
      invoiceLineRepo as unknown as Repository<InvoiceLineEntity>,
      {} as Repository<Student>,
      {} as Repository<Tutor>,
    );
  });

  describe('generateInvoiceNumber', () => {
    it('matches INV{FY}{MM}{hex} pattern', () => {
      const number = service.generateInvoiceNumber();
      expect(number).toMatch(/^INV20\d{2}\d{2}[0-9A-F]{4}$/);
    });
  });

  describe('generateForOrder', () => {
    it('creates invoice and lines mirroring order totals and items', async () => {
      const order = buildPaidOrder();

      const invoice = await service.generateForOrder(order);

      expect(invoice.orderId).toBe(42);
      expect(invoice.orderNumber).toBe('TX260621ABC');
      expect(invoice.subtotalInr).toBe(199);
      expect(invoice.discountInr).toBe(199);
      expect(invoice.amountDueInr).toBe(0);
      expect(invoice.paymentMethod).toBe(OrderPaymentMethodEnum.waived);
      expect(invoice.issuedAt).toEqual(order.paidAt);
      expect(invoice.lines).toHaveLength(1);
      expect(invoice.lines?.[0].description).toBe('Student registration fee');
      expect(invoice.lines?.[0].lineTotalInr).toBe(0);
      expect(savedInvoices).toHaveLength(1);
      expect(savedLines).toHaveLength(1);
    });

    it('computes lineTotalInr as max(0, subtotal - discount + gst components)', async () => {
      const order = buildPaidOrder({
        subtotalInr: 500,
        discountInr: 100,
        amountDueInr: 424,
        amountPaidInr: 424,
        paymentMethod: OrderPaymentMethodEnum.gateway,
        items: [
          {
            id: 2,
            itemType: OrderItemTypeEnum.TUTOR_REGISTRATION,
            description: 'Tutor registration fee',
            quantity: 1,
            unitRateInr: 500,
            lineSubtotalInr: 500,
            discountInr: 100,
            waiverApplied: false,
            cgstInr: 12,
            sgstInr: 12,
            igstInr: 0,
            gstRatePercent: 0,
            referenceType: OrderItemReferenceTypeEnum.tutor,
            referenceId: 7,
          } as OrderItemEntity,
        ],
      });

      const invoice = await service.generateForOrder(order);

      expect(invoice.lines?.[0].lineTotalInr).toBe(424);
    });

    it('returns existing invoice on second call (idempotency)', async () => {
      const order = buildPaidOrder();
      const existing = {
        id: 99,
        invoiceNumber: 'INV202606EXIST',
        orderId: 42,
        lines: [],
      } as InvoiceEntity;

      invoiceRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(existing);

      const first = await service.generateForOrder(order);
      const second = await service.generateForOrder(order);

      expect(first.invoiceNumber).toBeDefined();
      expect(second).toBe(existing);
      expect(invoiceRepo.save).toHaveBeenCalledTimes(1);
    });

    it('throws when order has no items', async () => {
      const order = buildPaidOrder({ items: [] });

      await expect(service.generateForOrder(order)).rejects.toThrow(
        'Order 42 has no items for invoice generation',
      );
    });

    it('defaults payment method to waived and issuedAt to now when missing', async () => {
      const order = buildPaidOrder({
        paymentMethod: undefined,
        paidAt: undefined,
      });

      const before = Date.now();
      const invoice = await service.generateForOrder(order);
      const after = Date.now();

      expect(invoice.paymentMethod).toBe(OrderPaymentMethodEnum.waived);
      expect(invoice.issuedAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(invoice.issuedAt.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('PDF upload', () => {
    it('skips pdfStorageKey when S3 bucket is not configured', async () => {
      const invoice = await service.generateForOrder(buildPaidOrder());

      expect(invoice.pdfStorageKey).toBeUndefined();
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('continues when PDF upload fails (invoice saved without pdfStorageKey)', async () => {
      const configService = {
        get: jest.fn((key: string) => {
          if (key === 'S3_DOCUMENTS_BUCKET') {
            return 'test-documents-bucket';
          }
          if (key === 'AWS_REGION') {
            return 'us-east-1';
          }
          return undefined;
        }),
      } as unknown as ConfigService;

      mockSend.mockRejectedValue(new Error('S3 upload failed'));

      const resilientService = new InvoiceService(
        configService,
        invoiceRepo as unknown as Repository<InvoiceEntity>,
        invoiceLineRepo as unknown as Repository<InvoiceLineEntity>,
        {} as Repository<Student>,
        {} as Repository<Tutor>,
      );

      const invoice = await resilientService.generateForOrder(buildPaidOrder());

      expect(invoice.invoiceNumber).toBeDefined();
      expect(invoice.pdfStorageKey).toBeUndefined();
      expect(savedInvoices).toHaveLength(1);
    });
  });

  describe('toSummaryDto', () => {
    it('returns pdfUrl undefined when pdfStorageKey is missing', async () => {
      const summary = await service.toSummaryDto({
        id: 1,
        invoiceNumber: 'INV202606ABC',
        orderNumber: 'TX260621ABC',
        amountDueInr: 0,
        amountPaidInr: 0,
        paymentMethod: OrderPaymentMethodEnum.waived,
        issuedAt: new Date('2026-06-21T00:00:00Z'),
      } as InvoiceEntity);

      expect(summary.pdfUrl).toBeUndefined();
    });
  });
});
