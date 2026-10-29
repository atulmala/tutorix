import React, { useEffect, useState } from 'react';
import { useLazyQuery, useMutation } from '@apollo/client';
import {
  PREVIEW_POST_CLASS_REFUND_CLAIM,
  SUBMIT_POST_CLASS_REFUND_CLAIM,
} from '@tutorix/shared-graphql';
import { formatInr } from '@tutorix/shared-utils';

const REASONS: { value: string; label: string }[] = [
  { value: 'class_did_not_take_place', label: 'Class did not take place' },
  {
    value: 'technical_issue',
    label: 'Technical issue (video, sound, or whiteboard)',
  },
  {
    value: 'not_satisfied',
    label: 'Not satisfied with class quality / duration too short',
  },
];

type StudentPostClassRefundClaimPageProps = {
  enrollmentId: string;
  onComplete: () => void;
  onBack: () => void;
};

export const StudentPostClassRefundClaimPage: React.FC<StudentPostClassRefundClaimPageProps> = ({
  enrollmentId,
  onComplete,
  onBack,
}) => {
  const [reason, setReason] = useState<string>(REASONS[0].value);
  const [refundMethod, setRefundMethod] = useState<string>('gateway');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [loadPreview, { data: previewData, loading: previewLoading }] = useLazyQuery(
    PREVIEW_POST_CLASS_REFUND_CLAIM,
    { fetchPolicy: 'network-only' },
  );

  const [submitClaim, { loading: submitting }] = useMutation(SUBMIT_POST_CLASS_REFUND_CLAIM, {
    refetchQueries: ['StudentBookedClassSessions'],
  });

  const preview = previewData?.previewPostClassRefundClaim;
  const allowedMethods = (preview?.allowedMethods ?? []) as string[];

  useEffect(() => {
    void loadPreview({ variables: { enrollmentId, reason } });
  }, [enrollmentId, reason, loadPreview]);

  useEffect(() => {
    if (allowedMethods.length > 0 && !allowedMethods.includes(refundMethod)) {
      setRefundMethod(allowedMethods[0]);
    }
  }, [allowedMethods, refundMethod]);

  const handleSubmit = () => {
    setError(null);
    void submitClaim({
      variables: { enrollmentId, reason, refundMethod },
      onCompleted: () => setSuccess(true),
      onError: (err) => setError(err.message),
    });
  };

  if (success) {
    return (
      <div className="w-full max-w-xl">
        <h1 className="text-[26px] font-extrabold text-[#143055]">Refund claim submitted</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Your request is under review. Refunds are not instant — we will notify you when there is an
          update.
        </p>
        <button
          type="button"
          className="mt-6 rounded-xl bg-[#143055] px-5 py-2.5 text-sm font-bold text-white"
          onClick={onComplete}
        >
          Back to concluded classes
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl">
      <h1 className="text-[26px] font-extrabold text-[#143055]">Claim refund</h1>
      <p className="mt-2 text-sm text-slate-600">Tell us why you are requesting a refund.</p>

      <fieldset className="mt-6 space-y-2">
        <legend className="text-sm font-bold text-[#143055]">Reason</legend>
        {REASONS.map((row) => (
          <label key={row.value} className="flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="radio"
              name="reason"
              value={row.value}
              checked={reason === row.value}
              onChange={() => setReason(row.value)}
              className="mt-1"
            />
            <span>{row.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="mt-6 space-y-2">
        <legend className="text-sm font-bold text-[#143055]">Refund mode</legend>
        {[
          { value: 'gateway', label: 'Cash refund through payment gateway' },
          { value: 'wallet', label: 'Wallet refund' },
          { value: 'class_credit', label: 'Class credit with the same tutor' },
        ].map((row) => {
          const disabled =
            !allowedMethods.includes(row.value) ||
            (row.value === 'class_credit' && reason === 'not_satisfied');
          return (
            <label
              key={row.value}
              className={`flex items-start gap-2 text-sm ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
            >
              <input
                type="radio"
                name="refundMethod"
                value={row.value}
                disabled={disabled}
                checked={refundMethod === row.value}
                onChange={() => setRefundMethod(row.value)}
                className="mt-1"
              />
              <span>{row.label}</span>
            </label>
          );
        })}
      </fieldset>

      {previewLoading ? (
        <p className="mt-4 text-sm text-slate-500">Calculating refund…</p>
      ) : refundMethod !== 'class_credit' && preview ? (
        <p className="mt-4 text-sm text-slate-700">
          Estimated refund: <strong>{formatInr(preview.amountInr)}</strong>
        </p>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-[#143055]"
          onClick={onBack}
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={submitting || allowedMethods.length === 0}
          className="rounded-xl bg-[#143055] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          onClick={handleSubmit}
        >
          {submitting ? 'Submitting…' : 'Submit claim'}
        </button>
      </div>
    </div>
  );
};
