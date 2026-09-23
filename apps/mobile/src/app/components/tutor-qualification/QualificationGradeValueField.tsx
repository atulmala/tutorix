import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import {
  DIVISION_GRADE_VALUES,
  GradeType,
  getQualificationGradeValuePlaceholder,
} from '@tutorix/shared-utils';

type QualificationGradeValueFieldProps = {
  gradeType: GradeType;
  value: string;
  onChange: (value: string) => void;
  hasError?: boolean;
  disabled?: boolean;
};

export function QualificationGradeValueField({
  gradeType,
  value,
  onChange,
  hasError = false,
  disabled = false,
}: QualificationGradeValueFieldProps) {
  if (gradeType === GradeType.DIVISION) {
    return (
      <View
        style={[styles.divisionRow, hasError && styles.divisionRowError]}
        accessibilityRole="radiogroup"
        accessibilityLabel="Division"
      >
        {DIVISION_GRADE_VALUES.map((division) => {
          const selected = value === division;
          return (
            <TouchableOpacity
              key={division}
              style={[
                styles.divisionOption,
                selected && styles.divisionOptionSelected,
                disabled && styles.divisionOptionDisabled,
              ]}
              onPress={() => onChange(division)}
              disabled={disabled}
              accessibilityRole="radio"
              accessibilityState={{ selected, disabled }}
            >
              <Text
                style={[styles.divisionLabel, selected && styles.divisionLabelSelected]}
              >
                {division}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <TextInput
      style={[styles.input, hasError && styles.inputError]}
      value={value}
      onChangeText={onChange}
      placeholder={getQualificationGradeValuePlaceholder(gradeType)}
      placeholderTextColor="#9ca3af"
      editable={!disabled}
      keyboardType={gradeType === GradeType.CGPA ? 'decimal-pad' : 'default'}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  inputError: { borderColor: '#dc2626' },
  divisionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  divisionRowError: {
    padding: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dc2626',
  },
  divisionOption: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    minWidth: 52,
    alignItems: 'center',
  },
  divisionOptionSelected: {
    borderColor: '#1d4ed8',
    backgroundColor: '#eef3ff',
  },
  divisionOptionDisabled: { opacity: 0.6 },
  divisionLabel: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  divisionLabelSelected: { color: '#1d4ed8' },
});
