import { existsSync } from 'fs';
import { join } from 'path';
import PDFDocument from 'pdfkit';
import { AddressEntity } from '../../address/entities/address.entity';
import { InvoiceEntity } from '../entities/invoice.entity';
import { InvoiceLineEntity } from '../entities/invoice-line.entity';
import { OrderEntity } from '../entities/order.entity';
import { OrderPaymentMethodEnum } from '../enums/commerce.enums';

/** Flip to true when Tutorix is GST-registered and tax breakup should appear on PDFs. */
export const SHOW_GST_ON_INVOICE = false;

export function invoiceShowsGst(): boolean {
  return SHOW_GST_ON_INVOICE;
}

const INVOICE_FONT = 'InvoiceRegular';
const PAGE_LEFT = 50;
const PAGE_RIGHT = 562;
const TABLE_WIDTH = PAGE_RIGHT - PAGE_LEFT;

const TABLE_COLUMNS_WITHOUT_GST = {
  sno: { x: PAGE_LEFT, w: 22 },
  details: { x: PAGE_LEFT + 24, w: 170 },
  rate: { x: PAGE_LEFT + 196, w: 50 },
  qty: { x: PAGE_LEFT + 248, w: 28 },
  discount: { x: PAGE_LEFT + 278, w: 80 },
  total: { x: PAGE_LEFT + 360, w: TABLE_WIDTH - 360 },
} as const;

const TABLE_COLUMNS_WITH_GST = {
  sno: { x: PAGE_LEFT, w: 22 },
  details: { x: PAGE_LEFT + 24, w: 148 },
  rate: { x: PAGE_LEFT + 174, w: 48 },
  qty: { x: PAGE_LEFT + 224, w: 28 },
  discount: { x: PAGE_LEFT + 254, w: 72 },
  gst: { x: PAGE_LEFT + 328, w: 44 },
  total: { x: PAGE_LEFT + 374, w: TABLE_WIDTH - 374 },
} as const;

function tableColumns() {
  return SHOW_GST_ON_INVOICE ? TABLE_COLUMNS_WITH_GST : TABLE_COLUMNS_WITHOUT_GST;
}

export function resolveInvoiceFontPath(): string | undefined {
  const candidates = [
    join(__dirname, 'assets', 'fonts', 'NotoSans-Regular.ttf'),
    join(process.cwd(), 'apps/api/src/assets/fonts/NotoSans-Regular.ttf'),
    join(process.cwd(), 'dist/apps/api/assets/fonts/NotoSans-Regular.ttf'),
  ];
  return candidates.find((path) => existsSync(path));
}

export function registerInvoiceFont(doc: InstanceType<typeof PDFDocument>): string {
  const fontPath = resolveInvoiceFontPath();
  if (fontPath) {
    doc.registerFont(INVOICE_FONT, fontPath);
    return '\u20B9';
  }
  return 'Rs. ';
}

export function formatInr(amount: number, rupeePrefix: string): string {
  if (rupeePrefix === '\u20B9') {
    return `${rupeePrefix}${amount}`;
  }
  return `${rupeePrefix}${amount}`;
}

export function pickPrimaryAddress(
  addresses?: AddressEntity[] | null,
): AddressEntity | undefined {
  if (!addresses?.length) {
    return undefined;
  }
  return addresses.find((a) => a.primary && !a.deleted) ?? addresses[0];
}

