import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Modal,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { GET_MY_TUTOR_DETAIL } from '@tutorix/shared-graphql/queries';
import {
  SAVE_MY_BANK_DETAILS,
  SAVE_MY_TUTOR_OFFERING_RATE_CARD,
} from '@tutorix/shared-graphql/mutations';
import {
  buildOnboardingTimeline,
  documentStatusLabel,
  experienceDurationMonths,
  formatDate,
  formatDateTime,
  formatExperienceDuration,
  formatQualificationTitle,
  monthsToExperienceDuration,
  sortQualificationsHighestFirst,
  sumExperienceDurations,
  formatOfferingLabelForDisplay,
  type OnboardingTimelineEntry,
} from '@tutorix/shared-utils';
import type {
  BankDetailsFormValues,
  RateCardFormValues,
  TutorDetailRecord,
} from '@tutorix/tutor-detail-ui';
import { BankDetailsSection } from './BankDetailsSection';
import { BankDetailsModal } from './BankDetailsModal';
import { RateCardModal } from './RateCardModal';

type TutorOffering = TutorDetailRecord['offerings'][number];

type MyTutorDetailData = {
  myTutorDetail: TutorDetailRecord;
};

type TutorDocumentDetail = TutorDetailRecord['documents'][number];

function formatMobile(user?: TutorDetailRecord['user']): string {
  if (!user) return '—';
  if (user.mobile?.trim()) return user.mobile.trim();
  if (user.mobileNumber?.trim()) {
    const code = user.mobileCountryCode?.trim() || '+91';
    return `${code} ${user.mobileNumber.trim()}`;
  }
  return '—';
}

function formatAddress(address: TutorDetailRecord['addresses'][0]): string {
  if (address.fullAddress?.trim()) return address.fullAddress.trim();
  return [address.street, address.subArea, address.city, address.state, address.postalCode, address.country]
    .filter(Boolean)
    .join(', ');
}

function timelineStatusColor(status: OnboardingTimelineEntry['status']): string {
  switch (status) {
    case 'completed':
      return '#10b981';
    case 'current':
      return '#0ea5e9';
    case 'skipped':
      return '#f59e0b';
    default:
      return '#cbd5e1';
  }
}

function formatEntryCount(count: number, singular: string, plural: string): string {
  if (count === 1) return `1 ${singular}`;
  return `${count} ${plural}`;
}

function OfferingDetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.offeringField}>
      <Text style={styles.offeringFieldLabel}>{label}</Text>
      <Text style={styles.offeringFieldValue}>{value ?? '—'}</Text>
    </View>
  );
}

function formatTimelineDate(entry: OnboardingTimelineEntry): string {
  if (entry.status === 'skipped') return 'Payment skipped';
  if (entry.completedAt) return formatDateTime(entry.completedAt);
  if (entry.status === 'current') return 'In progress';
  return '—';
}

