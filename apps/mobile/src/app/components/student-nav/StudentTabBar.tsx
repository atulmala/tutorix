import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export type StudentTab = 'home' | 'search' | 'profile';

type StudentTabBarProps = {
  active: StudentTab;
  onHome: () => void;
  onSearch: () => void;
  onProfile: () => void;
};

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

function SearchIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path d="M16 16.5 20 20.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
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

export const StudentTabBar: React.FC<StudentTabBarProps> = ({
  active,
  onHome,
  onSearch,
  onProfile,
}) => {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <TabItem
          label="Home"
          active={active === 'home'}
          onPress={onHome}
          icon={<HomeIcon color={active === 'home' ? '#2563eb' : '#94a3b8'} />}
        />
        <TabItem
          label="Search"
          active={active === 'search'}
          onPress={onSearch}
          icon={<SearchIcon color={active === 'search' ? '#2563eb' : '#94a3b8'} />}
        />
        <TabItem
          label="Profile"
          active={active === 'profile'}
          onPress={onProfile}
          icon={<ProfileIcon color={active === 'profile' ? '#2563eb' : '#94a3b8'} />}
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
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
  },
  labelOn: {
    color: '#2563eb',
  },
  dot: {
    width: 12,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#2563eb',
    marginTop: 2,
  },
  dotSpacer: {
    height: 4,
    marginTop: 2,
  },
});
