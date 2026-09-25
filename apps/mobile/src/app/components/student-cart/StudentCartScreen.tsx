import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery } from '@apollo/client';
import { MY_CART } from '@tutorix/shared-graphql/queries';
import { REMOVE_FROM_CART, UPDATE_CART_ITEM } from '@tutorix/shared-graphql/mutations';
import { formatInr } from '@tutorix/shared-utils/rate-card';

type CartLine = {
  id: number;
  tutorId: number;
  tutorName: string;
  offeringLabel: string;
  deliveryMode: 'online' | 'offline';
  quantity: number;
  unitRateInr: number;
  lineTotalInr: number;
};

type StudentCartScreenProps = {
  onCheckout: () => void;
  onKeepShopping: () => void;
};

export const StudentCartScreen: React.FC<StudentCartScreenProps> = ({
  onCheckout,
  onKeepShopping,
}) => {
  const { data, loading, error } = useQuery(MY_CART, { fetchPolicy: 'network-only' });
  const [updateItem, { loading: updating }] = useMutation(UPDATE_CART_ITEM, {
    refetchQueries: [{ query: MY_CART }],
  });
  const [removeItem, { loading: removing }] = useMutation(REMOVE_FROM_CART, {
    refetchQueries: [{ query: MY_CART }],
  });
  const items = (data?.myCart?.items ?? []) as CartLine[];
  const busy = updating || removing;

  if (loading) {
    return <Text style={styles.hint}>Loading cart…</Text>;
  }
  if (error) {
    return <Text style={styles.hint}>Could not load your cart.</Text>;
  }
  if (items.length === 0) {
    return (
      <View style={styles.content}>
        <Text style={styles.title}>Cart</Text>
        <Text style={styles.meta}>
          Your cart is empty. Add classes from a tutor preview to check out later.
        </Text>
        <Pressable style={styles.primary} onPress={onKeepShopping} accessibilityRole="button">
          <Text style={styles.primaryText}>Find a tutor</Text>
        </Pressable>
      </View>
    );
  }

  const groups = new Map<number, CartLine[]>();
  for (const item of items) {
    const rows = groups.get(item.tutorId) ?? [];
    rows.push(item);
    groups.set(item.tutorId, rows);
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Cart</Text>
      {[...groups.entries()].map(([tutorId, rows]) => (
        <View key={tutorId} style={styles.card}>
          <Text style={styles.section}>{rows[0].tutorName}</Text>
          {rows.map((item) => (
            <View key={item.id} style={styles.line}>
              <Text style={styles.lineTitle}>{item.offeringLabel}</Text>
              <Text style={styles.meta}>
                {item.deliveryMode === 'online' ? 'Online' : 'Offline'} ·{' '}
                {formatInr(item.unitRateInr)} / class
              </Text>
              <View style={styles.lineRow}>
                <View style={styles.stepper}>
                  <Pressable
                    disabled={busy || item.quantity <= 1}
                    accessibilityLabel={`Decrease ${item.offeringLabel}`}
                    onPress={() =>
                      void updateItem({
                        variables: { itemId: String(item.id), quantity: item.quantity - 1 },
                      })
                    }
                    style={styles.stepBtn}
                  >
                    <Text style={styles.stepText}>−</Text>
                  </Pressable>
                  <Text style={styles.qty}>{item.quantity}</Text>
                  <Pressable
                    disabled={busy}
                    accessibilityLabel={`Increase ${item.offeringLabel}`}
                    onPress={() =>
                      void updateItem({
                        variables: { itemId: String(item.id), quantity: item.quantity + 1 },
                      })
                    }
                    style={styles.stepBtn}
                  >
                    <Text style={styles.stepText}>+</Text>
                  </Pressable>
                </View>
                <Text style={styles.lineTitle}>{formatInr(item.lineTotalInr)}</Text>
                <Pressable
                  disabled={busy}
                  onPress={() => void removeItem({ variables: { itemId: String(item.id) } })}
                >
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      ))}
      <View style={styles.totalRow}>
        <Text style={styles.meta}>Total</Text>
        <Text style={styles.title}>{formatInr(data?.myCart?.totalInr ?? 0)}</Text>
      </View>
      <Pressable
        style={styles.primary}
        onPress={onCheckout}
        accessibilityRole="button"
        accessibilityLabel="Checkout"
      >
        <Text style={styles.primaryText}>Checkout</Text>
      </Pressable>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 26, fontWeight: '800', color: '#143055' },
  section: { fontSize: 16, fontWeight: '800', color: '#143055', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16 },
  line: { backgroundColor: '#eff6ff', borderRadius: 16, padding: 12, marginBottom: 10 },
  lineTitle: { fontSize: 14, fontWeight: '800', color: '#143055' },
  meta: { marginTop: 4, color: '#64748b', fontSize: 13 },
  lineRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: 16, fontWeight: '700', color: '#143055' },
  qty: { minWidth: 20, textAlign: 'center', fontWeight: '800', color: '#143055' },
  remove: { color: '#dc2626', fontWeight: '700' },
  totalRow: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primary: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700' },
  hint: { padding: 24, color: '#6b7280', textAlign: 'center' },
});
