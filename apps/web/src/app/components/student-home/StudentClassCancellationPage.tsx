import React, { useEffect, useState } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import {
  CANCEL_CLASS_BOOKING,
  PREVIEW_CLASS_BOOKING_CANCELLATION,
} from '@tutorix/shared-graphql';
import { formatInr } from '@tutorix/shared-utils';

export type ClassCancellationBooking = {
  orderItemId: number;
  tutorName: string;
  offeringLabel: string;
  classCount: number;
  scheduledCount: number;
  unscheduledCount: number;
  concludedCount: number;
  cancellableCount: number;
};

function BookingClassSummary({ booking }: { booking: ClassCancellationBooking }) {
  const rows: { label: string; value: number }[] = [
    { label: 'Total classes in this booking', value: booking.classCount },
    { label: 'Scheduled classes', value: booking.scheduledCount },
    { label: 'Unscheduled classes', value: booking.unscheduledCount },
    { label: 'Concluded classes', value: booking.concludedCount },
    { label: 'Classes available for cancellation', value: booking.cancellableCount },
  ];
  return (
    <dl className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4">
          <dt className="text-slate-600">{row.label}</dt>
          <dd className="font-semibold tabular-nums text-[#143055]">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

type StudentClassCancellationPageProps = {
  booking: ClassCancellationBooking;
  onComplete: () => void;
  onBack: () => void;
};

export const StudentClassCancellationPage: React.FC<StudentClassCancellationPageProps> = ({
  booking,
  onComplete,
  onBack,
}) => {
  const canCancelAny = booking.cancellableCount > 0;
  const [cancelCountInput, setCancelCountInput] = useState('1');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const parsedCancelCount =
    cancelCountInput.trim() === ''
      ? 0
      : Math.floor(Number(cancelCountInput)) || 0;
  const canSubmitCancel =
    parsedCancelCount > 0 && parsedCancelCount <= booking.cancellableCount;

  const [loadPreview, { data: previewData, loading: previewLoading }] = useLazyQuery(
    PREVIEW_CLASS_BOOKING_CANCELLATION,
    { fetchPolicy: 'network-only' },
  );

  const [cancelBooking, { loading: cancelling }] = useMutation(CANCEL_CLASS_BOOKING, {
    onCompleted: () => onComplete(),
  });

  useEffect(() => {
    if (!canCancelAny || !canSubmitCancel) {
      return;
    }
    void loadPreview({
      variables: {
        orderItemId: String(booking.orderItemId),
        cancelCount: parsedCancelCount,
      },
    });
  }, [
    booking.orderItemId,
    booking.cancellableCount,
    parsedCancelCount,
    canCancelAny,
    canSubmitCancel,
    loadPreview,
  ]);

  const preview = previewData?.previewClassBookingCancellation;
  const refundInr = canSubmitCancel ? preview?.refundInr ?? 0 : 0;
  const breakdownText = canSubmitCancel ? preview?.breakdown?.breakdownText ?? '' : '';

  const confirmCancel = (refundMethod: 'wallet' | 'gateway') => {
    if (!canSubmitCancel) {
      return;
    }
    setCancelError(null);
    void cancelBooking({
      variables: {
        orderItemId: String(booking.orderItemId),
        cancelCount: parsedCancelCount,
        refundMethod,
      },
    }).catch((failure: unknown) => {
      setCancelError(
        failure instanceof Error ? failure.message : 'Could not cancel these classes.',
      );
    });
  };

  return (
    <div className="w-full max-w-xl space-y-4">
      <h1 className="text-[26px] font-extrabold text-[#143055]">Class cancellation</h1>
      <p className="text-sm font-semibold text-[#143055]">
        {booking.offeringLabel} · {booking.tutorName}
      </p>

      <BookingClassSummary booking={booking} />

      {!canCancelAny ? (
        <p className="text-sm text-slate-600">
          No classes on this booking can be cancelled right now.
        </p>
      ) : null}

      {canCancelAny ? (
      <>
      <label className="block text-sm text-[#143055]">
        Number of classes to cancel
        <input
          type="number"
          min={0}
          max={booking.cancellableCount}
          value={cancelCountInput}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === '') {
              setCancelCountInput('');
              return;
            }
            const next = Number(raw);
            if (!Number.isFinite(next)) {
              return;
            }
            setCancelCountInput(
              String(Math.min(booking.cancellableCount, Math.floor(next))),
            );
          }}
          className="mt-1 w-full max-w-[8rem] rounded-xl border border-slate-200 px-3 py-2"
        />
      </label>

      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-[#143055]">
        <span>
          Refundable amount:{' '}
          {canSubmitCancel && previewLoading ? '…' : formatInr(refundInr)}
        </span>
        {breakdownText ? (
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs font-bold text-slate-600"
            title={breakdownText}
            aria-label="How refund is calculated"
            onFocus={() => setShowBreakdown(true)}
            onBlur={() => setShowBreakdown(false)}
            onMouseEnter={() => setShowBreakdown(true)}
            onMouseLeave={() => setShowBreakdown(false)}
          >
            i
          </button>
        ) : null}
      </div>
      {showBreakdown && breakdownText ? (
        <pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          {breakdownText}
        </pre>
      ) : null}

      {cancelError ? <p className="text-sm text-red-600">{cancelError}</p> : null}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={cancelling || !canSubmitCancel || previewLoading}
          onClick={() => confirmCancel('wallet')}
          className="rounded-xl bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
        >
          {cancelling ? 'Cancelling…' : `Add ${formatInr(refundInr)} to wallet`}
        </button>
        <button
          type="button"
          disabled={cancelling || !canSubmitCancel || previewLoading}
          onClick={() => confirmCancel('gateway')}
          className="rounded-xl border border-[#2563eb] px-3 py-2 text-sm font-semibold text-[#2563eb] disabled:text-slate-300"
        >
          Cash refund {formatInr(refundInr)}
        </button>
        <p className="text-xs text-slate-500">
          Cash refunds are credited to your payment method within 3 working days.
        </p>
      </div>
      </>
      ) : null}

      <button
        type="button"
        onClick={onBack}
        disabled={cancelling}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
      >
        Do not Cancel
      </button>
    </div>
  );
};
