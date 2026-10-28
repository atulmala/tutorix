import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  TUTOR_POST_CLASS_REFUND_CLAIM_DETAIL,
  TUTOR_RESPOND_POST_CLASS_REFUND_CLAIM,
} from '@tutorix/shared-graphql';

type TutorPostClassRefundClaimPageProps = {
  claimId: number;
  onComplete: () => void;
};

export const TutorPostClassRefundClaimPage: React.FC<TutorPostClassRefundClaimPageProps> = ({
  claimId,
  onComplete,
}) => {
  const [accept, setAccept] = useState<boolean | null>(null);
  const [declineComment, setDeclineComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, loading } = useQuery(TUTOR_POST_CLASS_REFUND_CLAIM_DETAIL, {
    variables: { claimId },
    fetchPolicy: 'network-only',
  });
  const detail = data?.tutorPostClassRefundClaimDetail;

  const [respond, { loading: submitting }] = useMutation(TUTOR_RESPOND_POST_CLASS_REFUND_CLAIM, {
    refetchQueries: ['TutorBookedClassSessions', 'TutorPendingPostClassRefundClaimAlert'],
  });

  const handleSubmit = () => {
    if (accept == null) {
      setError('Choose accept or decline');
      return;
    }
    if (!accept && declineComment.trim() === '') {
      setError('Please explain why you are declining');
      return;
    }
    setError(null);
    void respond({
      variables: {
        claimId,
        accept,
        declineComment: accept ? null : declineComment.trim(),
      },
      onCompleted: () => onComplete(),
      onError: (err) => setError(err.message),
    });
  };

  if (loading && !detail) {
    return <p className="text-sm text-slate-500">Loading…</p>;
  }
  if (!detail) {
    return <p className="text-sm text-slate-500">Claim not found.</p>;
  }

  const alreadyResponded = detail.tutorResponseStatus !== 'pending';

  return (
    <div className="w-full max-w-xl">
      <h1 className="text-[26px] font-extrabold text-[#143055]">Class refund request</h1>
      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="text-slate-500">Student</dt>
          <dd className="font-semibold text-[#143055]">{detail.studentName}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Subject</dt>
          <dd className="font-semibold text-[#143055]">{detail.offeringLabel}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Class</dt>
          <dd className="font-semibold text-[#143055]">{detail.classTimeLabel}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Reason</dt>
          <dd className="font-semibold text-[#143055]">{detail.reasonLabel}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Respond by</dt>
          <dd className="font-semibold text-[#143055]">{detail.deadlineLabel}</dd>
        </div>
      </dl>

      {alreadyResponded ? (
        <p className="mt-6 text-sm text-slate-600">You have already responded to this claim.</p>
      ) : (
        <>
          <fieldset className="mt-6 space-y-2">
            <legend className="text-sm font-bold text-[#143055]">Your response</legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="tutorAccept"
                checked={accept === true}
                onChange={() => setAccept(true)}
              />
              Accept refund claim
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="tutorAccept"
                checked={accept === false}
                onChange={() => setAccept(false)}
              />
              Decline refund claim
            </label>
          </fieldset>
          {accept === false ? (
            <textarea
              className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm"
              rows={3}
              placeholder="Why are you declining?"
              value={declineComment}
              onChange={(e) => setDeclineComment(e.target.value)}
            />
          ) : null}
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            disabled={submitting}
            className="mt-6 rounded-xl bg-[#143055] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            onClick={handleSubmit}
          >
            {submitting ? 'Submitting…' : 'Submit response'}
          </button>
        </>
      )}
    </div>
  );
};
