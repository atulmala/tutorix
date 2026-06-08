import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import {
  GET_MY_TUTOR_CALENDAR,
  GET_MY_TUTOR_CALENDAR_UPDATED_TILL,
} from '@tutorix/shared-graphql/queries';
import { SAVE_MY_TUTOR_CALENDAR } from '@tutorix/shared-graphql/mutations';
import {
  BANK_DETAILS_REQUIRED_FOR_RATE_CARD_MESSAGE,
  formatAvailabilityUpdatedTill,
  formatIstDayHeader,
  formatSlotTimeLabel,
  RATE_CARD_REQUIRED_MESSAGE,
  tutorHasAtLeastOneCompleteRateCard,
} from '@tutorix/shared-utils';
import {
  useAvailabilityEditor,
  type CalendarSlotRow,
} from '../../hooks/useAvailabilityEditor';
import type { TutorDetailRecord } from '@tutorix/tutor-detail-ui';

type Offering = TutorDetailRecord['offerings'][number];

type Props = {
  tutor: TutorDetailRecord;
  bankDetailsComplete?: boolean;
  onOpenBankDetails?: () => void;
  onOpenRateCard: (offering: Offering) => void;
};

function CollapsibleHeader({
  title,
  open,
  onToggle,
  variant = 'unlocked',
  updatedTillLabel,
  updatedTillLoading = false,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  variant?: 'unlocked' | 'locked';
  updatedTillLabel?: string | null;
  updatedTillLoading?: boolean;
}) {
  const toggleStyle =
    variant === 'locked' ? styles.toggleBtnLocked : styles.toggleBtnUnlocked;
  const toggleTextStyle =
    variant === 'locked' ? styles.toggleBtnTextLocked : styles.toggleBtnTextUnlocked;
  const statusStyle =
    variant === 'locked' ? styles.updatedTillLocked : styles.updatedTillUnlocked;

  return (
    <View style={styles.collapseHeader}>
      <View style={styles.collapseTitleBlock}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {updatedTillLoading ? (
          <Text style={[styles.updatedTill, statusStyle]}>Loading update status…</Text>
        ) : updatedTillLabel ? (
          <Text style={[styles.updatedTill, statusStyle]}>
            Updated till {updatedTillLabel}
          </Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.toggleBtn, toggleStyle]}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={open ? 'Hide calendar' : 'Show calendar'}
        accessibilityState={{ expanded: open }}
      >
        <Text style={[styles.toggleBtnText, toggleTextStyle]}>
          {open ? 'Hide' : 'Show'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function TutorAvailabilitySection({
  tutor,
  bankDetailsComplete = true,
  onOpenBankDetails,
  onOpenRateCard,
}: Props) {
  const canSet = tutor.canSetAvailability === true;
  const hasRateCard = tutorHasAtLeastOneCompleteRateCard(tutor.offerings);
  const unlocked = canSet && hasRateCard;
  const [open, setOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const rangeEditor = useAvailabilityEditor({ loadedSlots: [], loading: false });
  const { data, loading, refetch } = useQuery(GET_MY_TUTOR_CALENDAR, {
    variables: { from: rangeEditor.rangeStart, to: rangeEditor.rangeEnd },
    skip: !unlocked,
    fetchPolicy: 'network-only',
  });

  const {
    data: updatedTillData,
    loading: updatedTillLoading,
    refetch: refetchUpdatedTill,
  } = useQuery(GET_MY_TUTOR_CALENDAR_UPDATED_TILL, {
    skip: !unlocked,
    fetchPolicy: 'network-only',
  });

  const updatedTillLabel = updatedTillLoading
    ? null
    : updatedTillData?.myTutorCalendarUpdatedTill
      ? formatAvailabilityUpdatedTill(
          new Date(updatedTillData.myTutorCalendarUpdatedTill),
        )
      : null;

  const loadedSlots: CalendarSlotRow[] = data?.myTutorCalendar ?? [];

  const editor = useAvailabilityEditor({ loadedSlots, loading });
  const [saveCalendar, { loading: saving }] = useMutation(SAVE_MY_TUTOR_CALENDAR);

  const navigateWeek = {
    goPrev: () => {
      editor.goPrev();
      rangeEditor.goPrev();
    },
    goNext: () => {
      editor.goNext();
      rangeEditor.goNext();
    },
  };

  const handleSave = async () => {
    setSaveError(null);
    try {
      await saveCalendar({
        variables: {
          input: {
            rangeStart: editor.rangeStart,
            rangeEnd: editor.rangeEnd,
            slotStarts: editor.slotStartsForSave,
          },
        },
      });
      await Promise.all([refetch(), refetchUpdatedTill()]);
      editor.markBaselineSaved();
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'Could not save availability.',
      );
    }
  };

  const toggleCell = useCallback(
    (key: string, disabled: boolean) => {
      if (disabled) return;
      editor.toggleKey(key);
    },
    [editor],
  );

  const firstNeedingRate = tutor.offerings.find(
    (o) => o.status === 'pt_passed' && !o.rateCard?.isComplete,
  );

  if (!unlocked) {
    return (
      <View style={styles.lockedBox}>
        <CollapsibleHeader
          title="My Calendar"
          open={open}
          variant="locked"
          onToggle={() => setOpen((v) => !v)}
        />
        {open ? (
          <View style={styles.collapseBody}>
            <Text style={styles.lockedText}>{RATE_CARD_REQUIRED_MESSAGE}</Text>
            {!bankDetailsComplete ? (
              <>
                <Text style={[styles.lockedText, styles.lockedTextSpaced]}>
                  {BANK_DETAILS_REQUIRED_FOR_RATE_CARD_MESSAGE}
                </Text>
                {onOpenBankDetails ? (
                  <TouchableOpacity
                    style={styles.ctaButtonSecondary}
                    onPress={onOpenBankDetails}
                  >
                    <Text style={styles.ctaButtonSecondaryText}>Enter bank details</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : firstNeedingRate ? (
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => onOpenRateCard(firstNeedingRate)}
              >
                <Text style={styles.ctaButtonText}>Set up rate card</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <CollapsibleHeader
        title="My Calendar"
        open={open}
        onToggle={() => setOpen((v) => !v)}
        updatedTillLabel={updatedTillLabel}
        updatedTillLoading={updatedTillLoading}
      />
      {open ? (
        <View style={styles.collapseBody}>
          <Text style={styles.hint}>
            Tap a slot for available (A). Empty means not available. 1-hour classes.
          </Text>

          <View style={styles.navRow}>
            <TouchableOpacity onPress={navigateWeek.goPrev} style={styles.navBtn}>
              <Text style={styles.navBtnText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.rangeLabel}>{editor.viewLabel}</Text>
            <TouchableOpacity onPress={navigateWeek.goNext} style={styles.navBtn}>
              <Text style={styles.navBtnText}>→</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.cell, styles.cellSelected]}>
                <Text style={styles.cellLetter}>A</Text>
              </View>
              <Text style={styles.legendText}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.cell, styles.cellEmpty]} />
              <Text style={styles.legendText}>Not available</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginVertical: 16 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View>
                <View style={styles.headerRow}>
                  <View style={styles.dateCol}>
                    <Text style={styles.dateColLabel}>Date</Text>
                  </View>
                  {editor.timeSlots.map((slot, timeIndex) => (
                    <TouchableOpacity
                      key={`${slot.hour}-${slot.minute}`}
                      style={styles.timeColHeader}
                      onPress={() => editor.toggleTimeColumn(timeIndex)}
                    >
                      <Text style={styles.timeLabel} numberOfLines={1}>
                        {formatSlotTimeLabel(slot.hour, slot.minute)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <ScrollView style={{ maxHeight: 280 }}>
                  {editor.grid.days.map((day, dayIndex) => {
                    const dayCells = editor.grid.cells[dayIndex] ?? [];
                    return (
                      <View key={day.toISOString()} style={styles.slotRow}>
                        <View style={styles.dateCol}>
                          <TouchableOpacity onPress={() => editor.toggleDayRow(dayIndex)}>
                            <Text style={styles.dayLabel} numberOfLines={1}>
                              {formatIstDayHeader(day)}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => editor.clearDay(dayIndex)}>
                            <Text style={styles.clearDay}>Clear</Text>
                          </TouchableOpacity>
                        </View>
                        {dayCells.map((cell) => {
                          const selected = editor.selectedKeys.has(cell.key);
                          return (
                            <TouchableOpacity
                              key={cell.key}
                              disabled={cell.disabled}
                              style={[
                                styles.cell,
                                cell.disabled && styles.cellDisabled,
                                selected && styles.cellSelected,
                                !selected && !cell.disabled && styles.cellEmpty,
                              ]}
                              onPress={() => toggleCell(cell.key, cell.disabled)}
                            >
                              {selected ? (
                                <Text style={styles.cellLetter}>A</Text>
                              ) : null}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            </ScrollView>
          )}

          <View style={styles.footer}>
            <Text style={editor.isDirty ? styles.dirty : styles.saved}>
              {editor.isDirty ? 'Unsaved changes' : 'All changes saved'}
            </Text>
            <TouchableOpacity
              style={[styles.saveBtn, (!editor.isDirty || saving) && styles.saveBtnDisabled]}
              disabled={!editor.isDirty || saving || loading}
              onPress={() => void handleSave()}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
          {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#99f6e4',
    backgroundColor: '#f0fdfa',
  },
  lockedBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
  },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  collapseTitleBlock: { flex: 1, minWidth: 0 },
  updatedTill: { marginTop: 2, fontSize: 12 },
  updatedTillUnlocked: { color: '#115e59' },
  updatedTillLocked: { color: '#92400e' },
  collapseBody: { marginTop: 10 },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleBtnUnlocked: {
    borderColor: '#5eead4',
    backgroundColor: '#fff',
  },
  toggleBtnLocked: {
    borderColor: '#fcd34d',
    backgroundColor: '#fff',
  },
  toggleBtnText: { fontSize: 14, fontWeight: '600' },
  toggleBtnTextUnlocked: { color: '#0f766e' },
  toggleBtnTextLocked: { color: '#92400e' },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f766e',
  },
  hint: {
    marginBottom: 10,
    fontSize: 12,
    color: '#115e59',
  },
  lockedText: {
    fontSize: 14,
    color: '#92400e',
  },
  lockedTextSpaced: {
    marginTop: 8,
  },
  ctaButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#d97706',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  ctaButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  ctaButtonSecondary: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#fbbf24',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  ctaButtonSecondaryText: {
    color: '#92400e',
    fontWeight: '600',
    fontSize: 14,
  },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  navBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  navBtnText: { fontSize: 16, color: '#334155' },
  rangeLabel: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '600', color: '#0f172a' },
  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 11, color: '#64748b' },
  headerRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  slotRow: { flexDirection: 'row', alignItems: 'center' },
  dateCol: { width: 56, paddingVertical: 4, paddingRight: 4 },
  dateColLabel: { fontSize: 9, fontWeight: '600', color: '#64748b' },
  timeColHeader: { width: 40, alignItems: 'center', paddingVertical: 4 },
  dayLabel: { fontSize: 10, fontWeight: '600', color: '#334155' },
  clearDay: { fontSize: 8, color: '#0284c7', marginTop: 2 },
  timeLabel: { fontSize: 8, color: '#64748b', textAlign: 'center' },
  cell: {
    width: 22,
    height: 22,
    margin: 2,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellEmpty: { borderColor: '#cbd5e1', backgroundColor: '#fff' },
  cellDisabled: { backgroundColor: '#f1f5f9', opacity: 0.5, borderColor: 'transparent' },
  cellSelected: { backgroundColor: '#10b981', borderColor: '#059669' },
  cellLetter: { fontSize: 10, fontWeight: '700', color: '#fff' },
  footer: { marginTop: 12, gap: 8 },
  dirty: { fontSize: 13, color: '#b45309' },
  saved: { fontSize: 13, color: '#64748b' },
  saveBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  error: { marginTop: 8, fontSize: 13, color: '#dc2626' },
});
