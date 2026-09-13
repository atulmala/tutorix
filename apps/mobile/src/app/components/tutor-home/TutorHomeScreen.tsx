import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@apollo/client';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql/queries';

type TutorHomeScreenProps = {
  currentUser?: {
    firstName?: string;
    lastName?: string;
  } | null;
};

export const TutorHomeScreen: React.FC<TutorHomeScreenProps> = ({
  currentUser,
}) => {
  const { data } = useQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'cache-and-network',
  });

  const user = data?.myTutorProfile?.user;
  const firstName = user?.firstName ?? currentUser?.firstName;
  const lastName = user?.lastName ?? currentUser?.lastName;
  const displayName =
    [firstName, lastName].filter(Boolean).join(' ') || 'Tutor';

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.welcomeTitle}>Welcome, {displayName}</Text>
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonText}>
            Manage bookings, students, and your teaching schedule — coming soon.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#143055',
  },
  comingSoon: {
    marginTop: 40,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: 'rgba(249, 250, 251, 0.5)',
    padding: 24,
    alignItems: 'center',
  },
  comingSoonText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
