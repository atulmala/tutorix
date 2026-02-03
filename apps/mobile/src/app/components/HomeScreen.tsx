import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@apollo/client';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql/queries';
import { NavHeader } from './NavHeader';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type HomeScreenProps = {
  onLogout: () => void;
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout }) => {
  const { data: profileData } = useQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'cache-first',
  });

  const userInitials = useMemo(() => {
    const user = profileData?.myTutorProfile?.user;
    if (!user) return null;
    const first = user?.firstName?.trim() || '';
    const last = user?.lastName?.trim() || '';
    const name = [first, last].filter(Boolean).join(' ');
    return name ? getInitials(name) : null;
  }, [profileData]);

  return (
    <View style={styles.container}>
      <NavHeader
        title="Home"
        onBack={undefined}
        userInitials={userInitials}
        onLogout={onLogout}
      />
      <View style={styles.content}>
        <Text style={styles.title}>You're all set!</Text>
        <Text style={styles.subtitle}>Onboarding complete.</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 8,
  },
});
