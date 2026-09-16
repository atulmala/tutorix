import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  GET_MY_TUTOR_DETAIL,
  GET_MY_TUTOR_PROFILE,
  SAVE_MY_TUTOR_OFFERING_RATE_CARD,
} from '@tutorix/shared-graphql';
import {
  RATE_CARD_SETUP_HEADING,
  RATE_CARD_SETUP_REQUIRED_MESSAGE,
  needsRateCardSetup,
  offeringHasCompleteRateCard,
  PT_PASSED_OFFERING_STATUS,
  type RateCardFormValues,
  type RateCardLike,
} from '@tutorix/shared-utils';
import { RateCardModal } from '@tutorix/tutor-detail-ui';

type SetupOffering = {
  id: number;
  offeringDisplayName?: string | null;
  offeringFullLabel?: string | null;
  offeringName?: string | null;
  status?: string | null;
  rateCard?: (RateCardLike & { isComplete?: boolean | null }) | null;
};

type MyTutorDetailData = {
  myTutorDetail?: {
    offerings?: SetupOffering[] | null;
  } | null;
};

type TutorRateCardSetupPageProps = {
  onComplete: () => void;
};

function offeringLabel(offering: SetupOffering): string {
  return (
    offering.offeringFullLabel?.trim() ||
    offering.offeringDisplayName?.trim() ||
    offering.offeringName?.trim() ||
    'Offering'
  );
}

function rateCardInput(tutorOfferingId: number, values: RateCardFormValues) {
  return {
    tutorOfferingId,
    freeDemoOffered: values.freeDemoOffered,
    offlineEnabled: values.offlineEnabled,
    offlineBaseRate: values.offlineEnabled ? values.offlineBaseRate : null,
    offlineBaseDiscountPct: values.offlineEnabled ? values.offlineBaseDiscountPct : null,
    offlineSlab2DiscountPct: values.offlineEnabled ? values.offlineSlab2DiscountPct : null,
    offlineSlab3DiscountPct: values.offlineEnabled ? values.offlineSlab3DiscountPct : null,
    offlineBatchSize: values.offlineEnabled ? values.offlineBatchSize : null,
    onlineEnabled: values.onlineEnabled,
    onlineBaseRate: values.onlineEnabled ? values.onlineBaseRate : null,
    onlineBaseDiscountPct: values.onlineEnabled ? values.onlineBaseDiscountPct : null,
    onlineSlab2DiscountPct: values.onlineEnabled ? values.onlineSlab2DiscountPct : null,
    onlineSlab3DiscountPct: values.onlineEnabled ? values.onlineSlab3DiscountPct : null,
    onlineBatchSize: values.onlineEnabled ? values.onlineBatchSize : null,
  };
}

export const TutorRateCardSetupPage: React.FC<TutorRateCardSetupPageProps> = ({
  onComplete,
}) => {
  const { data, loading } = useQuery<MyTutorDetailData>(GET_MY_TUTOR_DETAIL, {
    fetchPolicy: 'cache-and-network',
  });
  const [saveRateCard, { loading: saving }] = useMutation(SAVE_MY_TUTOR_OFFERING_RATE_CARD, {
    refetchQueries: [{ query: GET_MY_TUTOR_PROFILE }, { query: GET_MY_TUTOR_DETAIL }],
    awaitRefetchQueries: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const pendingOfferings = useMemo(() => {
    const offerings = data?.myTutorDetail?.offerings ?? [];
    return offerings.filter(
      (offering) =>
        String(offering.status ?? '').toLowerCase() === PT_PASSED_OFFERING_STATUS &&
        !offeringHasCompleteRateCard(offering),
    );
  }, [data?.myTutorDetail?.offerings]);

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!needsRateCardSetup(data?.myTutorDetail?.offerings)) {
      onComplete();
    }
  }, [data?.myTutorDetail?.offerings, loading, onComplete]);

  useEffect(() => {
    if (pendingOfferings.length === 0) {
      return;
    }
    setSelectedId((current) =>
      current != null && pendingOfferings.some((offering) => offering.id === current)
        ? current
        : pendingOfferings[0].id,
    );
  }, [pendingOfferings]);

  const selected = pendingOfferings.find((offering) => offering.id === selectedId) ?? pendingOfferings[0];

  const handleSubmit = async (values: RateCardFormValues) => {
    if (!selected) {
      return;
    }
    setError(null);
    try {
      await saveRateCard({
        variables: { input: rateCardInput(selected.id, values) },
      });
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save rate card.');
    }
  };

  if (!selected) {
    return null;
  }

  return (
    <div className="w-full max-w-lg space-y-4">
      {pendingOfferings.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {pendingOfferings.map((offering) => {
            const active = offering.id === selected.id;
            return (
              <button
                key={offering.id}
                type="button"
                onClick={() => setSelectedId(offering.id)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                  active
                    ? 'border-[#5fa8ff] bg-sky-50 text-primary'
                    : 'border-subtle bg-white text-muted hover:border-[#5fa8ff]/50'
                }`}
              >
                {offeringLabel(offering)}
              </button>
            );
          })}
        </div>
      ) : null}
      <RateCardModal
        open
        required
        heading={RATE_CARD_SETUP_HEADING}
        description={RATE_CARD_SETUP_REQUIRED_MESSAGE}
        offeringName={offeringLabel(selected)}
        initialValues={selected.rateCard}
        saving={saving}
        error={error}
        onSubmit={(values) => {
          void handleSubmit(values);
        }}
      />
    </div>
  );
};
