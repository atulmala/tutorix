import React, { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { BOOK_TUTOR_CLASS, MY_WALLET, TUTOR_SEARCH_DETAIL } from '@tutorix/shared-graphql';
import {
  formatInr,
  formatIstBookingDateLabel,
  formatIstBookingTimeRange,
  SLOT_DURATION_MINUTES,
  type StudentBookingDraft,
} from '@tutorix/shared-utils';

type StudentTutorBookingConfirmPageProps = {
  draft: Required<StudentBookingDraft>;
  onBooked: () => void;
  onOpenWallet: () => void;
};

export const StudentTutorBookingConfirmPage: React.FC<
  StudentTutorBookingConfirmPageProps
> = ({ draft, onBooked, onOpenWallet }) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { data: detailData, loading: detailLoading, error: detailError } = useQuery(
    TUTOR_SEARCH_DETAIL,
    {
      variables: { tutorId: draft.tutorId, offeringId: draft.offeringId },
      fetchPolicy: 'network-only',
    },
  );
  const { data: walletData, loading: walletLoading } = useQuery(MY_WALLET, {
    fetchPolicy: 'network-only',
  });
  const [bookClass, { loading: booking }] = useMutation(BOOK_TUTOR_CLASS);

  const detail = detailData?.tutorSearchDetail;
  const offering = detail?.matchingOffering;
  const price =
    draft.deliveryMode === 'online'
      ? offering?.onlineRateInr
      : offering?.offlineRateInr;
  const balance = walletData?.myWallet?.balanceInr ?? 0;
  const startsAt = new Date(draft.startsAt);
  const canPay = typeof price === 'number' && balance >= price;

  if (detailLoading || walletLoading) {
    return <p className="text-sm text-muted">Loading booking…</p>;
  }
  if (detailError || !detail || !offering || typeof price !== 'number') {
    return <p className="text-sm text-danger">Could not load this booking.</p>;
  }

  return (
    <div className="w-full max-w-xl space-y-4">
      <h1 className="text-[26px] font-extrabold text-[#143055]">Confirm class</h1>
      <section className="space-y-2 rounded-[20px] bg-white p-5 text-sm text-[#143055]">
        <p className="text-lg font-extrabold">{detail.displayName}</p>
        <p>{offering.offeringLabel}</p>
        <p>{draft.deliveryMode === 'online' ? 'Online' : 'Offline'}</p>
        <p>{formatIstBookingDateLabel(startsAt)}</p>
        <p>{formatIstBookingTimeRange(startsAt)}</p>
        <p>{SLOT_DURATION_MINUTES === 60 ? '1 hour' : `${SLOT_DURATION_MINUTES} min`}</p>
        <p className="font-extrabold">{formatInr(price)}</p>
        <p>Wallet balance {formatInr(balance)}</p>
      </section>
      {errorMessage ? <p className="text-sm text-danger">{errorMessage}</p> : null}
      {canPay ? (
        <button
          type="button"
          disabled={booking}
          onClick={() => {
            setErrorMessage(null);
            void bookClass({
              variables: {
                tutorCalendarId: draft.tutorCalendarId,
                offeringId: draft.offeringId,
                deliveryMode: draft.deliveryMode,
              },
            })
              .then(() => onBooked())
              .catch((error: { message?: string }) => {
                setErrorMessage(error.message ?? 'Could not book this class.');
              });
          }}
          className="w-full rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:bg-slate-300"
        >
          {booking ? 'Booking…' : `Pay ${formatInr(price)}`}
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenWallet}
          className="w-full rounded-xl bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
        >
          Add money to wallet
        </button>
      )}
    </div>
  );
};
