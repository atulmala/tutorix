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
import {
  CHANGE_PASSWORD,
  DELETE_MY_ACCOUNT,
} from '@tutorix/shared-graphql/mutations';
import { LegalLinks } from './LegalLinks';
import { ChangePasswordModal } from './ChangePasswordModal';

type AccountLegalSectionProps = {
  onAccountDeleted: () => void;
};

export const AccountLegalSection: React.FC<AccountLegalSectionProps> = ({
  onAccountDeleted,
}) => {
  const [deleteMyAccount] = useMutation(DELETE_MY_ACCOUNT);
  const [changePassword] = useMutation(CHANGE_PASSWORD);
  const [deleting, setDeleting] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);

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

  const handleChangePassword = async (values: {
    currentPassword: string;
    newPassword: string;
  }) => {
    setChanging(true);
    setChangeError(null);
    try {
      await changePassword({
        variables: {
          input: {
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
          },
        },
      });
      setChangeOpen(false);
      Alert.alert('Password updated', 'Your password has been changed.');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not change password.';
      setChangeError(message.replace(/^GraphQL error:\s*/i, ''));
    } finally {
      setChanging(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Account</Text>
      <LegalLinks />
      <TouchableOpacity
        style={styles.changeButton}
        onPress={() => {
          setChangeError(null);
          setChangeOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel="Change password"
      >
        <Text style={styles.changeButtonText}>Change password</Text>
      </TouchableOpacity>
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
      <ChangePasswordModal
        visible={changeOpen}
        saving={changing}
        error={changeError}
        onClose={() => {
          if (!changing) {
            setChangeOpen(false);
            setChangeError(null);
          }
        }}
        onSubmit={(values) => {
          void handleChangePassword(values);
        }}
      />
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
  changeButton: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  changeButtonText: {
    color: '#1d4ed8',
    fontSize: 15,
    fontWeight: '600',
  },
  deleteButton: {
    marginTop: 12,
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
