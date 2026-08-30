import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  EXPERIENCE_MIN_YEAR,
  EXPERIENCE_MONTH_SHORT_LABELS,
  formatExperienceMonthYear,
  parseExperienceMonthYear,
  toExperienceMonthDate,
} from '@tutorix/shared-utils/tutor-experience-form';

type MonthYearPickerFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  placeholder?: string;
  title?: string;
  accessibilityLabel?: string;
};

function isFutureMonth(year: number, month: number, now: Date): boolean {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year > currentYear) return true;
  if (year < currentYear) return false;
  return month > currentMonth;
}

export function MonthYearPickerField({
  value,
  onChange,
  disabled = false,
  hasError = false,
  placeholder = 'Month year',
  title = 'Select month and year',
  accessibilityLabel,
}: MonthYearPickerFieldProps) {
  const [visible, setVisible] = useState(false);
  const [draftYear, setDraftYear] = useState(() => new Date().getFullYear());
  const [draftMonth, setDraftMonth] = useState(() => new Date().getMonth() + 1);
  const [now, setNow] = useState(() => new Date());
  const years = useMemo(() => {
    const currentYear = now.getFullYear();
    const list: number[] = [];
    for (let year = currentYear; year >= EXPERIENCE_MIN_YEAR; year -= 1) {
      list.push(year);
    }
    return list;
  }, [now]);

  const displayLabel = formatExperienceMonthYear(value);

  const openPicker = () => {
    if (disabled) return;
    const current = new Date();
    const parsed = parseExperienceMonthYear(value);
    setNow(current);
    setDraftYear(parsed?.year ?? current.getFullYear());
    setDraftMonth(parsed?.month ?? current.getMonth() + 1);
    setVisible(true);
  };

  const closePicker = () => setVisible(false);

  const handleSelectYear = (year: number) => {
    setDraftYear(year);
    if (isFutureMonth(year, draftMonth, now)) {
      setDraftMonth(now.getMonth() + 1);
    }
  };

  const handleDone = () => {
    if (isFutureMonth(draftYear, draftMonth, now)) {
      return;
    }
    onChange(toExperienceMonthDate(draftYear, draftMonth));
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.field,
          hasError ? styles.fieldError : null,
          disabled ? styles.fieldDisabled : null,
        ]}
        onPress={openPicker}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        <Text style={displayLabel ? styles.fieldText : styles.placeholder}>
          {displayLabel || placeholder}
        </Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>

      <Modal
        transparent
        visible={visible}
        animationType="fade"
        onRequestClose={closePicker}
      >
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.columns}>
              <ScrollView style={styles.column} nestedScrollEnabled>
                {EXPERIENCE_MONTH_SHORT_LABELS.map((label, index) => {
                  const month = index + 1;
                  const selected = month === draftMonth;
                  const monthDisabled = isFutureMonth(draftYear, month, now);
                  return (
                    <TouchableOpacity
                      key={label}
                      style={[
                        styles.option,
                        selected ? styles.optionSelected : null,
                        monthDisabled ? styles.optionDisabled : null,
                      ]}
                      onPress={() => setDraftMonth(month)}
                      disabled={monthDisabled}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selected ? styles.optionTextSelected : null,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <ScrollView style={styles.column} nestedScrollEnabled>
                {years.map((year) => {
                  const selected = year === draftYear;
                  return (
                    <TouchableOpacity
                      key={year}
                      style={[styles.option, selected ? styles.optionSelected : null]}
                      onPress={() => handleSelectYear(year)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selected ? styles.optionTextSelected : null,
                        ]}
                      >
                        {String(year)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={closePicker} style={styles.actionButton}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDone}
                style={styles.actionButton}
                disabled={isFutureMonth(draftYear, draftMonth, now)}
              >
                <Text
                  style={[
                    styles.doneText,
                    isFutureMonth(draftYear, draftMonth, now)
                      ? styles.doneTextDisabled
                      : null,
                  ]}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldError: {
    borderColor: '#dc2626',
  },
  fieldDisabled: {
    opacity: 0.6,
    backgroundColor: '#f1f5f9',
  },
  fieldText: {
    fontSize: 16,
    color: '#0f172a',
    flex: 1,
  },
  placeholder: {
    fontSize: 16,
    color: '#9ca3af',
    flex: 1,
  },
  chevron: {
    fontSize: 10,
    color: '#64748b',
    marginLeft: 8,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    maxHeight: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  columns: {
    flexDirection: 'row',
    gap: 12,
    height: 280,
  },
  column: {
    flex: 1,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    borderRadius: 6,
  },
  optionSelected: {
    backgroundColor: '#eff6ff',
  },
  optionDisabled: {
    opacity: 0.4,
  },
  optionText: {
    fontSize: 16,
    color: '#0f172a',
    textAlign: 'center',
  },
  optionTextSelected: {
    fontWeight: '700',
    color: '#1d4ed8',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 12,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  doneTextDisabled: {
    color: '#94a3b8',
  },
});
