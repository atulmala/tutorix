import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { BackArrowIcon } from './BackArrowIcon';
import { LogoutIcon } from './LogoutIcon';

export type NavHeaderProps = {
  /** Screen title (e.g. "Address Entry", "Home") */
  title: string;
  /** Optional step label (e.g. "Step 1 of 8") */
  stepLabel?: string;
  /** Callback when back is pressed; if provided, back arrow is shown */
  onBack?: () => void;
  /** User initials to show in circle (e.g. "SD"); later replace with profile image */
  userInitials?: string | null;
  /** Callback when logout is pressed; if provided, logout icon is shown */
  onLogout?: () => void;
};

export const NavHeader: React.FC<NavHeaderProps> = ({
  title,
  stepLabel,
  onBack,
  userInitials,
  onLogout,
}) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.left}>
          {onBack ? (
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              activeOpacity={0.7}
              accessibilityLabel="Go back"
            >
              <BackArrowIcon size={24} color="#0f172a" />
            </TouchableOpacity>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
        </View>

        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {stepLabel ? (
            <Text style={styles.stepLabel} numberOfLines={1}>
              {stepLabel}
            </Text>
          ) : null}
        </View>

        <View style={styles.right}>
          {userInitials ? (
            <View style={styles.initialsCircle}>
              <Text style={styles.initialsText}>{userInitials}</Text>
            </View>
          ) : null}
          {onLogout ? (
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={onLogout}
              activeOpacity={0.7}
              accessibilityLabel="Logout"
            >
              <LogoutIcon size={22} color="#0f172a" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#e2e8f0',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
    backgroundColor: '#e2e8f0',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  left: {
    width: 40,
    alignItems: 'flex-start',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backPlaceholder: {
    width: 24,
    height: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
  },
  stepLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 40,
    justifyContent: 'flex-end',
  },
  initialsCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  logoutButton: {
    padding: 6,
  },
});
