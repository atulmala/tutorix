import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { formatExperienceBadgeLabel } from '@tutorix/shared-utils/tutor-detail-formatters';

type ExperienceBadgeProps = {
  totalExperienceMonths?: number | null;
};

export const ExperienceBadge: React.FC<ExperienceBadgeProps> = ({
  totalExperienceMonths,
}) => {
  const label = formatExperienceBadgeLabel(totalExperienceMonths);
  if (!label) {
    return null;
  }

  return (
    <View style={styles.badge} accessibilityRole="text" accessibilityLabel={label}>
      <Text style={styles.star}>★</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    borderRadius: 999,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  star: { color: '#fff', fontSize: 11, fontWeight: '800' },
  label: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
