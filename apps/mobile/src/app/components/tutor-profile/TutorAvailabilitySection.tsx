import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@apollo/client';
import {
  GET_MY_TUTOR_CALENDAR_UPDATED_TILL,
} from '@tutorix/shared-graphql/queries';
import {
  BANK_DETAILS_REQUIRED_FOR_RATE_CARD_MESSAGE,
  formatAvailabilityUpdatedTill,
  offeringCoveredBySharedRateCard,
  RATE_CARD_REQUIRED_MESSAGE,
  tutorHasAtLeastOneCompleteRateCard,
} from '@tutorix/shared-utils';
import type { TutorDetailRecord } from '@tutorix/tutor-detail-ui';
import { WeeklyAvailabilityEditor } from './WeeklyAvailabilityEditor';

type Offering = TutorDetailRecord['offerings'][number];

type Props = {
  tutor: TutorDetailRecord;
  bankDetailsComplete?: boolean;
  onOpenBankDetails?: () => void;
  onOpenRateCard: (offering: Offering) => void;
  /** Profile: link to calendar screen. Calendar screen: full editor. */
  mode?: 'summary' | 'editor';
  onOpenCalendar?: () => void;
  onSaved?: () => void;
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
  mode = 'summary',
  onOpenCalendar,
  onSaved,
}: Props) {
  const canSet = tutor.canSetAvailability === true;
  const hasRateCard = tutorHasAtLeastOneCompleteRateCard(tutor.offerings);
  const unlocked = canSet && hasRateCard;
  const [open, setOpen] = useState(mode === 'editor');
  const [saveError, setSaveError] = useState<string | null>(null);
  const isEditor = mode === 'editor';

  const {
    data: updatedTillData,
    loading: updatedTillLoading,
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

  const firstNeedingRate = tutor.offerings.find(
    (o) => o.status === 'pt_passed' && !offeringCoveredBySharedRateCard(tutor.offerings, o),
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

  if (isEditor) {
    return (
      <View style={styles.editorRoot}>
        {updatedTillLoading ? (
          <Text style={[styles.updatedTill, styles.updatedTillUnlocked]}>
            Loading update status…
          </Text>
        ) : updatedTillLabel ? (
          <Text style={[styles.updatedTill, styles.updatedTillUnlocked]}>
            Updated till {updatedTillLabel}
          </Text>
        ) : null}
        <WeeklyAvailabilityEditor onSaveError={setSaveError} onSaved={onSaved} />
        {saveError ? <Text style={styles.error}>{saveError}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>My Calendar</Text>
      {updatedTillLoading ? (
        <Text style={[styles.updatedTill, styles.updatedTillUnlocked]}>
          Loading update status…
        </Text>
      ) : updatedTillLabel ? (
        <Text style={[styles.updatedTill, styles.updatedTillUnlocked]}>
          Updated till {updatedTillLabel}
        </Text>
      ) : (
        <Text style={styles.summaryHint}>Set your repeating weekly availability.</Text>
      )}
      {onOpenCalendar ? (
        <TouchableOpacity
          style={styles.openCalendarBtn}
          onPress={onOpenCalendar}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Manage weekly schedule"
        >
          <Text style={styles.openCalendarBtnText}>Manage weekly schedule</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const SLOT_COL_WIDTH = 40;
const DATE_COL_WIDTH = 56;
const GRID_HEADER_HEIGHT = 28;
const GRID_ROW_HEIGHT = 44;

const styles = StyleSheet.create({
  editorRoot: {
    gap: 8,
  },
  section: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#99f6e4',
    backgroundColor: '#f0fdfa',
    gap: 8,
  },
  summaryHint: {
    fontSize: 13,
    color: '#115e59',
    lineHeight: 18,
  },
  openCalendarBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  openCalendarBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
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
  gridVScroll: { maxHeight: 280 },
  gridWrap: { flexDirection: 'row', alignItems: 'flex-start' },
  dateColSticky: {
    width: DATE_COL_WIDTH,
    zIndex: 2,
    backgroundColor: '#f0fdfa',
    borderRightWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateHeaderCell: {
    height: GRID_HEADER_HEIGHT,
    justifyContent: 'center',
    paddingRight: 4,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateRowCell: {
    height: GRID_ROW_HEIGHT,
    justifyContent: 'center',
    paddingRight: 4,
  },
  slotsHScroll: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    height: GRID_HEADER_HEIGHT,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  slotRow: {
    flexDirection: 'row',
    height: GRID_ROW_HEIGHT,
    alignItems: 'center',
  },
  dateColLabel: { fontSize: 9, fontWeight: '600', color: '#64748b' },
  timeColHeader: {
    width: SLOT_COL_WIDTH,
    height: GRID_HEADER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayLabel: { fontSize: 10, fontWeight: '600', color: '#334155' },
  clearDay: { fontSize: 8, color: '#0284c7', marginTop: 2 },
  timeLabel: { fontSize: 8, color: '#64748b', textAlign: 'center', width: '100%' },
  cell: {
    width: SLOT_COL_WIDTH,
    height: 22,
    marginVertical: 2,
    marginHorizontal: 0,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendCell: {
    width: 22,
    height: 22,
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
