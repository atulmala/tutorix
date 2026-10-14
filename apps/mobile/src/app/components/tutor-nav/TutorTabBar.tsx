import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from '../SafeAreaView';
import Svg, { Path } from 'react-native-svg';

export type TutorTab = 'home' | 'calendar' | 'wallet' | 'profile';

type TutorTabBarProps = {
  active: TutorTab | null;
  onHome: () => void;
  onCalendar: () => void;
  onWallet: () => void;
  onProfile: () => void;
};

const ACTIVE = '#2563eb';
const INACTIVE = '#94a3b8';

function HomeIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CalendarIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 4v2M17 4v2M4 9h16M6 6h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function WalletIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path d="M18 12h2a2 2 0 0 1 0 4h-2" stroke={color} strokeWidth={1.8} />
    </Svg>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M5 19.5c.8-3 3.4-5 7-5s6.2 2 7 5"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export const TutorTabBar: React.FC<TutorTabBarProps> = ({
  active,
  onHome,
  onCalendar,
  onWallet,
  onProfile,
}) => {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.wrap}>
        <TabItem
          label="Home"
          active={active === 'home'}
          onPress={onHome}
          icon={<HomeIcon color={active === 'home' ? ACTIVE : INACTIVE} />}
        />
        <TabItem
          label="Calendar"
          active={active === 'calendar'}
          onPress={onCalendar}
          icon={<CalendarIcon color={active === 'calendar' ? ACTIVE : INACTIVE} />}
        />
        <TabItem
          label="Wallet"
          active={active === 'wallet'}
          onPress={onWallet}
          icon={<WalletIcon color={active === 'wallet' ? ACTIVE : INACTIVE} />}
        />
        <TabItem
          label="Profile"
          active={active === 'profile'}
          onPress={onProfile}
          icon={<ProfileIcon color={active === 'profile' ? ACTIVE : INACTIVE} />}
        />
      </View>
    </SafeAreaView>
  );
};

function TabItem({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon: React.ReactNode;
}) {
  return (
    <Pressable
      style={styles.item}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      {icon}
      <Text style={[styles.label, active && styles.labelOn]}>{label}</Text>
      {active ? <View style={styles.dot} /> : <View style={styles.dotSpacer} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: '#fff',
  },
  wrap: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    paddingBottom: 6,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: INACTIVE,
  },
  labelOn: {
    color: ACTIVE,
  },
  dot: {
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: ACTIVE,
    marginTop: 2,
  },
  dotSpacer: {
    height: 4,
    marginTop: 2,
  },
});
