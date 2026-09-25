import React from 'react';
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { MY_CART } from '@tutorix/shared-graphql/queries';

type CartChipProps = {
  onOpenCart?: () => void;
};

export const CartChip: React.FC<CartChipProps> = ({ onOpenCart }) => {
  const { data } = useQuery(MY_CART, {
    fetchPolicy: 'cache-and-network',
  });
  const itemCount = (data?.myCart?.itemCount ?? 0) as number;

  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={onOpenCart}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={itemCount ? `Cart, ${itemCount} classes` : 'Cart'}
    >
      <Text style={styles.label}>Cart</Text>
      {itemCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{itemCount}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  label: { fontSize: 12, fontWeight: '700', color: '#2563eb' },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
});
