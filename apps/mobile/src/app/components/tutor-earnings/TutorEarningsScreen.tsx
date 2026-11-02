import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@apollo/client';
import {
  MY_TUTOR_EARNINGS_SUMMARY,
  MY_TUTOR_PAYOUT_PERIOD_DETAIL,
  MY_TUTOR_PAYOUT_TRANSFERS,
} from '@tutorix/shared-graphql/queries';
import { formatInr, formatIstDateRangeLabel } from '@tutorix/shared-utils';

type PeriodTotals = {
  startDate: string;
  endDate: string;
  concludedClassCount: number;
  totalNetPayoutInr: number;
};

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

type EarningsTab = 'upcoming' | 'paid';

function periodLabel(period: PeriodTotals | null | undefined): string {
  if (!period) {
    return '';
  }
  return formatIstDateRangeLabel(period.startDate, period.endDate) ?? `${period.startDate} – ${period.endDate}`;
}

export function TutorEarningsScreen({ onAddBankDetails }: TutorEarningsScreenProps) {
  const [tab, setTab] = useState<EarningsTab>('upcoming');
  const [detailPeriod, setDetailPeriod] = useState<{ startDate: string; endDate: string } | null>(
    null,
  );

  const { data: summaryData, loading: summaryLoading } = useQuery(MY_TUTOR_EARNINGS_SUMMARY, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: transfersData, loading: transfersLoading } = useQuery<MyTutorPayoutTransfersData>(
    MY_TUTOR_PAYOUT_TRANSFERS,
    {
      fetchPolicy: 'cache-and-network',
      skip: tab !== 'paid',
    },
  );

  const summary = summaryData?.myTutorEarningsSummary;
  const nextPayout = summary?.nextPayout;
  const inHold = summary?.inHold;

  const detailInput = detailPeriod ?? nextPayout ?? null;
  const { data: detailData, loading: detailLoading } = useQuery<MyTutorPayoutPeriodDetailData>(
    MY_TUTOR_PAYOUT_PERIOD_DETAIL,
    {
      variables: {
        input: {
          startDate: detailInput?.startDate ?? '',
          endDate: detailInput?.endDate ?? '',
        },
      },
      skip: !detailInput || tab !== 'upcoming',
      fetchPolicy: 'network-only',
    },
  );

  const activeDetail: PayoutPeriodDetail | undefined = detailData?.myTutorPayoutPeriodDetail;
  const payoutLineItems: TutorPayoutLineItem[] = activeDetail?.items ?? [];
  const transfers: TutorPayoutTransferItem[] = transfersData?.myTutorPayoutTransfers ?? [];
  const showDetailFor = detailPeriod ?? nextPayout;

  const helpCopy = useMemo(
    () => [
      'You are paid for concluded paid classes (free demos are not included).',
      'After a class ends, earnings stay in a short hold before they are included in the next bank transfer.',
      'Platform commission, online class fees, and payment processing are deducted from gross earnings.',
    ],
    [],
  );

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.lead}>Estimated amounts until a transfer is marked paid.</Text>

      <View style={styles.tabs}>
        {(['upcoming', 'paid'] as const).map((key) => (
          <Pressable
            key={key}
            style={[styles.tab, tab === key ? styles.tabActive : null]}
            onPress={() => {
              setTab(key);
              setDetailPeriod(null);
            }}
          >
            <Text style={[styles.tabText, tab === key ? styles.tabTextActive : null]}>
              {key === 'upcoming' ? 'On the way' : 'Paid to bank'}
            </Text>
          </Pressable>
        ))}
      </View>

      {summaryLoading && !summary ? (
        <ActivityIndicator style={styles.loader} color="#2563eb" />
      ) : null}

      {tab === 'upcoming' ? (
        <View style={styles.section}>
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

          {nextPayout ? (
            <Pressable
              style={styles.card}
              onPress={() =>
                setDetailPeriod({ startDate: nextPayout.startDate, endDate: nextPayout.endDate })
              }
            >
              <Text style={styles.cardEyebrow}>Next bank transfer</Text>
              <Text style={styles.cardAmount}>{formatInr(nextPayout.totalNetPayoutInr)}</Text>
              <Text style={styles.cardSub}>{periodLabel(nextPayout)} (IST)</Text>
              <Text style={styles.cardMeta}>
                {nextPayout.concludedClassCount}{' '}
                {nextPayout.concludedClassCount === 1 ? 'class' : 'classes'} · Estimated
              </Text>
            </Pressable>
          ) : null}

          {inHold && inHold.concludedClassCount > 0 ? (
            <Pressable
              style={styles.card}
              onPress={() =>
                setDetailPeriod({ startDate: inHold.startDate, endDate: inHold.endDate })
              }
            >
              <Text style={styles.cardEyebrowMuted}>Still in hold</Text>
              <Text style={styles.cardAmountSmall}>{formatInr(inHold.totalNetPayoutInr)}</Text>
              <Text style={styles.cardSub}>{periodLabel(inHold)} (IST)</Text>
              <Text style={styles.cardMeta}>
                {inHold.concludedClassCount}{' '}
                {inHold.concludedClassCount === 1 ? 'class' : 'classes'} · Estimated
              </Text>
            </Pressable>
          ) : null}

          {showDetailFor ? (
            <View style={styles.card}>
              <Text style={styles.breakdownTitle}>
                Breakdown · {periodLabel(showDetailFor)}
              </Text>
              {detailLoading && !activeDetail ? (
                <ActivityIndicator style={styles.loader} color="#2563eb" />
              ) : activeDetail ? (
                <>
                  <Row label="Gross earnings" value={formatInr(activeDetail.totalGrossInr)} bold />
                  <Row label="Commission" value={`−${formatInr(activeDetail.totalCommissionInr)}`} />
                  <Row
                    label="Online class charges"
                    value={`−${formatInr(activeDetail.totalOnlineChargesInr)}`}
                  />
                  <Row
                    label="Payment processing"
                    value={`−${formatInr(activeDetail.totalPaymentGatewayChargesInr)}`}
                  />
                  <Row label="Net payout" value={formatInr(activeDetail.totalNetPayoutInr)} bold />
                  {payoutLineItems.map((row) => (
                    <View key={row.orderItemId} style={styles.lineItem}>
                      <Text style={styles.lineTitle}>{row.studentName}</Text>
                      <Text style={styles.lineSub}>
                        {row.concludedInRange} of {row.classesInBooking} classes ·{' '}
                        {formatInr(row.rateInr)}/class
                      </Text>
                      <Text style={styles.lineNet}>Net {formatInr(row.netPayoutInr)}</Text>
                    </View>
                  ))}
                </>
              ) : null}
            </View>
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
