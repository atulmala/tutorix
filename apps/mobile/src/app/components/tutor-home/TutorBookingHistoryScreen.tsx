import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useQuery } from '@apollo/client';
import { TUTOR_CLASS_BOOKINGS } from '@tutorix/shared-graphql/queries';
import { formatIstBookingDateLabel } from '@tutorix/shared-utils/student-booking';
import {
  formatTutorBookingAmount,
  tutorBookingConclusionLabel,
  tutorBookingModeLabel,
  tutorBookingSchedulingLabel,
} from '@tutorix/shared-utils/tutor-booking-history';

const PAGE_SIZE = 20;

type SchedulingStatus = '' | 'unscheduled' | 'scheduled' | 'partial' | 'cancelled';
type ConclusionStatus = '' | 'not_concluded' | 'partial' | 'concluded';

type TutorClassBookingRow = {
  orderItemId: number;
  bookedAt: string;
  studentName: string;
  offeringLabel: string;
  classCount: number;
  deliveryMode: string;
  schedulingStatus: string;
  conclusionStatus?: string | null;
  scheduledCount: number;
  concludedCount: number;
  linePaidInr: number;
  isDemo: boolean;
};

type TutorClassBookingsData = {
  tutorClassBookings?: {
    items: TutorClassBookingRow[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

const SCHEDULING_OPTIONS: { value: SchedulingStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'unscheduled', label: 'Unscheduled' },
  { value: 'partial', label: 'Partial' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'cancelled', label: 'Cancelled' },
];

const CONCLUSION_OPTIONS: { value: ConclusionStatus; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'not_concluded', label: 'Not concluded' },
  { value: 'partial', label: 'Partial' },
  { value: 'concluded', label: 'Concluded' },
];

export const TutorBookingHistoryScreen: React.FC = () => {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TutorClassBookingRow[]>([]);
  const [studentDraft, setStudentDraft] = useState('');
  const [offeringDraft, setOfferingDraft] = useState('');
  const [schedulingDraft, setSchedulingDraft] = useState<SchedulingStatus>('');
  const [conclusionDraft, setConclusionDraft] = useState<ConclusionStatus>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [offeringSearch, setOfferingSearch] = useState('');
  const [schedulingStatus, setSchedulingStatus] = useState<SchedulingStatus>('');
  const [conclusionStatus, setConclusionStatus] = useState<ConclusionStatus>('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const input = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(studentSearch ? { studentSearch } : {}),
      ...(offeringSearch ? { offeringSearch } : {}),
      ...(schedulingStatus ? { schedulingStatus } : {}),
      ...(conclusionStatus ? { conclusionStatus } : {}),
    }),
    [page, studentSearch, offeringSearch, schedulingStatus, conclusionStatus],
  );

  const { data, loading, error } = useQuery<TutorClassBookingsData>(TUTOR_CLASS_BOOKINGS, {
    variables: { input },
    fetchPolicy: 'cache-and-network',
  });

  const result = data?.tutorClassBookings;

  useEffect(() => {
    if (!result || result.page !== page) {
      return;
    }
    setItems((current) => {
      const incoming =
        result.page === 1
          ? result.items
          : [
              ...current,
              ...result.items.filter(
                (item) => !current.some((existing) => existing.orderItemId === item.orderItemId),
              ),
            ];
      if (
        incoming.length === current.length &&
        incoming.every((item, index) => item.orderItemId === current[index]?.orderItemId)
      ) {
        return current;
      }
      return incoming;
    });
  }, [result, page]);

  const runSearch = () => {
    setStudentSearch(studentDraft.trim());
    setOfferingSearch(offeringDraft.trim());
    setSchedulingStatus(schedulingDraft);
    setConclusionStatus(conclusionDraft);
    setPage(1);
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Pressable
        onPress={() => setFiltersOpen((open) => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: filtersOpen }}
        accessibilityLabel="Search bookings"
        style={styles.searchToggle}
      >
        <Text style={styles.searchToggleText}>Search bookings</Text>
      </Pressable>
      {filtersOpen ? (
      <View style={styles.filters}>
        <Text style={styles.filterLabel}>Student</Text>
        <TextInput
          value={studentDraft}
          onChangeText={setStudentDraft}
          placeholder="Email or mobile"
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Student email or mobile"
          style={styles.input}
        />
        <Text style={styles.filterLabel}>Offering</Text>
        <TextInput
          value={offeringDraft}
          onChangeText={setOfferingDraft}
          placeholder="Offering name"
          accessibilityLabel="Offering"
          style={styles.input}
        />
        <Text style={styles.filterLabel}>Scheduling status</Text>
        <View style={styles.chips}>
          {SCHEDULING_OPTIONS.map((option) => {
            const selected = schedulingDraft === option.value;
            return (
              <Pressable
                key={`scheduling-${option.label}`}
                onPress={() => setSchedulingDraft(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Scheduling ${option.label}`}
                style={[styles.chip, selected && styles.chipOn]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextOn]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.filterLabel}>Conclusion status</Text>
        <View style={styles.chips}>
          {CONCLUSION_OPTIONS.map((option) => {
            const selected = conclusionDraft === option.value;
            return (
              <Pressable
                key={`conclusion-${option.label}`}
                onPress={() => setConclusionDraft(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Conclusion ${option.label}`}
                style={[styles.chip, selected && styles.chipOn]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextOn]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={runSearch}
          accessibilityRole="button"
          accessibilityLabel="Search"
          style={styles.searchButton}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>
      ) : null}

      {error ? <Text style={styles.error}>Could not load booking history.</Text> : null}

      {loading && items.length === 0 ? (
        <Text style={styles.empty}>Loading bookings…</Text>
      ) : !error && items.length === 0 ? (
        <Text style={styles.empty}>No bookings found.</Text>
      ) : (
        items.map((row) => (
          <View key={row.orderItemId} style={styles.card}>
            <View style={styles.dateRow}>
              <Text style={styles.date}>{formatIstBookingDateLabel(new Date(row.bookedAt))}</Text>
              <Text style={styles.amount}>{formatTutorBookingAmount(row.linePaidInr)}</Text>
            </View>
            <Text style={styles.student}>Student · {row.studentName}</Text>
            <Text style={styles.offering}>
              {row.offeringLabel}
              {row.isDemo ? ' · Free demo' : ''}
            </Text>
            <Text style={styles.meta}>
              {row.classCount} {row.classCount === 1 ? 'class' : 'classes'} ·{' '}
              {tutorBookingModeLabel(row.deliveryMode)}
            </Text>
            <Text style={styles.status}>Scheduling · {tutorBookingSchedulingLabel(row)}</Text>
            <Text style={styles.status}>Concluded · {tutorBookingConclusionLabel(row)}</Text>
          </View>
        ))
      )}

      {result && page < result.totalPages ? (
        <Pressable
          onPress={() => setPage((current) => current + 1)}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Load more"
          style={styles.searchButton}
        >
          <Text style={styles.searchButtonText}>{loading ? 'Loading…' : 'Load more'}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#e8f4ff' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28, gap: 10 },
  searchToggle: { alignSelf: 'flex-start', paddingVertical: 4 },
  searchToggleText: { fontSize: 15, fontWeight: '800', color: '#2563eb' },
  filters: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  filterLabel: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#143055',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipOn: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#143055' },
  chipTextOn: { color: '#fff' },
  searchButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  empty: { fontSize: 14, lineHeight: 20, color: '#64748b' },
  error: { fontSize: 14, fontWeight: '700', color: '#dc2626' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderLeftWidth: 5,
    borderLeftColor: '#2563eb',
    shadowColor: '#1e3a8a',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  date: { flex: 1, fontSize: 13, fontWeight: '800', color: '#2563eb', letterSpacing: 0.2 },
  student: { marginTop: 6, fontSize: 17, fontWeight: '800', color: '#0f2744' },
  offering: { marginTop: 4, fontSize: 15, fontWeight: '700', color: '#1d4ed8' },
  meta: { marginTop: 8, fontSize: 13, fontWeight: '700', color: '#0f766e' },
  status: { marginTop: 3, fontSize: 13, fontWeight: '600', color: '#475569' },
  amount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
  },
});
