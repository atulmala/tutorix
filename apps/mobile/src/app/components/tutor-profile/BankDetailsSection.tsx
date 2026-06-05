import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatGstDisplay } from '@tutorix/shared-utils';
import type { TutorDetailRecord } from '@tutorix/tutor-detail-ui';

type BankDetails = NonNullable<TutorDetailRecord['user']>['bankDetails'];

type BankDetailsSectionProps = {
  bankDetails?: BankDetails;
  onEnterOrEdit?: () => void;
};

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue} numberOfLines={1}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

export function BankDetailsSection({ bankDetails, onEnterOrEdit }: BankDetailsSectionProps) {
  const isComplete = Boolean(bankDetails?.isComplete);
  const gstDisplay = formatGstDisplay(bankDetails?.gstNumber) ?? 'Not Applicable';

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Bank details</Text>

      {!isComplete ? (
        <View style={styles.incompleteRow}>
          <Text style={styles.muted}>To be entered</Text>
          {onEnterOrEdit ? (
            <TouchableOpacity style={styles.primaryButton} onPress={onEnterOrEdit} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>Enter bank details</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View style={styles.completeBlock}>
          <View style={styles.gridCard}>
            <View style={styles.gridRow}>
              <DetailField label="Bank name" value={bankDetails?.bankName} />
              <DetailField label="Account no" value={bankDetails?.accountNumberMasked} />
            </View>
            <View style={styles.gridRow}>
              <DetailField label="IFSC code" value={bankDetails?.ifscCode} />
              <DetailField label="PAN" value={bankDetails?.panNumber} />
            </View>
            <View style={styles.gridRow}>
              <DetailField label="GST" value={gstDisplay} />
            </View>
          </View>
          {onEnterOrEdit ? (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onEnterOrEdit}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Edit bank details</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#99f6e4',
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f766e',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  incompleteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  completeBlock: { gap: 12 },
  gridCard: {
    backgroundColor: '#f0fdfa',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccfbf1',
    padding: 10,
    gap: 10,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f766e',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fieldValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#134e4a',
    marginTop: 2,
  },
  muted: { fontSize: 14, color: '#64748b' },
  primaryButton: {
    backgroundColor: '#0d9488',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#99f6e4',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#0f766e',
    fontSize: 14,
    fontWeight: '600',
  },
});
