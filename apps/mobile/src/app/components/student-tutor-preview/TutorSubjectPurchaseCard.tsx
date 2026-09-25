import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatInr } from '@tutorix/shared-utils/rate-card';
import { lockedDeliveryMode } from '@tutorix/shared-utils/student-booking';
import {
  packSlabsHaveDiscount,
  unitRateFromPackSlabs,
  type ClassPackSlabLine,
} from '@tutorix/shared-utils/tutor-search';

export type PreviewOffering = {
  offeringId: string | number;
  offeringLabel: string;
  onlineEnabled?: boolean;
  offlineEnabled?: boolean;
  onlineRateInr?: number | null;
  offlineRateInr?: number | null;
  freeDemoOffered?: boolean;
  onlinePackSlabs?: ClassPackSlabLine[];
  offlinePackSlabs?: ClassPackSlabLine[];
};

type TutorSubjectPurchaseCardProps = {
  offering: PreviewOffering;
  defaultExpanded?: boolean;
  collapsible?: boolean;
  highlight?: boolean;
  adding: boolean;
  onAdd: (
    offeringId: string,
    deliveryMode: 'online' | 'offline',
    quantity: number,
  ) => Promise<void>;
  onViewCart: () => void;
};

export const TutorSubjectPurchaseCard: React.FC<TutorSubjectPurchaseCardProps> = ({
  offering,
  defaultExpanded = false,
  collapsible = true,
  highlight = false,
  adding,
  onAdd,
  onViewCart,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded || !collapsible);
  const [quantity, setQuantity] = useState(1);
  const [deliveryMode, setDeliveryMode] = useState<'online' | 'offline' | null>(null);
  const [cartMessage, setCartMessage] = useState<string | null>(null);

  const locked = lockedDeliveryMode(
    offering.offlineEnabled === true,
    offering.onlineEnabled === true,
  );
  const bothModes = offering.offlineEnabled === true && offering.onlineEnabled === true;
  const mode = locked ?? deliveryMode;
  const onlineSlabs = offering.onlinePackSlabs ?? [];
  const offlineSlabs = offering.offlinePackSlabs ?? [];
  const activeSlabs = mode === 'online' ? onlineSlabs : mode === 'offline' ? offlineSlabs : [];
  const unitRate = useMemo(() => {
    if (!mode) {
      return null;
    }
    return unitRateFromPackSlabs(activeSlabs, quantity);
  }, [activeSlabs, mode, quantity]);
  const lineTotal = unitRate != null ? unitRate * quantity : null;
  const hasSlabPricing = offlineSlabs.length > 0 || onlineSlabs.length > 0;
  const hasPackSavings =
    packSlabsHaveDiscount(offlineSlabs) || packSlabsHaveDiscount(onlineSlabs);

  const handleAdd = async () => {
    const resolvedMode = locked ?? deliveryMode;
    if (!resolvedMode) {
      setCartMessage('Choose Online or Offline.');
      return;
    }
    setCartMessage(null);
    await onAdd(String(offering.offeringId), resolvedMode, quantity);
    setCartMessage('Added to cart.');
  };

  return (
    <View style={[styles.card, highlight && styles.cardHighlight]}>
      <Pressable
        onPress={() => {
          if (collapsible) {
            setExpanded((open) => !open);
          }
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <View style={styles.badgeRow}>
              {highlight ? (
                <View style={styles.badgePrimary}>
                  <Text style={styles.badgePrimaryText}>Your search</Text>
                </View>
              ) : null}
              {offering.freeDemoOffered ? (
                <View style={styles.badgeDemo}>
                  <Text style={styles.badgeDemoText}>Free demo</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.title}>{offering.offeringLabel}</Text>
            <BaseRateRow offering={offering} />
            {!expanded && hasPackSavings ? (
              <Text style={styles.packHint}>Pack discounts on 5+ classes</Text>
            ) : null}
          </View>
          {collapsible ? (
            <Text style={[styles.chevron, expanded && styles.chevronOpen]}>⌄</Text>
          ) : null}
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          {hasSlabPricing ? (
            <PackSlabGrid
              offlineSlabs={offlineSlabs}
              onlineSlabs={onlineSlabs}
              offlineEnabled={offering.offlineEnabled === true}
              onlineEnabled={offering.onlineEnabled === true}
              activeMode={mode}
            />
          ) : null}

          <View style={styles.buyBox}>
            <Text style={styles.buyLabel}>Buy classes</Text>
            <View style={styles.stepper}>
              <Pressable
                disabled={quantity <= 1}
                onPress={() => setQuantity(quantity - 1)}
                style={styles.stepBtn}
                accessibilityLabel="Decrease classes"
              >
                <Text style={styles.stepBtnText}>−</Text>
              </Pressable>
              <Text style={styles.qty}>{quantity}</Text>
              <Pressable
                onPress={() => setQuantity(quantity + 1)}
                style={styles.stepBtn}
                accessibilityLabel="Increase classes"
              >
                <Text style={styles.stepBtnText}>+</Text>
              </Pressable>
              <Text style={styles.meta}>{quantity === 1 ? 'class' : 'classes'}</Text>
            </View>

            {bothModes ? (
              <View style={styles.modeRow}>
                {(['offline', 'online'] as const).map((value) => {
                  const on = mode === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => setDeliveryMode(value)}
                      style={[styles.modeChip, on && styles.modeChipOn]}
                    >
                      <Text style={[styles.modeText, on && styles.modeTextOn]}>
                        {value === 'offline' ? 'Offline' : 'Online'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.modeLocked}>{locked === 'online' ? 'Online' : 'Offline'}</Text>
            )}

            {lineTotal != null && mode ? (
              <Text style={styles.lineTotal}>
                {formatInr(unitRate ?? 0)} / class × {quantity} = {formatInr(lineTotal)}
              </Text>
            ) : null}

            {cartMessage ? <Text style={styles.success}>{cartMessage}</Text> : null}

            <Pressable
              style={styles.primaryBtn}
              disabled={adding}
              onPress={() => void handleAdd()}
              accessibilityRole="button"
              accessibilityLabel="Add to cart"
            >
              <Text style={styles.primaryBtnText}>{adding ? 'Adding…' : 'Add to cart'}</Text>
            </Pressable>
            <Pressable onPress={onViewCart} accessibilityRole="button">
              <Text style={styles.viewCart}>View cart</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
};

function BaseRateRow({ offering }: { offering: PreviewOffering }) {
  const showOffline =
    offering.offlineEnabled === true && offering.offlineRateInr != null;
  const showOnline = offering.onlineEnabled === true && offering.onlineRateInr != null;
  if (!showOffline && !showOnline) {
    return null;
  }

  return (
    <View style={styles.baseRateBlock}>
      <Text style={styles.baseRateLabel}>Base rate</Text>
      <View style={styles.baseRateRow}>
        {showOffline ? (
          <View style={styles.chipOffline}>
            <Text style={styles.chipOfflineText}>
              Offline {formatInr(offering.offlineRateInr ?? 0)} / class
            </Text>
          </View>
        ) : null}
        {showOnline ? (
          <View style={styles.chipOnline}>
            <Text style={styles.chipOnlineText}>
              Online {formatInr(offering.onlineRateInr ?? 0)} / class
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function PackSlabGrid({
  offlineSlabs,
  onlineSlabs,
  offlineEnabled,
  onlineEnabled,
  activeMode,
}: {
  offlineSlabs: ClassPackSlabLine[];
  onlineSlabs: ClassPackSlabLine[];
  offlineEnabled: boolean;
  onlineEnabled: boolean;
  activeMode: 'online' | 'offline' | null;
}) {
  const sections: { key: string; title: string; slabs: ClassPackSlabLine[] }[] = [];

  if (activeMode === 'offline' && offlineSlabs.length > 0) {
    sections.push({ key: 'offline', title: 'Offline pack pricing', slabs: offlineSlabs });
  } else if (activeMode === 'online' && onlineSlabs.length > 0) {
    sections.push({ key: 'online', title: 'Online pack pricing', slabs: onlineSlabs });
  } else if (!activeMode) {
    if (offlineEnabled && offlineSlabs.length > 0) {
      sections.push({ key: 'offline', title: 'Offline pack pricing', slabs: offlineSlabs });
    }
    if (onlineEnabled && onlineSlabs.length > 0) {
      sections.push({ key: 'online', title: 'Online pack pricing', slabs: onlineSlabs });
    }
  }

  if (sections.length === 0) {
    return null;
  }

  return (
    <View style={styles.slabSection}>
      {sections.map((section) => (
        <View key={section.key} style={styles.slabModeBlock}>
          <Text style={styles.slabHeading}>{section.title}</Text>
          {section.slabs.map((slab) => (
            <View
              key={`${section.key}-${slab.label}`}
              style={[
                styles.slabCard,
                (slab.discountPct ?? 0) > 0 && styles.slabCardDiscount,
              ]}
            >
              <View style={styles.slabTop}>
                <Text style={styles.slabLabel}>{slab.label}</Text>
                {(slab.discountPct ?? 0) > 0 ? (
                  <Text style={styles.slabSave}>Save {slab.discountPct}%</Text>
                ) : null}
              </View>
              <Text style={styles.slabRate}>{formatInr(slab.unitRateInr)} / class</Text>
            </View>
          ))}
        </View>
      ))}
      {!activeMode && offlineEnabled && onlineEnabled && sections.length > 1 ? (
        <Text style={styles.slabHint}>Choose Online or Offline for your line total.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 12,
  },
  cardHighlight: {
    borderColor: '#93c5fd',
    backgroundColor: '#f0f9ff',
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  headerCopy: { flex: 1, minWidth: 0 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  badgePrimary: {
    backgroundColor: '#2563eb',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgePrimaryText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  badgeDemo: {
    backgroundColor: '#ecfdf5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeDemoText: { color: '#16a34a', fontSize: 10, fontWeight: '800' },
  title: { fontSize: 16, fontWeight: '800', color: '#143055' },
  packHint: { marginTop: 6, fontSize: 12, fontWeight: '600', color: '#047857' },
  baseRateBlock: { marginTop: 8 },
  baseRateLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  baseRateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  chipOffline: {
    backgroundColor: '#e0f2fe',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipOfflineText: { fontSize: 13, fontWeight: '700', color: '#0c4a6e' },
  chipOnline: {
    backgroundColor: '#ede9fe',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipOnlineText: { fontSize: 13, fontWeight: '700', color: '#5b21b6' },
  chevron: { fontSize: 22, fontWeight: '700', color: '#2563eb', marginTop: 2 },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  body: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 10 },
  buyBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  buyLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  qty: { minWidth: 24, textAlign: 'center', fontWeight: '800', color: '#143055' },
  meta: { color: '#64748b', fontSize: 13 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeChip: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  modeChipOn: { backgroundColor: '#2563eb' },
  modeText: { fontWeight: '700', color: '#143055' },
  modeTextOn: { color: '#fff' },
  modeLocked: { fontWeight: '700', color: '#143055' },
  lineTotal: { fontSize: 13, color: '#64748b' },
  success: { color: '#16a34a', fontWeight: '700' },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  viewCart: { textAlign: 'center', fontWeight: '700', color: '#143055', marginTop: 4 },
  slabSection: { gap: 8 },
  slabModeBlock: { gap: 8, marginBottom: 12 },
  slabHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  slabCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    padding: 12,
  },
  slabCardDiscount: {
    borderColor: '#a7f3d0',
    backgroundColor: '#ecfdf5',
  },
  slabTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slabLabel: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  slabSave: { fontSize: 11, fontWeight: '800', color: '#047857' },
  slabRate: { marginTop: 4, fontSize: 18, fontWeight: '800', color: '#143055' },
  slabHint: { fontSize: 11, color: '#64748b' },
});
