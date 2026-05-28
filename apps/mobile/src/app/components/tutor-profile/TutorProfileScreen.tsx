import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@apollo/client';
import { GET_MY_TUTOR_PROFILE } from '@tutorix/shared-graphql/queries';

function formatDocType(type: string | undefined | null): string {
  if (!type) return 'Document';
  return type
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function screeningLabel(status: string | undefined | null): string {
  switch (status) {
    case 'PASSED_AUTOMATED':
      return 'Passed (automated)';
    case 'APPROVED_HUMAN':
      return 'Approved';
    case 'REJECTED_HUMAN':
      return 'Rejected';
    case 'PENDING_HUMAN':
      return 'Pending review';
    default:
      return status ?? '—';
  }
}

export const TutorProfileScreen: React.FC = () => {
  const { data, loading, error } = useQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'cache-and-network',
  });

  const tutor = data?.myTutorProfile;
  const user = tutor?.user;
  const displayName = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (loading && !tutor) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#5fa8ff" />
        <Text style={styles.muted}>Loading your profile…</Text>
      </View>
    );
  }

  if (error || !tutor) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Could not load your tutor profile.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>My tutor profile</Text>
      <Text style={styles.subtitle}>Tutorix certified tutor</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <Text style={styles.row}>
          <Text style={styles.label}>Name: </Text>
          {displayName || '—'}
        </Text>
        <Text style={styles.row}>
          <Text style={styles.label}>Experience: </Text>
          {tutor.yearsOfExperience ?? '—'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address</Text>
        {tutor.addresses?.length ? (
          tutor.addresses.map((addr) => (
            <Text key={addr.id} style={styles.row}>
              {addr.fullAddress ||
                [addr.street, addr.city, addr.state].filter(Boolean).join(', ')}
            </Text>
          ))
        ) : (
          <Text style={styles.muted}>No address on file.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Qualifications</Text>
        {tutor.qualifications?.length ? (
          tutor.qualifications.map((q) => (
            <Text key={q.id} style={styles.row}>
              {q.degreeName || q.qualificationType} · {q.boardOrUniversity} ({q.yearObtained})
            </Text>
          ))
        ) : (
          <Text style={styles.muted}>No qualifications listed.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Experience</Text>
        {tutor.experiences?.length ? (
          tutor.experiences.map((exp) => (
            <Text key={exp.id} style={styles.row}>
              {exp.jobTitle}
              {exp.employerName ? ` · ${exp.employerName}` : ''}
              {exp.isCurrent ? ' (current)' : ''}
            </Text>
          ))
        ) : (
          <Text style={styles.muted}>No experience listed.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Offerings</Text>
        {tutor.tutorOfferings?.length ? (
          tutor.tutorOfferings.map((o) => (
            <Text key={o.id} style={styles.row}>
              {o.offering?.displayName || o.offering?.name || 'Offering'} — {o.status}
            </Text>
          ))
        ) : (
          <Text style={styles.muted}>No offerings selected.</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Documents</Text>
        {tutor.documents?.length ? (
          tutor.documents.map((doc) => (
            <Text key={doc.id} style={styles.row}>
              {formatDocType(doc.documentType)} — {screeningLabel(doc.screening?.status)}
            </Text>
          ))
        ) : (
          <Text style={styles.muted}>No documents uploaded.</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4, marginBottom: 20 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  row: { fontSize: 14, color: '#0f172a', lineHeight: 20, marginBottom: 6 },
  label: { color: '#64748b' },
  muted: { fontSize: 14, color: '#64748b' },
  error: { fontSize: 14, color: '#b91c1c' },
});
