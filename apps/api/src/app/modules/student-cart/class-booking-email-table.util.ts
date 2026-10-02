import { escapeHtml } from '../communication/email/email.utils';

export type ClassBookingEmailLine = {
  tutorName: string;
  offeringLabel: string;
  deliveryMode: string;
  classCount: number;
  lineAmountInr: number;
  isDemo?: boolean;
};

export type ClassScheduleEmailRow = {
  counterpartLabel: string;
  counterpartName: string;
  offeringLabel: string;
  deliveryMode: string;
  classTime: string;
};

const CELL =
  'border:1px solid #e5e7eb;padding:8px 10px;text-align:left;font-size:14px;';
const HEADER = `${CELL}background:#f3f4f6;font-weight:600;`;

export function formatInrAmount(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export function formatBookingAmount(amount: number, isDemo = false): string {
  const formatted = formatInrAmount(amount);
  return isDemo ? `${formatted} (free demo)` : formatted;
}

export function deliveryModeLabel(mode: string): string {
  return mode === 'online' ? 'Online' : 'Offline';
}

export function buildClassBookingTable(
  lines: ClassBookingEmailLine[],
  options: { includeAmount: boolean },
): { html: string; text: string } {
  const headers = options.includeAmount
    ? ['Tutor', 'Subject', 'Mode', 'Classes', 'Amount']
    : ['Subject', 'Mode', 'Classes'];
  const rows = lines.map((line) => {
    const cells = options.includeAmount
      ? [
          line.tutorName,
          line.offeringLabel,
          deliveryModeLabel(line.deliveryMode),
          String(line.classCount),
          formatInrAmount(line.lineAmountInr),
        ]
      : [
          line.offeringLabel,
          deliveryModeLabel(line.deliveryMode),
          String(line.classCount),
        ];
    return cells;
  });
  return renderTable(headers, rows);
}

export type TutorBookingBatchRow = {
  offeringLabel: string;
  studentName: string;
  classCount: number;
  deliveryMode: string;
  amountInr: number;
  isDemo?: boolean;
};

export type TutorScheduleBatchRow = {
  studentName: string;
  offeringLabel: string;
  deliveryMode: string;
  classTime: string;
};

/** One row per booking, plus a total of the amount paid. */
export function buildTutorBookingBatchTable(
  rows: TutorBookingBatchRow[],
): { html: string; text: string; totalInr: number } {
  const totalInr = rows.reduce((sum, row) => sum + row.amountInr, 0);
  const body = rows.map((row) => [
    row.offeringLabel,
    row.studentName,
    String(row.classCount),
    deliveryModeLabel(row.deliveryMode),
    formatBookingAmount(row.amountInr, row.isDemo === true),
  ]);
  const rendered = renderTable(
    ['Offering', 'Student', 'Classes', 'Online/Offline', 'Amount'],
    body,
    ['Total', '', '', '', formatInrAmount(totalInr)],
  );
  return { ...rendered, totalInr };
}

/** One row per student slot. */
export function buildTutorScheduleBatchTable(rows: TutorScheduleBatchRow[]): {
  html: string;
  text: string;
} {
  return renderTable(
    ['Student', 'Offering', 'Online/Offline', 'Timing'],
    rows.map((row) => [
      row.studentName,
      row.offeringLabel,
      deliveryModeLabel(row.deliveryMode),
      row.classTime,
    ]),
  );
}

export function buildClassScheduleTable(row: ClassScheduleEmailRow): {
  html: string;
  text: string;
} {
  return renderTable(
    [row.counterpartLabel, 'Subject', 'Mode', 'When'],
    [
      [
        row.counterpartName,
        row.offeringLabel,
        deliveryModeLabel(row.deliveryMode),
        row.classTime,
      ],
    ],
  );
}

function renderTable(
  headers: string[],
  rows: string[][],
  footer?: string[],
): { html: string; text: string } {
  const head = headers
    .map((header) => `<th style="${HEADER}">${escapeHtml(header)}</th>`)
    .join('');
  const body = rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td style="${CELL}">${escapeHtml(cell)}</td>`)
          .join('')}</tr>`,
    )
    .join('');
  const foot = footer
    ? `<tfoot><tr>${footer
        .map((cell) => `<td style="${HEADER}">${escapeHtml(cell)}</td>`)
        .join('')}</tr></tfoot>`
    : '';
  const html = `<table style="border-collapse:collapse;width:100%;margin:16px 0;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table>`;
  const textLines = [headers.join(' | '), ...rows.map((row) => row.join(' | '))];
  if (footer) {
    textLines.push(footer.join(' | '));
  }
  return { html, text: textLines.join('\n') };
}
