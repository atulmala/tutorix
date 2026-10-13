import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from '../SafeAreaView';
import { CartChip } from '../student-cart/CartChip';
import { LogoutIcon } from '../LogoutIcon';
import { BRAND_NAME } from '../../config';

type StudentHomeHeaderProps = {
  onOpenCart?: () => void;
  onLogout: () => void;
};

export const StudentHomeHeader: React.FC<StudentHomeHeaderProps> = ({
  onOpenCart,
  onLogout,
}) => {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.row}>
        <Text style={styles.brand}>{BRAND_NAME}</Text>
        <View style={styles.right}>
          {onOpenCart ? <CartChip onOpenCart={onOpenCart} /> : null}
          <Pressable
            onPress={onLogout}
            accessibilityRole="button"
            accessibilityLabel="Logout"
            style={styles.logoutButton}
          >
            <LogoutIcon size={22} color="#0f172a" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { backgroundColor: '#e8f4ff' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  brand: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoutButton: { padding: 4 },
});
