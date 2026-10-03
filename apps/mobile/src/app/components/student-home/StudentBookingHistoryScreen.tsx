import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { STUDENT_CLASS_BOOKINGS } from '@tutorix/shared-graphql/queries';
import { formatIstBookingDateLabel } from '@tutorix/shared-utils/student-booking';
import {
  formatTutorBookingAmount,
  tutorBookingConclusionLabel,
  tutorBookingModeLabel,
  tutorBookingSchedulingLabel,
} from '@tutorix/shared-utils/tutor-booking-history';

const PAGE_SIZE = 20;

type StudentClassBookingRow = {
  orderItemId: number;
  bookedAt: string;
  tutorId: number;
  tutorName: string;
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

type StudentClassBookingsData = {
  studentClassBookings?: {
    items: StudentClassBookingRow[];
    tutors: { id: number; name: string }[];
    subjects: string[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

type DropdownOption = {
  value: string;
  label: string;
};

function FilterDropdown({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: DropdownOption[];
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value)?.label ?? 'All';

  return (
    <View>
      <Text style={styles.filterLabel}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={styles.dropdown}
      >
        <Text style={styles.dropdownText} numberOfLines={1}>
          {selected}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
      {open ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setOpen(false)}>
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerCard}>
              <Text style={styles.pickerTitle}>{label}</Text>
              <ScrollView style={styles.pickerScroll}>
                {options.map((option) => (
                  <Pressable
                    key={`${label}-${option.value || 'all'}`}
                    onPress={() => {
                      onSelect(option.value);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: option.value === value }}
                    accessibilityLabel={`${label} ${option.label}`}
                    style={styles.pickerOption}
                  >
                    <Text style={styles.pickerOptionText}>{option.label}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel={`Close ${label}`}
                style={styles.pickerCancel}
              >
                <Text style={styles.pickerCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

export const StudentBookingHistoryScreen: React.FC = () => {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<StudentClassBookingRow[]>([]);
  const [tutorId, setTutorId] = useState<number | null>(null);
  const [offeringLabel, setOfferingLabel] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const input = useMemo(
    () => ({
      page,
      pageSize: PAGE_SIZE,
      ...(tutorId ? { tutorId } : {}),
      ...(offeringLabel ? { offeringLabel } : {}),
    }),
    [page, tutorId, offeringLabel],
  );

  const { data, loading, error } = useQuery<StudentClassBookingsData>(STUDENT_CLASS_BOOKINGS, {
    variables: { input },
    fetchPolicy: 'cache-and-network',
  });

  const result = data?.studentClassBookings;
  const tutors = result?.tutors ?? [];
  const subjects = result?.subjects ?? [];

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

  const chooseTutor = (nextTutorId: number | null) => {
    setTutorId(nextTutorId);
    setPage(1);
  };

  const chooseSubject = (nextLabel: string) => {
    setOfferingLabel(nextLabel);
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
          <FilterDropdown
            label="Tutor"
            value={tutorId == null ? '' : String(tutorId)}
            options={[
              { value: '', label: 'All' },
              ...tutors.map((tutor) => ({ value: String(tutor.id), label: tutor.name })),
            ]}
            onSelect={(value) => chooseTutor(value ? Number(value) : null)}
          />
          <FilterDropdown
            label="Subject"
            value={offeringLabel}
            options={[
              { value: '', label: 'All' },
              ...subjects.map((subject) => ({ value: subject, label: subject })),
            ]}
            onSelect={chooseSubject}
          />
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
            <Text style={styles.tutor}>Tutor · {row.tutorName}</Text>
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
          style={styles.loadMore}
        >
          <Text style={styles.loadMoreText}>{loading ? 'Loading…' : 'Load more'}</Text>
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
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  dropdownText: { flex: 1, fontSize: 14, fontWeight: '700', color: '#143055' },
  chevron: { fontSize: 14, fontWeight: '700', color: '#64748b' },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 39, 68, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  pickerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  pickerTitle: { fontSize: 18, fontWeight: '800', color: '#143055', marginBottom: 8 },
  pickerScroll: { maxHeight: 320 },
  pickerOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerOptionText: { fontSize: 16, fontWeight: '600', color: '#143055' },
  pickerCancel: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  pickerCancelText: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  loadMore: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  loadMoreText: { color: '#fff', fontWeight: '700', fontSize: 14 },
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
  tutor: { marginTop: 6, fontSize: 17, fontWeight: '800', color: '#0f2744' },
  offering: { marginTop: 4, fontSize: 15, fontWeight: '700', color: '#1d4ed8' },
  meta: { marginTop: 8, fontSize: 13, fontWeight: '700', color: '#0f766e' },
  status: { marginTop: 3, fontSize: 13, fontWeight: '600', color: '#475569' },
  amount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#059669',
  },
});
