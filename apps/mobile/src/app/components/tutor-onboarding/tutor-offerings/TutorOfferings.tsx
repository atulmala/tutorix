import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@apollo/client';
import { GET_OFFERINGS } from '@tutorix/shared-graphql/queries';
import {
  STUDY_AREAS,
  STUDY_AREAS_OPTIONS,
} from '@tutorix/shared-utils';
import type { StepComponentProps } from '@tutorix/shared-utils';

type OfferingNode = {
  id: number;
  name: string;
  displayName: string;
  level: number;
  order: number;
  parentOffering?: { id: number } | null;
  rootOffering?: { id: number } | null;
};

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const TutorOfferings: React.FC<StepComponentProps> = ({
  onComplete,
  onBack,
}) => {
  const [studyArea, setStudyArea] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [studyAreaModalVisible, setStudyAreaModalVisible] = useState(false);
  const [levelModal, setLevelModal] = useState<{
    levelIndex: number;
  } | null>(null);

  const { data, loading, error } = useQuery<{ offerings: OfferingNode[] }>(
    GET_OFFERINGS,
    { fetchPolicy: 'cache-first' }
  );

  const offerings = useMemo(
    () => data?.offerings ?? [],
    [data?.offerings]
  );

  const rootOfferings = useMemo(() => {
    return offerings.filter((o) => o.parentOffering == null);
  }, [offerings]);

  const rootOfferingForStudyArea = useMemo(() => {
    if (!studyArea) return null;
    const opt = STUDY_AREAS_OPTIONS.find((o) => o.key === studyArea);
    if (!opt) return null;
    return (
      rootOfferings.find(
        (o) => o.displayName === opt.label || o.name === opt.label
      ) ?? null
    );
  }, [studyArea, rootOfferings]);

  const levelsConfig = studyArea ? STUDY_AREAS[studyArea] ?? [] : [];

  const isComplete = useMemo(() => {
    if (!studyArea || !rootOfferingForStudyArea) return false;
    return selectedIds.length === levelsConfig.length;
  }, [
    studyArea,
    rootOfferingForStudyArea,
    selectedIds.length,
    levelsConfig.length,
  ]);

  const handleStudyAreaChange = (value: string) => {
    setStudyArea(value);
    setSelectedIds([]);
    setStudyAreaModalVisible(false);
  };

  const isStringEquals = (a: unknown, b: unknown) =>
    String(a) === String(b);

  const getChildren = (parentId: number) =>
    offerings
      .filter(
        (o) =>
          o.parentOffering != null &&
          isStringEquals(o.parentOffering.id, parentId)
      )
      .sort((a, b) => a.order - b.order || a.id - b.id);

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
    const children = getChildren(parentId);
    const node = children.find((c) => c.id === selectedId);
    return node?.displayName ?? 'Select...';
  };

  if (loading) {
    return (
      <View style={styles.block}>
        <Text style={styles.loadingText}>Loading offerings...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.block}>
        <Text style={styles.errorText}>
          Failed to load offerings. Please try again.
        </Text>
        <View style={styles.buttonRow}>
          {onBack && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onBack}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <Text style={styles.intro}>
        Choose what you want to teach. Select a study area to get started.
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
          const children = getChildren(parentId);
          const selectedId = selectedIds[levelIndex];

          if (children.length === 0 && levelIndex > 0) return null;
          const isBlocked = levelIndex > 0 && !selectedIds[levelIndex - 1];

          return (
            <View key={levelConfig.name} style={styles.inputGroup}>
              <Text style={styles.label}>
                {capitalize(levelConfig.name)}{' '}
                <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.pickerTouch,
                  isBlocked && styles.pickerDisabled,
                ]}
                onPress={() => !isBlocked && setLevelModal({ levelIndex })}
                disabled={isBlocked}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.pickerText,
                    (!selectedId || isBlocked) && styles.pickerPlaceholder,
                  ]}
                >
                  {getSelectedDisplayName(levelIndex)}
                </Text>
                <Text style={styles.pickerChevron}>▼</Text>
              </TouchableOpacity>
            </View>
          );
        })}

      <View style={styles.buttonRow}>
        {onBack && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.primaryButton, !isComplete && styles.primaryButtonDisabled]}
          onPress={onComplete}
          disabled={!isComplete}
          activeOpacity={0.7}
        >
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>

      {/* Study area picker modal */}
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
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setStudyAreaModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Level picker modal */}
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
                    : selectedIds[levelModal.levelIndex - 1] ?? 0
                ).map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.modalOption}
                    onPress={() =>
                      handleLevelSelect(levelModal.levelIndex, c.id)
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalOptionText}>{c.displayName}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setLevelModal(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    gap: 24,
  },
  intro: {
    fontSize: 14,
    color: '#64748b',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  required: {
    color: '#dc2626',
  },
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
  pickerDisabled: {
    opacity: 0.6,
    backgroundColor: '#f1f5f9',
  },
  pickerText: {
    fontSize: 16,
    color: '#0f172a',
  },
  pickerPlaceholder: {
    color: '#9ca3af',
  },
  pickerChevron: {
    fontSize: 10,
    color: '#64748b',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  secondaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  primaryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#5fa8ff',
    minWidth: 100,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#0f172a',
  },
  modalCancel: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
