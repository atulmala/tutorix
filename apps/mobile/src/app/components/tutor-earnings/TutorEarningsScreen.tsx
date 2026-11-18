import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@apollo/client';
import {
  MY_TUTOR_EARNINGS_SUMMARY,
  MY_TUTOR_MONTHLY_EARNINGS,
  MY_TUTOR_PAYOUT_PERIOD_DETAIL,
  MY_TUTOR_PAYOUT_TRANSFERS,
} from '@tutorix/shared-graphql/queries';
import {
  formatInr,
  formatIstMonthLabel,
  istCurrentYearMonth,
  istMonthBounds,
} from '@tutorix/shared-utils';

type TutorPayoutLineItem = {
  orderItemId: number;
  studentName: string;
  classesInBooking: number;
  rateInr: number;
  concludedInRange: number;
  netPayoutInr: number;
};

type MyTutorPayoutPeriodDetailData = {
  myTutorPayoutPeriodDetail: {
    totalGrossInr: number;
    totalCommissionInr: number;
    totalOnlineChargesInr: number;
    totalPaymentGatewayChargesInr: number;
    totalNetPayoutInr: number;
    items: TutorPayoutLineItem[];
  };
};

type TutorPayoutTransferItem = {
  id: number;
  paidAt: string;
  amountInr: number;
  utrReference?: string | null;
};

type MyTutorPayoutTransfersData = {
  myTutorPayoutTransfers: TutorPayoutTransferItem[];
};

type PayoutPeriodDetail = MyTutorPayoutPeriodDetailData['myTutorPayoutPeriodDetail'];

type TutorEarningsScreenProps = {
  onAddBankDetails?: () => void;
};

type EarningsTab = 'monthly' | 'paid';

function monthValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function parseMonthValue(value: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!m) {
    return null;
  }
  return { year: Number(m[1]), month: Number(m[2]) };
}

const EARLIEST_PAYOUT_MONTH_YEAR = 2020;

function buildMonthOptions(): { value: string; label: string }[] {
  const { year: endYear, month: endMonth } = istCurrentYearMonth();
  const options: { value: string; label: string }[] = [];
  let year = endYear;
  let month = endMonth;
  while (year > EARLIEST_PAYOUT_MONTH_YEAR || (year === EARLIEST_PAYOUT_MONTH_YEAR && month >= 1)) {
    const value = monthValue(year, month);
    options.push({
      value,
      label: formatIstMonthLabel(year, month) ?? value,
    });
    month -= 1;
    if (month < 1) {
      year -= 1;
      month = 12;
    }
    if (year < EARLIEST_PAYOUT_MONTH_YEAR) {
      break;
    }
  }
  return options;
}

