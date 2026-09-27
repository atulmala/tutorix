import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { StudentBookingDraft } from '@tutorix/shared-utils/student-booking';

type StudentTutorBookingConfirmScreenProps = {
  draft: Required<StudentBookingDraft>;
  onBooked: () => void;
  onOpenWallet: () => void;
};

/** Legacy entry point — direct slot booking was replaced by cart checkout + schedule credit. */
export const StudentTutorBookingConfirmScreen: React.FC<
  StudentTutorBookingConfirmScreenProps
> = ({ onBooked }) => {
  return (
    <View style={styles.content}>
      <Text style={styles.title}>Use your class credits</Text>
      <Text style={styles.meta}>
        Paying for a single slot here is no longer supported. Add classes from the tutor profile,
        complete checkout, then schedule each purchased class from home or your credits list.
      </Text>
      <Pressable style={styles.primary} onPress={onBooked} accessibilityRole="button">
        <Text style={styles.primaryText}>Go back</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14 },
  title: { fontSize: 26, fontWeight: '800', color: '#143055' },
  meta: { color: '#64748b', fontSize: 14, lineHeight: 20 },
  primary: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryText: { color: '#fff', fontWeight: '700' },
});
