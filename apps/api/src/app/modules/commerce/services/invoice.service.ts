import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import PDFDocument from 'pdfkit';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { OrderEntity } from '../entities/order.entity';
import { InvoiceEntity } from '../entities/invoice.entity';
import { InvoiceLineEntity } from '../entities/invoice-line.entity';
import { OrderPaymentMethodEnum, OrderPayerRoleEnum } from '../enums/commerce.enums';
import { InvoiceSummaryDto } from '../dto/invoice-summary.dto';
import { Student } from '../../student/entities/student.entity';
import { Tutor } from '../../tutor/entities/tutor.entity';
import {
  formatAddress,
  pickPrimaryAddress,
  renderInvoicePdfContent,
} from '../utils/invoice-pdf.util';

const PDF_URL_EXPIRES_SEC = 3600;

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(InvoiceEntity)
    private readonly invoiceRepo: Repository<InvoiceEntity>,
    @InjectRepository(InvoiceLineEntity)
    private readonly invoiceLineRepo: Repository<InvoiceLineEntity>,
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    @InjectRepository(Tutor)
    private readonly tutorRepo: Repository<Tutor>,
  ) {
    const region =
      this.configService.get<string>('AWS_REGION') ||
      this.configService.get<string>('AWS_DEFAULT_REGION') ||
      'us-east-1';
    this.bucket =
      this.configService.get<string>('S3_DOCUMENTS_BUCKET') ||
      process.env.S3_DOCUMENTS_BUCKET ||
      '';
    this.s3 = new S3Client({ region });
  }

  generateInvoiceNumber(): string {
    const date = new Date();
    const fyStartYear =
      date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
    const suffix = randomBytes(2).toString('hex').toUpperCase();
    return `INV${fyStartYear}${String(date.getMonth() + 1).padStart(2, '0')}${suffix}`;
  }

  async findByOrderId(orderId: number): Promise<InvoiceEntity | null> {
    return this.invoiceRepo.findOne({
      where: { orderId, deleted: false },
      relations: ['lines'],
    });
  }

  async generateForOrder(order: OrderEntity): Promise<InvoiceEntity> {
    const existing = await this.findByOrderId(order.id);
    if (existing) {
      return existing;
    }

    if (!order.items?.length) {
      throw new Error(`Order ${order.id} has no items for invoice generation`);
    }

    const paymentMethod =
      order.paymentMethod ?? OrderPaymentMethodEnum.waived;
    const issuedAt = order.paidAt ?? new Date();

    const invoice = this.invoiceRepo.create({
      invoiceNumber: this.generateInvoiceNumber(),
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      subtotalInr: order.subtotalInr,
      discountInr: order.discountInr,
      taxInr: order.taxInr,
      pointsValueInr: order.pointsValueInr,
      amountDueInr: order.amountDueInr,
      amountPaidInr: order.amountPaidInr,
      paymentMethod,
      issuedAt,
    });
    const savedInvoice = await this.invoiceRepo.save(invoice);

    const lines = order.items.map((item) => {
      const lineTotalInr = Math.max(
        0,
        item.lineSubtotalInr - item.discountInr + item.cgstInr + item.sgstInr + item.igstInr,
      );
      return this.invoiceLineRepo.create({
        invoiceId: savedInvoice.id,
        itemType: item.itemType,
        description: item.description,
        quantity: item.quantity,
        unitRateInr: item.unitRateInr,
        discountInr: item.discountInr,
        waiverApplied: item.waiverApplied,
        cgstInr: item.cgstInr,
        sgstInr: item.sgstInr,
        igstInr: item.igstInr,
        gstRatePercent: item.gstRatePercent,
        lineTotalInr,
      });
    });
    savedInvoice.lines = await this.invoiceLineRepo.save(lines);

    try {
      const pdfKey = await this.renderAndUploadPdf(savedInvoice, order);
      savedInvoice.pdfStorageKey = pdfKey;
      await this.invoiceRepo.save(savedInvoice);
    } catch (error) {
      this.logger.warn(
        `Invoice PDF upload failed for order ${order.orderNumber}: ${error instanceof Error ? error.message : error}`,
      );
    }

    return savedInvoice;
  }

  private async renderAndUploadPdf(
    invoice: InvoiceEntity,
    order: OrderEntity,
  ): Promise<string | undefined> {
    if (!this.bucket) {
      return undefined;
    }

    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50 });
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pdfDone = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const billingAddress = await this.resolveBillingAddress(order);
    renderInvoicePdfContent(doc, invoice, order, billingAddress);

    doc.end();
    const pdfBuffer = await pdfDone;

    const storageKey = `invoices/${order.userId}/${invoice.invoiceNumber}.pdf`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      }),
    );
    return storageKey;
  }

  private async resolveBillingAddress(
    order: OrderEntity,
  ): Promise<string | undefined> {
    if (order.payerRole === OrderPayerRoleEnum.student) {
      const student = await this.studentRepo.findOne({
        where: { userId: order.userId, deleted: false },
        relations: ['addresses'],
      });
      return formatAddress(pickPrimaryAddress(student?.addresses));
    }

    if (order.payerRole === OrderPayerRoleEnum.tutor) {
      const tutor = await this.tutorRepo.findOne({
        where: { userId: order.userId, deleted: false },
        relations: ['addresses'],
      });
      return formatAddress(pickPrimaryAddress(tutor?.addresses));
    }

    return undefined;
  }

  async getPdfUrl(invoice: InvoiceEntity): Promise<string | undefined> {
    if (!invoice.pdfStorageKey || !this.bucket) {
      return undefined;
    }
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: invoice.pdfStorageKey,
      }),
      { expiresIn: PDF_URL_EXPIRES_SEC },
    );
  }

  async toSummaryDto(invoice: InvoiceEntity): Promise<InvoiceSummaryDto> {
    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      orderNumber: invoice.orderNumber,
      amountDueInr: invoice.amountDueInr,
      amountPaidInr: invoice.amountPaidInr,
      paymentMethod: invoice.paymentMethod,
      issuedAt: invoice.issuedAt,
      pdfUrl: await this.getPdfUrl(invoice),
    };
  }
}
