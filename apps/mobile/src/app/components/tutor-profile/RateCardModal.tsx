import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch,
} from 'react-native';
import {
  calculateEffectiveRate,
  formatInr,
  isRateCardComplete,
  rateCardToFormInput,
  RATE_CARD_SLABS,
  validateRateCardForm,
  type RateCardFormInput,
  type RateCardFormValues,
  type RateCardLike,
} from '@tutorix/shared-utils';

type RateCardModeTab = 'offline' | 'online';

type ModeSectionProps = {
  title: string;
  values: RateCardFormInput['offline'];
  onChange: (next: RateCardFormInput['offline']) => void;
  disabled?: boolean;
};

function RateCardModeTabs({
  activeTab,
  onTabChange,
  disabled,
}: {
  activeTab: RateCardModeTab;
  onTabChange: (tab: RateCardModeTab) => void;
  disabled?: boolean;
}) {
  const tabs: { id: RateCardModeTab; label: string }[] = [
    { id: 'offline', label: 'Offline classes' },
    { id: 'online', label: 'Online classes' },
  ];

  return (
    <View style={styles.tabList}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabButton, isActive && styles.tabButtonActive]}
            onPress={() => onTabChange(tab.id)}
            disabled={disabled}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function ModeSection({ title, values, onChange, disabled }: ModeSectionProps) {
  const inputsDisabled = disabled || !values.enabled;
  const baseRateNum = Number.parseInt(values.baseRate.trim(), 10);
  const hasBaseRate = values.enabled && !Number.isNaN(baseRateNum) && baseRateNum >= 1;

  const baseDiscountPct = values.baseDiscountPct.trim()
    ? Number.parseInt(values.baseDiscountPct.trim(), 10)
    : 0;
  const slab2Pct = values.slab2DiscountPct.trim()
    ? Number.parseInt(values.slab2DiscountPct.trim(), 10)
    : 0;
  const slab3Pct = values.slab3DiscountPct.trim()
    ? Number.parseInt(values.slab3DiscountPct.trim(), 10)
    : 0;

  const slabRows = [
    {
      label: RATE_CARD_SLABS[0].label,
      value: values.baseDiscountPct,
      onChangeText: (text: string) =>
        onChange({
          ...values,
          baseDiscountPct: text.replace(/\D/g, '').slice(0, 2),
        }),
      preview: hasBaseRate ? (
        <Text style={styles.slabPreview}>
          → {formatInr(calculateEffectiveRate(baseRateNum, baseDiscountPct))}/class
        </Text>
      ) : (
        <Text style={styles.slabPreview}>Base discount</Text>
      ),
    },
    {
      label: RATE_CARD_SLABS[1].label,
      value: values.slab2DiscountPct,
      onChangeText: (text: string) =>
        onChange({
          ...values,
          slab2DiscountPct: text.replace(/\D/g, '').slice(0, 2),
        }),
      preview: hasBaseRate ? (
        <Text style={styles.slabPreview}>
          → {formatInr(calculateEffectiveRate(baseRateNum, slab2Pct))}/class
        </Text>
      ) : null,
    },
    {
      label: RATE_CARD_SLABS[2].label,
      value: values.slab3DiscountPct,
      onChangeText: (text: string) =>
        onChange({
          ...values,
          slab3DiscountPct: text.replace(/\D/g, '').slice(0, 2),
        }),
      preview: hasBaseRate ? (
        <Text style={styles.slabPreview}>
          → {formatInr(calculateEffectiveRate(baseRateNum, slab3Pct))}/class
        </Text>
      ) : null,
    },
  ];

  return (
    <View style={styles.modeSection}>
      <View style={styles.modeToggleRow}>
        <Switch
          value={values.enabled}
          onValueChange={(enabled) => onChange({ ...values, enabled })}
          disabled={disabled}
          trackColor={{ false: '#e2e8f0', true: '#a78bfa' }}
          thumbColor={values.enabled ? '#7c3aed' : '#f4f4f5'}
        />
        <Text style={styles.modeToggleLabel}>{title}</Text>
      </View>

      <View style={inputsDisabled ? styles.fieldsDisabled : undefined}>
        <Text style={styles.label}>Base rate (per class)</Text>
        <View style={styles.baseRateRow}>
          <Text style={styles.rupeePrefix}>₹</Text>
          <TextInput
            style={[styles.input, styles.baseRateInput, inputsDisabled && styles.inputDisabled]}
            value={values.baseRate}
            onChangeText={(text) =>
              onChange({ ...values, baseRate: text.replace(/\D/g, '') })
            }
            placeholder="500"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            editable={!inputsDisabled}
          />
        </View>

        <Text style={styles.slabSectionTitle}>Bulk booking discounts (% off base rate)</Text>
        <View style={[styles.slabBox, inputsDisabled && styles.slabBoxDisabled]}>
          {slabRows.map((row) => (
            <View key={row.label} style={styles.slabRow}>
              <Text style={styles.slabLabel}>{row.label}</Text>
              <View style={styles.slabInputs}>
                <TextInput
                  style={[styles.slabInput, inputsDisabled && styles.inputDisabled]}
                  value={row.value}
                  onChangeText={row.onChangeText}
                  placeholder="0"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  editable={!inputsDisabled}
                />
                <Text style={styles.percentSign}>%</Text>
                {row.preview}
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

export type RateCardModalProps = {
  visible: boolean;
  offeringName: string;
  initialValues?: RateCardLike | null;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: RateCardFormValues) => void;
};

export function RateCardModal({
  visible,
  offeringName,
  initialValues,
  saving = false,
  error,
  onClose,
  onSubmit,
}: RateCardModalProps) {
  const [form, setForm] = useState<RateCardFormInput>(() => rateCardToFormInput(initialValues));
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RateCardModeTab>('offline');

  useEffect(() => {
    if (!visible) {
      return;
    }
    const nextForm = rateCardToFormInput(initialValues);
    setForm(nextForm);
    setValidationError(null);
    setActiveTab(
      nextForm.online.enabled && !nextForm.offline.enabled ? 'online' : 'offline',
    );
  }, [visible, initialValues]);

  const modalTitle = useMemo(
    () => (isRateCardComplete(initialValues) ? 'Edit rate card' : 'Rate card'),
    [initialValues],
  );

  const handleSubmit = () => {
    const result = validateRateCardForm(form);
    if (result.ok === false) {
      setValidationError(result.message);
      return;
    }
    setValidationError(null);
    onSubmit(result.normalized);
  };

  const displayError = validationError ?? error;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.title}>{modalTitle}</Text>
              <Text style={styles.offeringName} numberOfLines={2}>
                {offeringName}
              </Text>
              <Text style={styles.subtitle}>Set how you charge for this offering.</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close" disabled={saving}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.demoRow}>
              <Switch
                value={form.freeDemoOffered}
                onValueChange={(freeDemoOffered) =>
                  setForm((prev) => ({ ...prev, freeDemoOffered }))
                }
                disabled={saving}
                trackColor={{ false: '#e2e8f0', true: '#a78bfa' }}
                thumbColor={form.freeDemoOffered ? '#7c3aed' : '#f4f4f5'}
              />
              <Text style={styles.demoLabel}>Free demo class for new students</Text>
            </View>

            <RateCardModeTabs activeTab={activeTab} onTabChange={setActiveTab} disabled={saving} />

            <View style={styles.tabPanel}>
              {activeTab === 'offline' ? (
                <ModeSection
                  title="Offer offline classes"
                  values={form.offline}
                  onChange={(offline) => setForm((prev) => ({ ...prev, offline }))}
                  disabled={saving}
                />
              ) : (
                <ModeSection
                  title="Offer online classes"
                  values={form.online}
                  onChange={(online) => setForm((prev) => ({ ...prev, online }))}
                  disabled={saving}
                />
              )}
            </View>

            {displayError ? (
              <Text style={styles.error} accessibilityRole="alert">
                {displayError}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSubmit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save rate card</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 8,
  },
  headerTextBlock: { flex: 1, minWidth: 0 },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  offeringName: { fontSize: 14, color: '#64748b', marginTop: 4 },
  subtitle: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  close: { fontSize: 22, color: '#64748b', paddingLeft: 8 },
  scroll: { maxHeight: '100%' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 28 },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    backgroundColor: '#faf5ff',
    marginBottom: 16,
  },
  demoLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#581c87' },
  tabList: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    backgroundColor: '#faf5ff',
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
  },
  tabButtonText: { fontSize: 13, fontWeight: '600', color: '#7c3aed' },
  tabButtonTextActive: { color: '#581c87' },
  tabPanel: { marginBottom: 8 },
  modeSection: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    backgroundColor: '#faf5ff',
    padding: 14,
  },
  modeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  modeToggleLabel: { fontSize: 14, fontWeight: '600', color: '#581c87' },
  fieldsDisabled: { opacity: 0.65 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
  },
  baseRateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  rupeePrefix: {
    fontSize: 16,
    color: '#64748b',
    marginRight: 8,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  baseRateInput: { flex: 1 },
  inputDisabled: { backgroundColor: '#f8fafc' },
  slabSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b21a8',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  slabBox: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    backgroundColor: 'rgba(255,255,255,0.85)',
    padding: 12,
    gap: 12,
  },
  slabBoxDisabled: { opacity: 0.9 },
  slabRow: { gap: 8 },
  slabLabel: { fontSize: 14, fontWeight: '600', color: '#581c87' },
  slabInputs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  slabInput: {
    width: 56,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 16,
    color: '#0f172a',
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  percentSign: { fontSize: 14, color: '#64748b' },
  slabPreview: { fontSize: 13, color: '#7c3aed' },
  error: { fontSize: 14, color: '#b91c1c', marginTop: 12 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  saveButton: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
