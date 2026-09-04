import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation } from '@apollo/client';
import { DELETE_MY_ACCOUNT } from '@tutorix/shared-graphql/mutations';
import { LegalLinks } from './LegalLinks';

type AccountLegalSectionProps = {
  onAccountDeleted: () => void;
};

export const AccountLegalSection: React.FC<AccountLegalSectionProps> = ({
  onAccountDeleted,
}) => {
  const [deleteMyAccount] = useMutation(DELETE_MY_ACCOUNT);
  const [deleting, setDeleting] = useState(false);

  const runDelete = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount();
      onAccountDeleted();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not delete account.';
      Alert.alert('Delete account', message);
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete account',
      'This deletes your Tutorix login and signs you out. Payment records may be kept for legal reasons. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void runDelete();
          },
        },
      ],
    );
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Account</Text>
      <LegalLinks />
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={confirmDelete}
        disabled={deleting}
        accessibilityRole="button"
        accessibilityLabel="Delete account"
      >
        {deleting ? (
          <ActivityIndicator color="#b91c1c" />
        ) : (
          <Text style={styles.deleteButtonText}>Delete account</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  deleteButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  deleteButtonText: {
    color: '#b91c1c',
    fontSize: 15,
    fontWeight: '600',
  },
});