function MonthDropdown({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = useMemo(() => buildMonthOptions(), []);
  const parsed = parseMonthValue(value);
  const selectedLabel =
    options.find((option) => option.value === value)?.label ??
    (parsed ? formatIstMonthLabel(parsed.year, parsed.month) : null) ??
    value;

  return (
    <View>
      <Text style={styles.filterLabel}>Month (IST)</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Select month"
        style={styles.dropdown}
      >
        <Text style={styles.dropdownText} numberOfLines={1}>
          {selectedLabel}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </Pressable>
      {open ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setOpen(false)}>
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerCard}>
              <Text style={styles.pickerTitle}>Select month</Text>
              <ScrollView style={styles.pickerScroll}>
                {options.map((option) => (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onSelect(option.value);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: option.value === value }}
                    accessibilityLabel={option.label}
                    style={styles.pickerOption}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        option.value === value ? styles.pickerOptionTextSelected : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Close month picker"
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

export function TutorEarningsScreen({ onAddBankDetails }: TutorEarningsScreenProps) {
  const defaultMonth = istCurrentYearMonth();
  const [tab, setTab] = useState<EarningsTab>('monthly');
  const [monthDraft, setMonthDraft] = useState(monthValue(defaultMonth.year, defaultMonth.month));

  const parsed = parseMonthValue(monthDraft) ?? defaultMonth;

  const { data: summaryData, loading: summaryLoading } = useQuery(MY_TUTOR_EARNINGS_SUMMARY, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: monthlyData, loading: monthlyLoading } = useQuery(MY_TUTOR_MONTHLY_EARNINGS, {
    variables: { input: { year: parsed.year, month: parsed.month } },
    fetchPolicy: 'cache-and-network',
    skip: tab !== 'monthly',
  });
  const { data: transfersData, loading: transfersLoading } = useQuery<MyTutorPayoutTransfersData>(
    MY_TUTOR_PAYOUT_TRANSFERS,
    {
      fetchPolicy: 'cache-and-network',
      skip: tab !== 'paid',
    },
  );

  const summary = summaryData?.myTutorEarningsSummary;
  const monthly = monthlyData?.myTutorMonthlyEarnings;
  const monthBounds = istMonthBounds(parsed.year, parsed.month);
  const detailRange = monthly
    ? { startDate: monthly.startDate, endDate: monthly.endDate }
    : monthBounds
      ? { startDate: monthBounds.startDate, endDate: monthBounds.endDate }
      : null;

  const { data: detailData, loading: detailLoading } = useQuery<MyTutorPayoutPeriodDetailData>(
    MY_TUTOR_PAYOUT_PERIOD_DETAIL,
    {
      variables: { input: detailRange ?? { startDate: '', endDate: '' } },
      skip: !detailRange || tab !== 'monthly',
      fetchPolicy: 'network-only',
    },
  );

  const activeDetail: PayoutPeriodDetail | undefined = detailData?.myTutorPayoutPeriodDetail;
  const payoutLineItems: TutorPayoutLineItem[] = activeDetail?.items ?? [];
  const transfers: TutorPayoutTransferItem[] = transfersData?.myTutorPayoutTransfers ?? [];

  const helpCopy = useMemo(
    () => [
      'You are paid monthly for concluded paid classes (demos are excluded).',
      'Students can raise a refund claim for two days after a class ends.',
      'Classes under dispute or from earlier months may be paid in the next settlement.',
      'Platform commission, online fees, and payment processing are deducted from gross earnings.',
    ],
    [],
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>Monthly estimates until a transfer is marked paid.</Text>

      <View style={styles.tabs}>
        {(['monthly', 'paid'] as const).map((key) => (
          <Pressable
            key={key}
            style={[styles.tab, tab === key ? styles.tabActive : null]}
            onPress={() => setTab(key)}
          >
            <Text style={[styles.tabText, tab === key ? styles.tabTextActive : null]}>
              {key === 'monthly' ? 'By month' : 'Paid to bank'}
            </Text>
          </Pressable>
        ))}
      </View>

      {summaryLoading && !summary ? (
        <ActivityIndicator style={styles.loader} color="#2563eb" />
      ) : null}

      {tab === 'monthly' ? (
        <View style={styles.section}>
          <MonthDropdown value={monthDraft} onSelect={setMonthDraft} />

          {summary && !summary.bankDetailsComplete ? (
            <View style={styles.banner}>
              <Text style={styles.bannerTitle}>Add bank details to receive payouts</Text>
              {onAddBankDetails ? (
                <Pressable style={styles.bannerBtn} onPress={onAddBankDetails}>
                  <Text style={styles.bannerBtnText}>Add bank details</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {(monthlyLoading || summaryLoading) && !monthly ? (
            <ActivityIndicator style={styles.loader} color="#2563eb" />
          ) : null}

          {monthly ? (
            <>
              <View style={styles.card}>
                <Text style={styles.cardEyebrow}>Payable</Text>
                <Text style={styles.cardAmount}>{formatInr(monthly.payable.totalNetPayoutInr)}</Text>
                <Text style={styles.cardSub}>{monthly.monthLabel}</Text>
                <Text style={styles.cardMeta}>{monthly.settlementNote}</Text>
              </View>

              {monthly.inDisputeWindow && monthly.inDisputeWindow.concludedClassCount > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardEyebrowMuted}>In dispute window</Text>
                  <Text style={styles.cardAmountSmall}>
                    {formatInr(monthly.inDisputeWindow.totalNetPayoutInr)}
                  </Text>
                </View>
              ) : null}

              {monthly.underDispute.concludedClassCount > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardEyebrowMuted}>Under dispute</Text>
                  <Text style={styles.cardAmountSmall}>
                    {formatInr(monthly.underDispute.totalNetPayoutInr)}
                  </Text>
                </View>
              ) : null}

              {monthly.carriedForward.concludedClassCount > 0 ? (
                <View style={styles.card}>
                  <Text style={styles.cardEyebrowMuted}>Carried to next payout</Text>
                  <Text style={styles.cardAmountSmall}>
                    {formatInr(monthly.carriedForward.totalNetPayoutInr)}
                  </Text>
                </View>
              ) : null}

              <View style={styles.card}>
                <Text style={styles.breakdownTitle}>Breakdown · {monthly.monthLabel}</Text>
                {detailLoading && !activeDetail ? (
                  <ActivityIndicator style={styles.loader} color="#2563eb" />
                ) : activeDetail ? (
                  <>
                    <Row label="Gross earnings" value={formatInr(activeDetail.totalGrossInr)} bold />
                    <Row label="Net payout" value={formatInr(activeDetail.totalNetPayoutInr)} bold />
                    {payoutLineItems.map((row) => (
                      <View key={row.orderItemId} style={styles.lineItem}>
                        <Text style={styles.lineTitle}>{row.studentName}</Text>
                        <Text style={styles.lineSub}>
                          {row.concludedInRange} of {row.classesInBooking} classes
                        </Text>
                        <Text style={styles.lineNet}>Net {formatInr(row.netPayoutInr)}</Text>
                      </View>
                    ))}
                  </>
                ) : null}
              </View>
            </>
          ) : null}

          <View style={styles.help}>
            <Text style={styles.helpTitle}>How payouts work</Text>
            {helpCopy.map((line) => (
              <Text key={line} style={styles.helpLine}>
                • {line}
              </Text>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          {transfersLoading && transfers.length === 0 ? (
            <ActivityIndicator style={styles.loader} color="#2563eb" />
          ) : transfers.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.lineTitle}>No bank transfers yet</Text>
              <Text style={styles.helpLine}>
                When Tutorix sends your first payout, the amount, date, and UTR will appear here.
              </Text>
            </View>
          ) : (
            transfers.map((tx) => (
              <View key={tx.id} style={styles.card}>
                <Text style={styles.cardAmountSmall}>{formatInr(tx.amountInr)}</Text>
                <Text style={styles.cardSub}>
                  {new Date(tx.paidAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
                {tx.utrReference ? (
                  <Text style={styles.cardMeta}>UTR · {tx.utrReference}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold ? styles.bold : null]}>{label}</Text>
      <Text style={[styles.rowValue, bold ? styles.bold : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  lead: { fontSize: 14, color: '#64748b', marginBottom: 12 },
  filterLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  dropdownText: { flex: 1, fontSize: 16, fontWeight: '700', color: '#143055' },
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
  pickerOptionTextSelected: { color: '#2563eb' },
  pickerCancel: { marginTop: 8, paddingVertical: 12, alignItems: 'center' },
  pickerCancelText: { fontSize: 16, fontWeight: '700', color: '#64748b' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: { flex: 1, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
  tabTextActive: { color: '#143055' },
  section: { gap: 12 },
  loader: { marginVertical: 16 },
  banner: {
    backgroundColor: '#fffbeb',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  bannerTitle: { fontSize: 14, fontWeight: '700', color: '#78350f' },
  bannerBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: '#b45309',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bannerBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
  },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563eb',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardEyebrowMuted: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardAmount: { fontSize: 28, fontWeight: '800', color: '#143055', marginTop: 6 },
  cardAmountSmall: { fontSize: 22, fontWeight: '800', color: '#143055', marginTop: 6 },
  cardSub: { fontSize: 14, color: '#475569', marginTop: 4 },
  cardMeta: { fontSize: 12, color: '#64748b', marginTop: 4 },
  breakdownTitle: { fontSize: 14, fontWeight: '800', color: '#143055', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  rowLabel: { fontSize: 14, color: '#475569', flex: 1 },
  rowValue: { fontSize: 14, color: '#334155' },
  bold: { fontWeight: '800', color: '#143055' },
  lineItem: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  lineTitle: { fontSize: 14, fontWeight: '700', color: '#143055' },
  lineSub: { fontSize: 13, color: '#475569', marginTop: 2 },
  lineNet: { fontSize: 13, fontWeight: '700', color: '#143055', marginTop: 2 },
  help: { backgroundColor: '#eff6ff', borderRadius: 16, padding: 14, marginTop: 8 },
  helpTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1d4ed8',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  helpLine: { fontSize: 13, color: '#143055', lineHeight: 20, marginTop: 4 },
});
