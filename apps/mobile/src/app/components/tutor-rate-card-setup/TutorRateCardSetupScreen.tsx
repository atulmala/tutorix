import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { GET_MY_TUTOR_DETAIL, GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql/queries';
import { SAVE_MY_TUTOR_OFFERING_RATE_CARD } from '@tutorix/shared-graphql/mutations';
import {
  PENDING_RATE_CARD_TASK_MESSAGE,
  RATE_CARD_LATER_ACTION,
  RATE_CARD_LATER_WARNING,
  RATE_CARD_SETUP_HEADING,
  RATE_CARD_SETUP_REQUIRED_MESSAGE,
  canDeferRateCardSetup,
  needsRateCardSetup,
  offeringsNeedingRateCardSetup,
  type RateCardFormValues,
  type RateCardLike,
} from '@tutorix/shared-utils/rate-card';
import { RateCardModal } from '../tutor-profile/RateCardModal';

export function confirmRateCardLater(onConfirm: () => void) {
  Alert.alert('Rate card', RATE_CARD_LATER_WARNING, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'OK', onPress: onConfirm },
  ]);
}

type SetupOffering = {
  id: number;
  proficiencyTestId?: number | null;
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
  onLater?: () => void;
  onDeferChange?: (canDefer: boolean) => void;
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
  onLater,
  onDeferChange,
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
    return offeringsNeedingRateCardSetup(data?.myTutorDetail?.offerings ?? []);
  }, [data?.myTutorDetail?.offerings]);
  const canDefer = canDeferRateCardSetup(data?.myTutorDetail?.offerings);

  useEffect(() => {
    onDeferChange?.(canDefer);
  }, [canDefer, onDeferChange]);

  useEffect(() => {
    return () => onDeferChange?.(false);
  }, [onDeferChange]);

  useEffect(() => {
    if (loading) {
      return;
    }
    if (pendingOfferings.length === 0) {
      onComplete();
    }
  }, [loading, onComplete, pendingOfferings.length]);

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
        description={
          needsRateCardSetup(data?.myTutorDetail?.offerings)
            ? RATE_CARD_SETUP_REQUIRED_MESSAGE
            : PENDING_RATE_CARD_TASK_MESSAGE
        }
        offeringName={offeringLabel(selected)}
        initialValues={selected.rateCard}
        saving={saving}
        error={error}
        laterLabel={canDefer ? RATE_CARD_LATER_ACTION : undefined}
        onClose={
          canDefer && onLater ? () => confirmRateCardLater(onLater) : undefined
        }
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
