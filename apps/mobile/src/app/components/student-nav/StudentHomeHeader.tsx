import React from 'react';
import { Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@apollo/client';
import { GET_MY_STUDENT_PROFILE } from '@tutorix/shared-graphql/queries';
import {
  initialsFromProfileName,
  profilePictureAvatarUrl,
} from '@tutorix/shared-utils';
import { CartChip } from '../student-cart/CartChip';
import { WalletBalanceChip } from '../wallet';
import { BRAND_NAME } from '../../config';

type StudentHomeHeaderProps = {
  onProfilePress: () => void;
  onOpenWallet: () => void;
  onOpenCart?: () => void;
};

export const StudentHomeHeader: React.FC<StudentHomeHeaderProps> = ({
  onProfilePress,
  onOpenWallet,
  onOpenCart,
}) => {
  const { data } = useQuery(GET_MY_STUDENT_PROFILE, {
    fetchPolicy: 'cache-and-network',
  });
  const user = data?.myStudentProfile?.user;
  const initials = initialsFromProfileName(user?.firstName, user?.lastName);
  const avatarUrl = profilePictureAvatarUrl(user);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.row}>
        <Text style={styles.brand}>{BRAND_NAME}</Text>
        <View style={styles.right}>
          {onOpenCart ? <CartChip onOpenCart={onOpenCart} /> : null}
          <WalletBalanceChip onOpenWallet={onOpenWallet} />
          <Pressable
            onPress={onProfilePress}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
            style={styles.avatarButton}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.initials}>
                <Text style={styles.initialsText}>{initials || '?'}</Text>
              </View>
            )}
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
  avatarButton: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  initials: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: { fontSize: 13, fontWeight: '700', color: '#1d4ed8' },
});