export function formatAddress(address?: AddressEntity | null): string | undefined {
  if (!address) {
    return undefined;
  }
  if (address.fullAddress?.trim()) {
    return address.fullAddress.trim();
  }
  const parts = [
    address.street,
    address.subArea,
    address.landmark,
    address.city,
    address.state,
    address.postalCode ? String(address.postalCode) : undefined,
    address.country,
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

export function paymentMethodLabel(method: OrderPaymentMethodEnum): string {
  switch (method) {
    case OrderPaymentMethodEnum.waived:
      return 'Waived — no payment required';
    case OrderPaymentMethodEnum.gateway:
      return 'Online payment';
    case OrderPaymentMethodEnum.points:
      return 'Tutorix points';
    case OrderPaymentMethodEnum.mixed:
      return 'Mixed (gateway + points)';
    default:
      return method;
  }
}

function drawTableHeader(doc: InstanceType<typeof PDFDocument>, y: number): number {
  const cols = tableColumns();
  doc.fontSize(8).fillColor('#333333');
  doc.rect(PAGE_LEFT, y, TABLE_WIDTH, 18).fill('#f3f4f6');
  doc.fillColor('#111111');

  const headerY = y + 5;
  doc.text('S No', cols.sno.x + 2, headerY, { width: cols.sno.w });
  doc.text('Details', cols.details.x + 2, headerY, { width: cols.details.w });
  doc.text('Rate', cols.rate.x, headerY, {
    width: cols.rate.w,
    align: 'right',
  });
  doc.text('Qty', cols.qty.x, headerY, {
    width: cols.qty.w,
    align: 'right',
  });
  doc.text('Line Discount', cols.discount.x, headerY, {
    width: cols.discount.w,
    align: 'right',
  });
  if (SHOW_GST_ON_INVOICE && 'gst' in cols) {
    doc.text('GST', cols.gst.x, headerY, {
      width: cols.gst.w,
      align: 'right',
    });
  }
  doc.text('Line Total', cols.total.x, headerY, {
    width: cols.total.w,
    align: 'right',
  });

  const bottom = y + 18;
  doc
    .moveTo(PAGE_LEFT, bottom)
    .lineTo(PAGE_RIGHT, bottom)
    .strokeColor('#cccccc')
    .stroke();
  return bottom + 4;
}

function drawTableRow(
  doc: InstanceType<typeof PDFDocument>,
  line: InvoiceLineEntity,
  index: number,
  y: number,
  rupeePrefix: string,
): number {
  const cols = tableColumns();
  const gstInr = line.cgstInr + line.sgstInr + line.igstInr;
  const discountLabel =
    line.discountInr > 0
      ? `${formatInr(line.discountInr, rupeePrefix)}${line.waiverApplied ? ' (waiver)' : ''}`
      : formatInr(0, rupeePrefix);

  doc.fontSize(8);
  const detailsHeight = doc.heightOfString(line.description, {
    width: cols.details.w - 4,
  });
  const rowHeight = Math.max(16, detailsHeight + 6);

  doc.text(String(index + 1), cols.sno.x + 2, y, { width: cols.sno.w });
  doc.text(line.description, cols.details.x + 2, y, {
    width: cols.details.w - 4,
  });
  doc.text(formatInr(line.unitRateInr, rupeePrefix), cols.rate.x, y, {
    width: cols.rate.w,
    align: 'right',
  });
  doc.text(String(line.quantity), cols.qty.x, y, {
    width: cols.qty.w,
    align: 'right',
  });
  doc.text(discountLabel, cols.discount.x, y, {
    width: cols.discount.w,
    align: 'right',
  });
  if (SHOW_GST_ON_INVOICE && 'gst' in cols) {
    doc.text(formatInr(gstInr, rupeePrefix), cols.gst.x, y, {
      width: cols.gst.w,
      align: 'right',
    });
  }
  doc.text(formatInr(line.lineTotalInr, rupeePrefix), cols.total.x, y, {
    width: cols.total.w,
    align: 'right',
  });

  const bottom = y + rowHeight;
  doc
    .moveTo(PAGE_LEFT, bottom)
    .lineTo(PAGE_RIGHT, bottom)
    .strokeColor('#eeeeee')
    .stroke();
  return bottom + 2;
}

export function renderInvoicePdfContent(
  doc: InstanceType<typeof PDFDocument>,
  invoice: InvoiceEntity,
  order: OrderEntity,
  billingAddress?: string,
): void {
  const rupeePrefix = registerInvoiceFont(doc);

  doc.fontSize(20).text('Tutorix Invoice', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10);
  doc.text(`Invoice number: ${invoice.invoiceNumber}`);
  doc.text(`Order number: ${invoice.orderNumber}`);
  doc.text(`Issued: ${invoice.issuedAt.toISOString().slice(0, 10)}`);
  doc.text(`Payment mode: ${paymentMethodLabel(invoice.paymentMethod)}`);
  doc.moveDown();

  doc.fontSize(11).text('Bill to', { underline: true });
  doc.fontSize(10);
  if (order.billingName) {
    doc.text(order.billingName);
  }
  if (order.billingEmail) {
    doc.text(`Email: ${order.billingEmail}`);
  }
  if (order.billingPhone) {
    doc.text(`Phone: ${order.billingPhone}`);
  }
  if (billingAddress) {
    doc.text(`Address: ${billingAddress}`);
  } else if (order.billingStateCode) {
    doc.text(`State: ${order.billingStateCode}`);
  }
  doc.moveDown();

  doc.fontSize(11).text('Terms & details', { underline: true });
  doc.moveDown(0.5);

  let tableY = drawTableHeader(doc, doc.y);
  for (const [index, line] of (invoice.lines ?? []).entries()) {
    tableY = drawTableRow(doc, line, index, tableY, rupeePrefix);
    doc.y = tableY;
  }

  doc.moveDown();
  doc.fontSize(10);
  const totalsX = PAGE_LEFT + 320;
  const totalsW = TABLE_WIDTH - 320;
  doc.text(`Subtotal: ${formatInr(invoice.subtotalInr, rupeePrefix)}`, totalsX, doc.y, {
    width: totalsW,
    align: 'right',
  });
  doc.text(`Discount: ${formatInr(invoice.discountInr, rupeePrefix)}`, totalsX, undefined, {
    width: totalsW,
    align: 'right',
  });
  if (SHOW_GST_ON_INVOICE) {
    doc.text(`Tax: ${formatInr(invoice.taxInr, rupeePrefix)}`, totalsX, undefined, {
      width: totalsW,
      align: 'right',
    });
  }
  if (invoice.pointsValueInr > 0) {
    doc.text(
      `Points redeemed: ${formatInr(invoice.pointsValueInr, rupeePrefix)}`,
      totalsX,
      undefined,
      { width: totalsW, align: 'right' },
    );
  }
  doc.fontSize(12).text(
    `Net payable: ${formatInr(invoice.amountDueInr, rupeePrefix)}`,
    totalsX,
    undefined,
    { width: totalsW, align: 'right', underline: true },
  );
  doc.text(
    `Amount paid: ${formatInr(invoice.amountPaidInr, rupeePrefix)}`,
    totalsX,
    undefined,
    { width: totalsW, align: 'right' },
  );
}
