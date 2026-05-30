import React from 'react';
import { formatGstDisplay } from '@tutorix/shared-utils';
import type { TutorDetailRecord } from './types';

type BankDetailsSectionProps = {
  mode: 'admin' | 'tutor';
  bankDetails?: NonNullable<TutorDetailRecord['user']>['bankDetails'];
  onEnterOrEdit?: () => void;
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border border-teal-100 bg-teal-50/50 px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-teal-800/80">
        {label}
      </dt>
      <dd className="text-sm font-medium text-teal-950">{value}</dd>
    </div>
  );
}

export function BankDetailsSection({
  mode,
  bankDetails,
  onEnterOrEdit,
}: BankDetailsSectionProps) {
  const isAdmin = mode === 'admin';
  const isComplete = Boolean(bankDetails?.isComplete);
  const gstDisplay = formatGstDisplay(bankDetails?.gstNumber);

  return (
    <section className="overflow-hidden rounded-2xl border border-teal-200/90 bg-gradient-to-b from-teal-50/30 to-white shadow-md shadow-teal-100/40">
      <div className="flex items-center justify-between gap-3 border-b border-teal-100 bg-gradient-to-r from-teal-100 via-teal-50 to-white px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-8 w-1 shrink-0 rounded-full bg-teal-500" aria-hidden />
          <h2 className="text-sm font-bold uppercase tracking-wide text-teal-900">
            Bank details
          </h2>
        </div>
      </div>
      <div className="p-5">
        {!isComplete ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              {isAdmin ? 'Not entered' : 'To be entered'}
            </p>
            {!isAdmin && onEnterOrEdit ? (
              <button
                type="button"
                onClick={onEnterOrEdit}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                Enter bank details
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <dl className="grid gap-2.5">
              <DetailRow label="Bank name" value={bankDetails?.bankName} />
              <DetailRow label="IFSC code" value={bankDetails?.ifscCode} />
              <DetailRow
                label="Account no"
                value={
                  isAdmin
                    ? bankDetails?.accountNumber ?? bankDetails?.accountNumberMasked
                    : bankDetails?.accountNumberMasked
                }
              />
              {gstDisplay ? <DetailRow label="GST" value={gstDisplay} /> : null}
            </dl>
            {!isAdmin && onEnterOrEdit ? (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onEnterOrEdit}
                  className="rounded-lg border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-800 transition hover:bg-teal-50"
                >
                  Edit bank details
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