function DocumentViewerModal({
  document,
  onClose,
}: {
  document: TutorDocumentDetail;
  onClose: () => void;
}) {
  const isPdf = document.mimeType?.includes('pdf');
  const viewerUrl = isPdf ? document.viewUrl : document.previewUrl ?? document.viewUrl;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{document.name ?? 'Document'}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.docStatus}>
            {documentStatusLabel(document.screening?.status)}
          </Text>
          {viewerUrl && !isPdf ? (
            <Image source={{ uri: viewerUrl }} style={styles.modalImage} resizeMode="contain" />
          ) : viewerUrl ? (
            <TouchableOpacity
              style={styles.openPdfButton}
              onPress={() => void Linking.openURL(viewerUrl)}
            >
              <Text style={styles.openPdfText}>Open document</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.muted}>Preview unavailable.</Text>
          )}
          {document.screening?.summaryNotes ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>AI screening notes</Text>
              <Text style={styles.noteText}>{document.screening.summaryNotes}</Text>
            </View>
          ) : null}
          {document.screening?.reviewerNote ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Reviewer note</Text>
              <Text style={styles.noteText}>{document.screening.reviewerNote}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export const TutorDetailScreen: React.FC = () => {
  const { data, loading, error, refetch } = useQuery<MyTutorDetailData>(GET_MY_TUTOR_DETAIL, {
    fetchPolicy: 'cache-and-network',
  });
  const [selectedDocument, setSelectedDocument] = useState<TutorDocumentDetail | null>(null);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [bankDetailsSaveError, setBankDetailsSaveError] = useState<string | null>(null);
  const [rateCardOffering, setRateCardOffering] = useState<TutorOffering | null>(null);
  const [rateCardSaveError, setRateCardSaveError] = useState<string | null>(null);

  const [saveBankDetails, { loading: savingBankDetails }] = useMutation(SAVE_MY_BANK_DETAILS);
  const [saveRateCard, { loading: savingRateCard }] = useMutation(SAVE_MY_TUTOR_OFFERING_RATE_CARD);
  const { width: windowWidth } = useWindowDimensions();
  const stackProfileSections = windowWidth < 768;
  const offeringFieldsInRow = windowWidth >= 400;

  const tutor = data?.myTutorDetail;

  const timelineEntries = useMemo(
    () =>
      tutor
        ? buildOnboardingTimeline({
            certificationStage: tutor.certificationStage,
            regFeePaid: tutor.regFeePaid,
            regFeeDate: tutor.regFeeDate,
            addresses: tutor.addresses,
            qualifications: tutor.qualifications,
            experiences: tutor.experiences,
            offerings: tutor.offerings,
            documents: tutor.documents,
          })
        : [],
    [tutor],
  );

  const sortedQualifications = useMemo(
    () => sortQualificationsHighestFirst(tutor?.qualifications ?? []),
    [tutor?.qualifications],
  );

  const handleSaveRateCard = async (tutorOfferingId: number, values: RateCardFormValues) => {
    setRateCardSaveError(null);
    try {
      await saveRateCard({
        variables: {
          input: {
            tutorOfferingId,
            freeDemoOffered: values.freeDemoOffered,
            offlineEnabled: values.offlineEnabled,
            offlineBaseRate: values.offlineEnabled ? values.offlineBaseRate : null,
            offlineBaseDiscountPct: values.offlineEnabled
              ? values.offlineBaseDiscountPct
              : null,
            offlineSlab2DiscountPct: values.offlineEnabled
              ? values.offlineSlab2DiscountPct
              : null,
            offlineSlab3DiscountPct: values.offlineEnabled
              ? values.offlineSlab3DiscountPct
              : null,
            onlineEnabled: values.onlineEnabled,
            onlineBaseRate: values.onlineEnabled ? values.onlineBaseRate : null,
            onlineBaseDiscountPct: values.onlineEnabled
              ? values.onlineBaseDiscountPct
              : null,
            onlineSlab2DiscountPct: values.onlineEnabled ? values.onlineSlab2DiscountPct : null,
            onlineSlab3DiscountPct: values.onlineEnabled ? values.onlineSlab3DiscountPct : null,
          },
        },
      });
      await refetch();
      setRateCardOffering(null);
    } catch (err) {
      setRateCardSaveError(
        err instanceof Error ? err.message : 'Could not save rate card.',
      );
      throw err;
    }
  };

  const handleSaveBankDetails = async (values: BankDetailsFormValues) => {
    setBankDetailsSaveError(null);
    try {
      await saveBankDetails({
        variables: {
          input: {
            bankName: values.bankName,
            accountNumber: values.accountNumber,
            ifscCode: values.ifscCode,
            panNumber: values.panNumber,
            gstNumber: values.gstNumber.trim() || null,
          },
        },
      });
      await refetch();
      setBankModalVisible(false);
    } catch (err) {
      setBankDetailsSaveError(
        err instanceof Error ? err.message : 'Could not save bank details.',
      );
      throw err;
    }
  };

  if (loading && !tutor) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5fa8ff" />
        <Text style={styles.muted}>Loading your profile…</Text>
      </View>
    );
  }

  if (error || !tutor) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Could not load your tutor profile.</Text>
      </View>
    );
  }

  const feeAmount = tutor.regFeePaid ? tutor.regFeeAmount : tutor.regFeeAmountToBePaid;
  const totalExperience = sumExperienceDurations(tutor.experiences);
  const displayName = [tutor.user?.firstName, tutor.user?.lastName].filter(Boolean).join(' ').trim();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{displayName || 'Your profile'}</Text>
      <Text style={styles.subtitle}>
        Tutor #{tutor.id}
        {tutor.certificationStage ? ` · ${tutor.certificationStage}` : ''}
      </Text>
      <Text style={styles.meta}>
        {formatMobile(tutor.user)}
        {tutor.user?.email ? ` · ${tutor.user.email}` : ''}
        {tutor.user?.createdDate ? ` · Registered ${formatDate(tutor.user.createdDate)}` : ''}
      </Text>

      <BankDetailsSection
        bankDetails={tutor.user?.bankDetails}
        onEnterOrEdit={() => {
          setBankDetailsSaveError(null);
          setBankModalVisible(true);
        }}
      />

      <View style={styles.offeringsSection}>
        <View style={styles.offeringsSectionHeaderRow}>
          <Text style={styles.offeringsSectionTitle}>Offerings</Text>
          <Text style={styles.offeringsCount}>
            {formatEntryCount(tutor.offerings.length, 'offering', 'offerings')}
          </Text>
        </View>
        {tutor.offerings.length === 0 ? (
          <Text style={styles.muted}>No offerings on file.</Text>
        ) : (
          <View style={styles.offeringsList}>
            {tutor.offerings.map((o) => {
              const hasRateCard = Boolean(o.rateCard?.isComplete);
              return (
                <View key={o.id} style={styles.offeringGridCard}>
                  <Text style={styles.offeringName} numberOfLines={2}>
                    {formatOfferingLabelForDisplay(
                      o.offeringFullLabel ??
                        o.offeringDisplayName ??
                        o.offeringName ??
                        'Offering',
                    )}
                  </Text>
                  <View
                    style={[
                      styles.offeringGridRow,
                      !offeringFieldsInRow && styles.offeringGridRowStacked,
                    ]}
                  >
                    <OfferingDetailField
                      label="Date"
                      value={formatDate(o.passedAt ?? o.lastAttemptAt)}
                    />
                    <OfferingDetailField
                      label="Score"
                      value={
                        o.lastScore != null && o.lastMaxScore != null
                          ? `${o.lastScore}/${o.lastMaxScore}`
                          : '—'
                      }
                    />
                  </View>
                  <View style={styles.rateCardRow}>
                    {hasRateCard ? (
                      <View style={styles.configuredBadge}>
                        <Text style={styles.configuredBadgeText}>Configured</Text>
                      </View>
                    ) : null}
                    <TouchableOpacity
                      style={styles.rateCardButton}
                      onPress={() => {
                        setRateCardSaveError(null);
                        setRateCardOffering(o);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.rateCardButtonText}>
                        {hasRateCard ? 'Edit rate card' : 'Rate card'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View
        style={[
          styles.sideBySideRow,
          stackProfileSections ? styles.sideBySideRowStacked : null,
        ]}
      >
        <View
          style={[
            styles.section,
            styles.sideBySideCol,
            stackProfileSections ? styles.sideBySideColStacked : null,
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Experience</Text>
            <Text style={styles.experienceCount}>
              {formatEntryCount(tutor.experiences.length, 'experience', 'experiences')}
            </Text>
          </View>
          {tutor.experiences.length > 0 ? (
            <Text style={styles.badge}>
              {formatExperienceDuration(totalExperience)} total
            </Text>
          ) : null}
          {tutor.experiences.length === 0 ? (
            <Text style={styles.muted}>No experience on file.</Text>
          ) : (
            tutor.experiences.map((exp) => {
              const months = experienceDurationMonths(exp);
              const durationLabel =
                months != null
                  ? formatExperienceDuration(monthsToExperienceDuration(months))
                  : null;
              return (
                <View key={exp.id} style={styles.experienceItem}>
                  <Text style={styles.rowBold}>
                    {exp.jobTitle}
                    {durationLabel ? ` (${durationLabel})` : ''}
                  </Text>
                  <Text style={styles.row}>
                    {exp.employerName ?? 'Self-employed'}
                    {exp.employerAddress ? ` · ${exp.employerAddress}` : ''}
                  </Text>
                  <Text style={styles.muted}>
                    {formatDate(exp.startDate)} –{' '}
                    {exp.isCurrent ? 'Present' : formatDate(exp.endDate)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View
          style={[
            styles.section,
            styles.sideBySideCol,
            styles.educationCol,
            stackProfileSections ? styles.sideBySideColStacked : styles.educationColStretch,
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Education</Text>
            <Text style={styles.educationCount}>
              {formatEntryCount(sortedQualifications.length, 'qualification', 'qualifications')}
            </Text>
          </View>
          {sortedQualifications.length === 0 ? (
            <Text style={styles.muted}>No qualifications on file.</Text>
          ) : (
            sortedQualifications.map((q, index) => (
              <View key={q.id} style={styles.educationItem}>
                <Text style={styles.rowBold}>
                  {index + 1}. {formatQualificationTitle(q.qualificationType, q.degreeName)}
                </Text>
                <Text style={styles.row}>
                  {q.boardOrUniversity} · {q.gradeType}: {q.gradeValue} · {q.yearObtained}
                </Text>
                {q.fieldOfStudy ? <Text style={styles.muted}>{q.fieldOfStudy}</Text> : null}
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Address</Text>
          <Text style={styles.addressCount}>
            {formatEntryCount(tutor.addresses.length, 'address', 'addresses')}
          </Text>
        </View>
        {tutor.addresses.length === 0 ? (
          <Text style={styles.muted}>No address on file.</Text>
        ) : (
          tutor.addresses.map((addr) => (
            <View key={addr.id} style={styles.addressItem}>
              <Text style={styles.row}>{formatAddress(addr)}</Text>
            </View>
          ))
        )}
      </View>

      <View
        style={[
          styles.sideBySideRow,
          stackProfileSections ? styles.sideBySideRowStacked : null,
        ]}
      >
        <View
          style={[
            styles.section,
            styles.sideBySideCol,
            stackProfileSections ? styles.sideBySideColStacked : null,
          ]}
        >
          <Text style={styles.sectionTitle}>Onboarding timeline</Text>
          {timelineEntries.map((entry) => (
            <View key={entry.id} style={styles.timelineRow}>
              <View
                style={[styles.timelineDot, { backgroundColor: timelineStatusColor(entry.status) }]}
              />
              <View style={styles.timelineBody}>
                <Text style={styles.row}>{entry.title}</Text>
                <Text style={styles.muted}>{formatTimelineDate(entry)}</Text>
              </View>
            </View>
          ))}
        </View>

        <View
          style={[
            styles.section,
            styles.sideBySideCol,
            stackProfileSections ? styles.sideBySideColStacked : null,
          ]}
        >
          <Text style={styles.sectionTitle}>Registration fee</Text>
          <Text style={styles.row}>Status: {tutor.regFeePaid ? 'Paid' : 'Not received'}</Text>
          <Text style={styles.row}>Amount: {feeAmount != null ? `₹${feeAmount}` : '—'}</Text>
          <Text style={styles.row}>
            Date received: {tutor.regFeePaid ? formatDate(tutor.regFeeDate) : 'Not received'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Documents</Text>
        {tutor.documents.length === 0 ? (
          <Text style={styles.muted}>No documents uploaded.</Text>
        ) : (
          tutor.documents.map((doc) => (
            <TouchableOpacity
              key={doc.id}
              style={styles.docCard}
              onPress={() => setSelectedDocument(doc)}
              activeOpacity={0.7}
            >
              <View style={styles.docCardHeader}>
                <Text style={styles.rowBold}>{doc.name ?? 'Document'}</Text>
                <Text style={styles.docStatusSmall}>
                  {documentStatusLabel(doc.screening?.status)}
                </Text>
              </View>
              {doc.previewUrl ? (
                <Image source={{ uri: doc.previewUrl }} style={styles.docThumb} resizeMode="contain" />
              ) : (
                <Text style={styles.muted}>Tap to view</Text>
              )}
              {doc.filename ? <Text style={styles.muted}>{doc.filename}</Text> : null}
            </TouchableOpacity>
          ))
        )}
      </View>

      {selectedDocument ? (
        <DocumentViewerModal
          document={selectedDocument}
          onClose={() => setSelectedDocument(null)}
        />
      ) : null}

      <RateCardModal
        visible={rateCardOffering != null}
        offeringName={
          rateCardOffering
            ? formatOfferingLabelForDisplay(
                rateCardOffering.offeringFullLabel ??
                  rateCardOffering.offeringDisplayName ??
                  rateCardOffering.offeringName ??
                  'Offering',
              )
            : 'Offering'
        }
        initialValues={rateCardOffering?.rateCard}
        saving={savingRateCard}
        error={rateCardSaveError}
        onClose={() => {
          setRateCardOffering(null);
          setRateCardSaveError(null);
        }}
        onSubmit={async (values) => {
          if (!rateCardOffering) {
            return;
          }
          await handleSaveRateCard(rateCardOffering.id, values);
        }}
      />

      <BankDetailsModal
        visible={bankModalVisible}
        initialValues={tutor.user?.bankDetails}
        saving={savingBankDetails}
        error={bankDetailsSaveError}
        onClose={() => setBankModalVisible(false)}
        onSubmit={handleSaveBankDetails}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  meta: { fontSize: 13, color: '#64748b', marginTop: 8, marginBottom: 16, lineHeight: 18 },
  sideBySideRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    alignItems: 'stretch',
  },
  sideBySideRowStacked: {
    flexDirection: 'column',
  },
  sideBySideCol: {
    flex: 1,
    marginBottom: 0,
  },
  sideBySideColStacked: {
    flex: 0,
    alignSelf: 'stretch',
    marginBottom: 12,
  },
  educationCol: {
    backgroundColor: '#fff',
  },
  educationColStretch: {
    flex: 1,
    alignSelf: 'stretch',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 0,
  },
  experienceCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6d28d9',
  },
  educationCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4338ca',
  },
  offeringsCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f766e',
  },
  offeringsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#99f6e4',
    padding: 16,
    marginBottom: 12,
  },
  offeringsSectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  offeringsSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f766e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  offeringsList: {
    gap: 12,
  },
  offeringGridCard: {
    backgroundColor: '#f0fdfa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    padding: 12,
    gap: 10,
  },
  offeringName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#134e4a',
  },
  offeringGridRow: {
    flexDirection: 'row',
    gap: 16,
  },
  offeringGridRowStacked: {
    flexDirection: 'column',
    gap: 10,
  },
  offeringField: {
    flex: 1,
    minWidth: 0,
  },
  offeringFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f766e',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  offeringFieldValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#134e4a',
    marginTop: 2,
  },
  rateCardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  configuredBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  configuredBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  rateCardButton: {
    borderWidth: 1,
    borderColor: '#99f6e4',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  rateCardButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f766e',
  },
  addressCount: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0e7490',
  },
  addressItem: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cffafe',
    backgroundColor: '#ecfeff',
  },
  experienceItem: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ede9fe',
    backgroundColor: '#f5f3ff',
  },
  educationItem: {
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e7ff',
    backgroundColor: '#eef2ff',
  },
  row: { fontSize: 14, color: '#0f172a', lineHeight: 20, marginBottom: 6 },
  rowBold: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  muted: { fontSize: 14, color: '#64748b', marginBottom: 6 },
  error: { fontSize: 14, color: '#b91c1c' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#7c3aed',
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  blockItem: { marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  timelineRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  timelineBody: { flex: 1 },
  docCard: {
    borderWidth: 1,
    borderColor: '#d1fae5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    backgroundColor: '#f0fdf4',
  },
  docCardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  docStatusSmall: { fontSize: 11, fontWeight: '600', color: '#047857' },
  docThumb: { height: 120, width: '100%', marginBottom: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a', flex: 1 },
  modalClose: { fontSize: 22, color: '#64748b', paddingLeft: 12 },
  docStatus: { fontSize: 12, fontWeight: '600', color: '#047857', marginVertical: 8 },
  modalImage: { height: 280, width: '100%', marginVertical: 8 },
  openPdfButton: {
    backgroundColor: '#0ea5e9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 12,
  },
  openPdfText: { color: '#fff', fontWeight: '600' },
  noteBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fffbeb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  noteLabel: { fontSize: 11, fontWeight: '600', color: '#92400e', textTransform: 'uppercase' },
  noteText: { fontSize: 14, color: '#78350f', marginTop: 4 },
});
