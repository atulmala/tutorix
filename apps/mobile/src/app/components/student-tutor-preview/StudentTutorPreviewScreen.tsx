import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { MY_CART, TUTOR_SEARCH_DETAIL } from '@tutorix/shared-graphql/queries';
import { ADD_TO_CART } from '@tutorix/shared-graphql/mutations';
import {
  formatExperienceDuration,
  formatExperiencePeriod,
  formatQualificationInstitutionGrade,
  formatQualificationTitle,
  monthsToExperienceDuration,
} from '@tutorix/shared-utils/tutor-detail-formatters';
import { analytics } from '../../../lib/analytics';
import {
  TutorSubjectPurchaseCard,
  type PreviewOffering,
} from './TutorSubjectPurchaseCard';

type StudentTutorPreviewScreenProps = {
  tutorId: string;
  offeringId: string;
  onViewCart: () => void;
};

type PreviewExperience = {
  jobTitle: string;
  employerName?: string | null;
  employerAddress?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
};

type PreviewQualification = {
  qualificationType: string;
  degreeName?: string | null;
  gradeType: string;
  gradeValue: string;
  boardOrUniversity: string;
};

export const StudentTutorPreviewScreen: React.FC<StudentTutorPreviewScreenProps> = ({
  tutorId,
  offeringId,
  onViewCart,
}) => {
  const { data, loading, error } = useQuery(TUTOR_SEARCH_DETAIL, {
    variables: { tutorId, offeringId },
    fetchPolicy: 'network-only',
  });
  const [addToCart, { loading: adding }] = useMutation(ADD_TO_CART, {
    refetchQueries: [{ query: MY_CART }],
  });
  const [addingOfferingId, setAddingOfferingId] = useState<string | null>(null);
  const detail = data?.tutorSearchDetail;

  useEffect(() => {
    if (detail?.tutorId) {
      analytics.trackTutorViewed(detail.tutorId);
    }
  }, [detail?.tutorId]);

  const handleAdd = async (
    targetOfferingId: string,
    deliveryMode: 'online' | 'offline',
    quantity: number,
  ) => {
    setAddingOfferingId(targetOfferingId);
    try {
      await addToCart({
        variables: {
          tutorId,
          offeringId: targetOfferingId,
          deliveryMode,
          quantity,
        },
      });
    } finally {
      setAddingOfferingId(null);
    }
  };

  if (loading) {
    return <Text style={styles.hint}>Loading tutor…</Text>;
  }
  if (error || !detail) {
    return <Text style={styles.hint}>Could not load this tutor.</Text>;
  }

  const experience =
    detail.totalExperienceMonths > 0
      ? formatExperienceDuration(monthsToExperienceDuration(detail.totalExperienceMonths))
      : '';
  const recentExperiences = (detail.recentExperiences ?? []) as PreviewExperience[];
  const topQualifications = (detail.topQualifications ?? []) as PreviewQualification[];
  const otherOfferings = (detail.otherOfferings ?? []) as PreviewOffering[];

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          {detail.photoUrl ? (
            <Image source={{ uri: detail.photoUrl }} style={styles.photo} />
          ) : (
            <View style={styles.photoFallback}>
              <Text style={styles.photoFallbackText}>{detail.displayName.slice(0, 1)}</Text>
            </View>
          )}
          <View style={styles.headerCopy}>
            <Text style={styles.name}>{detail.displayName}</Text>
            {experience ? <Text style={styles.meta}>{experience}</Text> : null}
            <Text style={styles.meta}>
              {[
                detail.city,
                detail.distanceKm != null ? `${detail.distanceKm.toFixed(1)} km` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {detail.hasAvailabilityThisWeek ? (
              <Text style={styles.available}>
                Available this week · {detail.slotsThisWeek} slot
                {detail.slotsThisWeek === 1 ? '' : 's'}
              </Text>
            ) : (
              <Text style={styles.meta}>No slots listed for this week yet.</Text>
            )}
          </View>
        </View>
      </View>

      <Text style={styles.sectionHeading}>This subject</Text>
      <TutorSubjectPurchaseCard
        offering={detail.matchingOffering as PreviewOffering}
        defaultExpanded
        collapsible={false}
        highlight
        adding={adding && addingOfferingId === String(detail.matchingOffering.offeringId)}
        onAdd={handleAdd}
        onViewCart={onViewCart}
      />

      {otherOfferings.length ? (
        <>
          <Text style={styles.sectionHeading}>Also teaches</Text>
          <Text style={styles.sectionSub}>
            Tap a subject to see pack pricing and add classes to your cart.
          </Text>
          {otherOfferings.map((offering) => (
            <TutorSubjectPurchaseCard
              key={offering.offeringId}
              offering={offering}
              adding={adding && addingOfferingId === String(offering.offeringId)}
              onAdd={handleAdd}
              onViewCart={onViewCart}
            />
          ))}
        </>
      ) : null}

      {recentExperiences.length ? (
        <View style={styles.card}>
          <Text style={styles.section}>Experience</Text>
          {recentExperiences.map((exp, index) => (
            <View key={`${exp.jobTitle}-${index}`} style={styles.item}>
              <Text style={styles.itemTitle}>{exp.employerName || 'Self-employed'}</Text>
              {exp.employerAddress ? (
                <Text style={styles.meta}>{exp.employerAddress}</Text>
              ) : null}
              <Text style={styles.meta}>{formatExperiencePeriod(exp)}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {topQualifications.length ? (
        <View style={styles.card}>
          <Text style={styles.section}>Education</Text>
          {topQualifications.map((qual, index) => {
            const institutionGrade = formatQualificationInstitutionGrade(
              qual.boardOrUniversity,
              qual.gradeType,
              qual.gradeValue,
            );
            return (
              <View key={`${qual.qualificationType}-${index}`} style={styles.item}>
                <Text style={styles.itemTitle}>
                  {formatQualificationTitle(qual.qualificationType, qual.degreeName)}
                </Text>
                {institutionGrade ? <Text style={styles.meta}>{institutionGrade}</Text> : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 20,
    marginBottom: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  photo: { width: 88, height: 88, borderRadius: 44 },
  photoFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFallbackText: { fontSize: 28, fontWeight: '700', color: '#143055' },
  headerCopy: { flex: 1, minWidth: 0 },
  name: { fontSize: 22, fontWeight: '700', color: '#143055' },
  section: { fontSize: 16, fontWeight: '700', color: '#143055', marginBottom: 8 },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#143055',
    marginBottom: 8,
  },
  sectionSub: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  item: { marginTop: 10 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#143055' },
  meta: { marginTop: 6, color: '#6b7280', fontSize: 14 },
  available: { marginTop: 8, color: '#16a34a', fontWeight: '700' },
  hint: { padding: 24, color: '#6b7280', textAlign: 'center' },
});
