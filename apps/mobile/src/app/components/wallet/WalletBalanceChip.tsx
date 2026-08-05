import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { MY_WALLET } from '@tutorix/shared-graphql/queries';
import Svg, { Path } from 'react-native-svg';

type WalletBalanceChipProps = {
  onOpenWallet?: () => void;
};

export const WalletBalanceChip: React.FC<WalletBalanceChipProps> = ({
  onOpenWallet,
}) => {
  const { data, loading, error } = useQuery(MY_WALLET, {
    fetchPolicy: 'cache-and-network',
  });

  if (loading || error || !data?.myWallet) {
    return null;
  }

  const balance = data.myWallet.balanceInr as number;

  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={onOpenWallet}
      activeOpacity={0.8}
      accessibilityLabel={`Wallet balance ₹${balance}`}
      accessibilityRole="button"
    >
      <View style={styles.iconWrap}>
        <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
            stroke="#fff"
            strokeWidth={2}
          />
          <Path d="M18 12h2a2 2 0 0 1 0 4h-2" stroke="#fff" strokeWidth={2} />
        </Svg>
      </View>
      <Text style={styles.balance}>₹{balance}</Text>
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
    backgroundColor: '#10b981',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  balance: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
});
