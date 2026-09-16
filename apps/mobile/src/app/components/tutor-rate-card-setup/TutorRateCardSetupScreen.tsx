import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { GET_MY_TUTOR_DETAIL, GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql/queries';
import { SAVE_MY_TUTOR_OFFERING_RATE_CARD } from '@tutorix/shared-graphql/mutations';
import {
  RATE_CARD_SETUP_HEADING,
  RATE_CARD_SETUP_REQUIRED_MESSAGE,
  needsRateCardSetup,
  offeringHasCompleteRateCard,
  PT_PASSED_OFFERING_STATUS,
  type RateCardFormValues,
  type RateCardLike,
} from '@tutorix/shared-utils/rate-card';
import { RateCardModal } from '../tutor-profile/RateCardModal';

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

type TutorRateCardSetupScreenProps = {
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

export const TutorRateCardSetupScreen: React.FC<TutorRateCardSetupScreenProps> = ({
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
    <View style={styles.root}>
      {pendingOfferings.length > 1 ? (
        <ScrollView
          horizontal
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
          showsHorizontalScrollIndicator={false}
        >
          {pendingOfferings.map((offering) => {
            const active = offering.id === selected.id;
            return (
              <Pressable
                key={offering.id}
                onPress={() => setSelectedId(offering.id)}
                style={[styles.chip, active && styles.chipOn]}
              >
                <Text style={[styles.chipText, active && styles.chipTextOn]}>
                  {offeringLabel(offering)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      <RateCardModal
        visible
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
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  chipScroll: { flexGrow: 0, paddingHorizontal: 16, paddingTop: 8 },
  chipRow: { gap: 8, paddingBottom: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipOn: { borderColor: '#5fa8ff', backgroundColor: '#f0f9ff' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  chipTextOn: { color: '#143055' },
});
