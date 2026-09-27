import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatInr } from '@tutorix/shared-utils/rate-card';
import {
  formatExperienceDuration,
  monthsToExperienceDuration,
} from '@tutorix/shared-utils/tutor-detail-formatters';

export type TutorSearchResultCardHit = {
  tutorId: string;
  displayName: string;
  photoUrl?: string | null;
  totalExperienceMonths?: number;
  offeringLabel: string;
  matchingOfferingId: string;
  rateInr: number;
  deliveryModeShown: string;
  distanceKm?: number | null;
  freeDemoOffered: boolean;
  hasAvailabilityThisWeek: boolean;
  groupSize: number;
};

type TutorSearchResultCardProps = {
  hit: TutorSearchResultCardHit;
  onView: () => void;
};

export const TutorSearchResultCard: React.FC<TutorSearchResultCardProps> = ({
  hit,
  onView,
}) => {
  const experience =
    hit.totalExperienceMonths && hit.totalExperienceMonths > 0
      ? formatExperienceDuration(monthsToExperienceDuration(hit.totalExperienceMonths))
      : '';

  return (
    <Pressable
      style={styles.card}
      onPress={onView}
      accessibilityRole="button"
      accessibilityLabel={`View profile ${hit.displayName}`}
    >
      <View style={styles.headerRow}>
        {hit.photoUrl ? (
          <Image source={{ uri: hit.photoUrl }} style={styles.photo} />
        ) : (
          <View style={styles.photoFallback}>
            <Text style={styles.photoFallbackText}>{hit.displayName.slice(0, 1)}</Text>
          </View>
        )}
        <View style={styles.headerCopy}>
          <Text style={styles.cardName}>{hit.displayName}</Text>
          {hit.hasAvailabilityThisWeek ? (
            <Text style={styles.available}>Available this week</Text>
          ) : null}
          {experience ? <Text style={styles.cardMeta}>{experience}</Text> : null}
        </View>
      </View>
      <Text style={styles.cardMeta}>{hit.offeringLabel}</Text>
      <Text style={styles.cardMeta}>
        {hit.deliveryModeShown === 'OFFLINE'
          ? hit.distanceKm != null
            ? `${hit.distanceKm.toFixed(1)} km`
            : 'Offline'
          : 'Online'}
        {' · '}
        {hit.groupSize > 1 ? `Group of ${hit.groupSize}` : '1:1'}
        {hit.freeDemoOffered ? ' · Free demo' : ''}
      </Text>
      <Text style={styles.rate}>{formatInr(hit.rateInr)} / class</Text>
      <Text style={styles.link}>View profile</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  photo: { width: 64, height: 64, borderRadius: 32 },
  photoFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFallbackText: { fontSize: 22, fontWeight: '700', color: '#143055' },
  headerCopy: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 18, fontWeight: '700', color: '#143055' },
  available: { color: '#16a34a', fontWeight: '700', marginTop: 4, fontSize: 12 },
  cardMeta: { color: '#6b7280', marginTop: 4, fontSize: 13 },
  rate: { marginTop: 8, fontWeight: '700', color: '#143055' },
  link: { color: '#4a97f5', fontWeight: '700', marginTop: 8 },
});
