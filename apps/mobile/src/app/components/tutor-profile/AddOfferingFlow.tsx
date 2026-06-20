import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { GET_OFFERINGS, GET_MY_TUTOR_DETAIL, GET_PLATFORM_FEE } from '@tutorix/shared-graphql/queries';
import { ADD_MY_TUTOR_OFFERING } from '@tutorix/shared-graphql/mutations';
import { STUDY_AREAS, STUDY_AREAS_OPTIONS, formatProficiencyTestFeeMessage } from '@tutorix/shared-utils';
import { TutorPT } from '../tutor-onboarding/tutor-pt/TutorPT';

type OfferingNode = {
  id: number;
  name: string;
  displayName: string;
  level: number;
  order: number;
  parentOffering?: { id: number } | null;
};

type Step = 'select' | 'confirm' | 'pt';

type Props = {
  excludeOfferingIds: number[];
  testTutor?: boolean;
  onClose: () => void;
  onComplete: () => void;
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const AddOfferingFlow: React.FC<Props> = ({
  excludeOfferingIds,
  testTutor,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState<Step>('select');
  const [studyArea, setStudyArea] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [studyAreaModalVisible, setStudyAreaModalVisible] = useState(false);
  const [levelModal, setLevelModal] = useState<{ levelIndex: number } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [addResult, setAddResult] = useState<{
    tutorOfferingId: number;
    offeringName?: string;
    ptFeeLabel: string;
  } | null>(null);

  const excludeSet = useMemo(() => new Set(excludeOfferingIds), [excludeOfferingIds]);

  const { data, loading, error } = useQuery<{ offerings: OfferingNode[] }>(GET_OFFERINGS, {
    fetchPolicy: 'cache-first',
  });
  const { data: ptFeeConfigData } = useQuery(GET_PLATFORM_FEE, {
    variables: { code: 'PROFICIENCY_TEST' },
  });
  const ptFeeConfig = ptFeeConfigData?.platformFee;
  const ptFeeConfirmMessage = ptFeeConfig
    ? formatProficiencyTestFeeMessage({
        listPriceInr: ptFeeConfig.amountInr,
        amountDueInr: ptFeeConfig.effectiveAmountInr,
        effectiveAmountInr: ptFeeConfig.effectiveAmountInr,
        displayName: ptFeeConfig.displayName,
        promoMessage: ptFeeConfig.promoMessage,
      })
    : undefined;

  const [addOffering, { loading: adding }] = useMutation(ADD_MY_TUTOR_OFFERING, {
    refetchQueries: [{ query: GET_MY_TUTOR_DETAIL }],
  });

  const offerings = useMemo(() => data?.offerings ?? [], [data?.offerings]);

  const rootOfferings = useMemo(
    () => offerings.filter((o) => o.parentOffering == null),
    [offerings],
  );

  const rootOfferingForStudyArea = useMemo(() => {
    if (!studyArea) return null;
    const opt = STUDY_AREAS_OPTIONS.find((o) => o.key === studyArea);
    if (!opt) return null;
    return (
      rootOfferings.find(
        (o) => o.displayName === opt.label || o.name === opt.label,
      ) ?? null
    );
  }, [studyArea, rootOfferings]);

  const levelsConfig = studyArea ? (STUDY_AREAS[studyArea] ?? []) : [];

  const isComplete = useMemo(() => {
    if (!studyArea || !rootOfferingForStudyArea) return false;
    return selectedIds.length === levelsConfig.length;
  }, [studyArea, rootOfferingForStudyArea, selectedIds.length, levelsConfig.length]);

  const leafOfferingId = selectedIds[selectedIds.length - 1];
  const leafExcluded = leafOfferingId != null && excludeSet.has(leafOfferingId);

  const isStringEquals = (a: unknown, b: unknown) => String(a) === String(b);

  const getChildren = (parentId: number, levelIndex: number) => {
    const children = offerings
      .filter(
        (o) =>
          o.parentOffering != null &&
          isStringEquals(o.parentOffering.id, parentId),
      )
      .sort((a, b) => a.order - b.order || a.id - b.id);
    const isLeafLevel = levelIndex === levelsConfig.length - 1;
    if (!isLeafLevel) return children;
    return children.filter((c) => !excludeSet.has(c.id));
  };

  const handleStudyAreaChange = (value: string) => {
    setStudyArea(value);
    setSelectedIds([]);
    setStudyAreaModalVisible(false);
  };

  const handleLevelSelect = (levelIndex: number, offeringId: number) => {
    setSelectedIds((prev) => {
      const next = prev.slice(0, levelIndex + 1);
      next[levelIndex] = offeringId;
      return next;
    });
    setLevelModal(null);
  };

  const getSelectedDisplayName = (levelIndex: number): string => {
    const selectedId = selectedIds[levelIndex];
    if (!selectedId) return 'Select...';
    const parentId =
      levelIndex === 0
        ? rootOfferingForStudyArea?.id ?? 0
        : selectedIds[levelIndex - 1] ?? 0;
    const children = getChildren(parentId, levelIndex);
    const node = children.find((c) => c.id === selectedId);
    return node?.displayName ?? 'Select...';
  };

  const handleNextFromSelect = () => {
    if (!leafOfferingId || leafExcluded) {
      setSubmitError('You already teach this offering. Choose another subject.');
      return;
    }
    setSubmitError(null);
    setStep('confirm');
  };

  const handleConfirmAdd = async () => {
    if (!leafOfferingId) return;
    setSubmitError(null);
    try {
      const result = await addOffering({
        variables: { offeringId: leafOfferingId },
      });
      const payload = result.data?.addMyTutorOffering;
      if (!payload) return;
      setAddResult({
        tutorOfferingId: payload.tutorOffering.id,
        offeringName: payload.tutorOffering.offering?.displayName,
        ptFeeLabel: payload.ptFee.displayLabel,
      });
      setStep('pt');
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Could not add offering.',
      );
    }
  };

  if (step === 'pt' && addResult) {
    return (
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <TutorPT
          context="addOffering"
          tutorOfferingId={addResult.tutorOfferingId}
          offeringDisplayName={addResult.offeringName}
          testTutor={testTutor}
          onComplete={() => {
            onComplete();
            onClose();
          }}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Add offering</Text>
          <Text style={styles.subtitle}>
            Select a new subject, then pass the proficiency test.
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
          <Text style={styles.closeLink}>Close</Text>
        </TouchableOpacity>
      </View>

      {step === 'select' ? (
        <View style={styles.block}>
          {loading ? (
            <ActivityIndicator size="large" color="#5fa8ff" />
          ) : error ? (
            <Text style={styles.errorText}>Failed to load offerings.</Text>
          ) : (
            <>
              <Text style={styles.intro}>
                Select study area, board, class, and subject for the new offering.
              </Text>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Study area <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  style={styles.pickerTouch}
                  onPress={() => setStudyAreaModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pickerText}>
                    {studyArea
                      ? STUDY_AREAS_OPTIONS.find((o) => o.key === studyArea)?.label ??
                        'Select...'
                      : 'Select...'}
                  </Text>
                  <Text style={styles.pickerChevron}>▼</Text>
                </TouchableOpacity>
              </View>
              {studyArea &&
                rootOfferingForStudyArea &&
                levelsConfig.map((levelConfig, levelIndex) => {
                  const parentId =
                    levelIndex === 0
                      ? rootOfferingForStudyArea.id
                      : selectedIds[levelIndex - 1] ?? 0;
                  const children = getChildren(parentId, levelIndex);
                  const isBlocked = levelIndex > 0 && !selectedIds[levelIndex - 1];
                  if (children.length === 0 && levelIndex > 0) return null;

                  return (
                    <View key={levelConfig.name} style={styles.inputGroup}>
                      <Text style={styles.label}>
                        {capitalize(levelConfig.name)}{' '}
                        <Text style={styles.required}>*</Text>
                      </Text>
                      <TouchableOpacity
                        style={[styles.pickerTouch, isBlocked && styles.pickerDisabled]}
                        onPress={() => !isBlocked && setLevelModal({ levelIndex })}
                        disabled={isBlocked}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.pickerText,
                            (!selectedIds[levelIndex] || isBlocked) &&
                              styles.pickerPlaceholder,
                          ]}
                        >
                          {getSelectedDisplayName(levelIndex)}
                        </Text>
                        <Text style={styles.pickerChevron}>▼</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!isComplete || leafExcluded) && styles.primaryButtonDisabled,
                ]}
                onPress={handleNextFromSelect}
                disabled={!isComplete || leafExcluded}
                activeOpacity={0.7}
              >
                <Text style={styles.primaryButtonText}>Next</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : null}

      {step === 'confirm' ? (
        <View style={styles.block}>
          <View style={styles.feeBox}>
            <Text style={styles.feeTitle}>Proficiency test fee</Text>
            <Text style={styles.feeText}>
              {ptFeeConfirmMessage ?? 'Loading fee details…'}
            </Text>
            <Text style={styles.feeHint}>You get up to 2 attempts to pass the test.</Text>
          </View>
          {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setStep('select')}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, adding && styles.primaryButtonDisabled]}
              onPress={handleConfirmAdd}
              disabled={adding}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>
                {adding ? 'Adding…' : 'Continue to test'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <Modal
        visible={studyAreaModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStudyAreaModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStudyAreaModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Study area</Text>
            {STUDY_AREAS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={styles.modalOption}
                onPress={() => handleStudyAreaChange(opt.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalOptionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={levelModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLevelModal(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLevelModal(null)}
        >
          <View style={styles.modalContent}>
            {levelModal !== null && levelsConfig[levelModal.levelIndex] && (
              <>
                <Text style={styles.modalTitle}>
                  {capitalize(levelsConfig[levelModal.levelIndex].name)}
                </Text>
                {getChildren(
                  levelModal.levelIndex === 0
                    ? rootOfferingForStudyArea?.id ?? 0
                    : selectedIds[levelModal.levelIndex - 1] ?? 0,
                  levelModal.levelIndex,
                ).map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.modalOption}
                    onPress={() => handleLevelSelect(levelModal.levelIndex, c.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalOptionText}>{c.displayName}</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  closeLink: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  block: { gap: 16 },
  intro: { fontSize: 14, color: '#64748b' },
  inputGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: '500', color: '#0f172a' },
  required: { color: '#dc2626' },
  pickerTouch: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerDisabled: { opacity: 0.6, backgroundColor: '#f1f5f9' },
  pickerText: { fontSize: 16, color: '#0f172a' },
  pickerPlaceholder: { color: '#9ca3af' },
  pickerChevron: { fontSize: 10, color: '#64748b' },
  feeBox: {
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    gap: 6,
  },
  feeTitle: { fontSize: 14, fontWeight: '600', color: '#78350f' },
  feeText: { fontSize: 14, color: '#92400e' },
  feeHighlight: { fontSize: 14, fontWeight: '600', color: '#92400e' },
  feeHint: { fontSize: 12, color: '#a16207', marginTop: 4 },
  errorText: { fontSize: 14, color: '#dc2626' },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  secondaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  primaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#5fa8ff',
    alignItems: 'center',
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalOptionText: { fontSize: 16, color: '#0f172a' },
});
