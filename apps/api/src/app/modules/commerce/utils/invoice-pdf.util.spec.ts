import PDFDocument from 'pdfkit';
import {
  formatAddress,
  formatInr,
  invoiceShowsGst,
  pickPrimaryAddress,
  renderInvoicePdfContent,
  resolveInvoiceFontPath,
  SHOW_GST_ON_INVOICE,
} from './invoice-pdf.util';
import { AddressEntity } from '../../address/entities/address.entity';
import { InvoiceEntity } from '../entities/invoice.entity';
import { InvoiceLineEntity } from '../entities/invoice-line.entity';
import { OrderEntity } from '../entities/order.entity';
import { OrderPaymentMethodEnum } from '../enums/commerce.enums';

describe('invoice-pdf.util', () => {
  it('formats INR with rupee symbol', () => {
    expect(formatInr(199, '\u20B9')).toBe('\u20B9199');
  });

  it('falls back to Rs. prefix when font unavailable', () => {
    expect(formatInr(499, 'Rs. ')).toBe('Rs. 499');
  });

  it('prefers fullAddress when present', () => {
    expect(
      formatAddress({
        fullAddress: '12 MG Road, Bengaluru',
      } as AddressEntity),
    ).toBe('12 MG Road, Bengaluru');
  });

  it('picks primary address', () => {
    const primary = { primary: true, deleted: false, city: 'Delhi' } as AddressEntity;
    const other = { primary: false, deleted: false, city: 'Mumbai' } as AddressEntity;
    expect(pickPrimaryAddress([other, primary])?.city).toBe('Delhi');
  });

  it('hides GST on invoice PDF by default until registration', () => {
    expect(SHOW_GST_ON_INVOICE).toBe(false);
    expect(invoiceShowsGst()).toBe(false);
  });

  it('renders PDF without GST column or tax line', async () => {
    const invoice = {
      invoiceNumber: 'INV202606TEST',
      orderNumber: 'TX260621TEST',
      issuedAt: new Date('2026-06-21T00:00:00.000Z'),
      paymentMethod: OrderPaymentMethodEnum.waived,
      subtotalInr: 199,
      discountInr: 199,
      taxInr: 0,
      pointsValueInr: 0,
      amountDueInr: 0,
      amountPaidInr: 0,
      lines: [
        {
          description: 'Student registration fee',
          quantity: 1,
          unitRateInr: 199,
          discountInr: 199,
          waiverApplied: true,
          cgstInr: 0,
          sgstInr: 0,
          igstInr: 0,
          lineTotalInr: 0,
        } as InvoiceLineEntity,
      ],
    } as InvoiceEntity;

    const order = {
      billingName: 'Test User',
      billingEmail: 'test@example.com',
    } as OrderEntity;

    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50 });
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pdfDone = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    renderInvoicePdfContent(doc, invoice, order);
    doc.end();

    const pdfBuffer = await pdfDone;
    const pdfText = pdfBuffer.toString('latin1');
    expect(pdfText).not.toContain('GST');
    expect(pdfText).not.toMatch(/\bTax:/);
  });

  it('embeds rupee symbol in PDF when NotoSans font is available', async () => {
    if (!resolveInvoiceFontPath()) {
      return;
    }

    const invoice = {
      invoiceNumber: 'INV202606RUPEE',
      orderNumber: 'TX260621RUPEE',
      issuedAt: new Date('2026-06-21T00:00:00.000Z'),
      paymentMethod: OrderPaymentMethodEnum.gateway,
      subtotalInr: 199,
      discountInr: 40,
      taxInr: 0,
      pointsValueInr: 0,
      amountDueInr: 159,
      amountPaidInr: 159,
      lines: [
        {
          description: 'Tutor registration fee',
          quantity: 1,
          unitRateInr: 199,
          discountInr: 40,
          waiverApplied: false,
          cgstInr: 0,
          sgstInr: 0,
          igstInr: 0,
          lineTotalInr: 159,
        } as InvoiceLineEntity,
      ],
    } as InvoiceEntity;

    const order = { billingName: 'Test User' } as OrderEntity;
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ margin: 50 });
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pdfDone = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    renderInvoicePdfContent(doc, invoice, order);
    doc.end();

    const pdfBuffer = await pdfDone;
    expect(pdfBuffer.includes(Buffer.from('Subtotal:', 'utf8'))).toBe(true);
    expect(pdfBuffer.includes(Buffer.from('\u20B9199', 'utf8'))).toBe(true);
  });
});
