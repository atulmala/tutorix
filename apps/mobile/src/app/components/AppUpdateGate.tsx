import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { BRAND_NAME } from '../config';
import { useUpdatePolicy } from '../feature-flags/FeatureFlagsContext';

type AppUpdateGateProps = {
  children: React.ReactNode;
};

export const AppUpdateGate: React.FC<AppUpdateGateProps> = ({ children }) => {
  const {
    ready,
    mode,
    storeUrl,
    forceMessage,
    optionalMessage,
    latestVersion,
    dismissOptionalUpdate,
  } = useUpdatePolicy();

  const openStore = useCallback(async () => {
    try {
      const canOpen = await Linking.canOpenURL(storeUrl);
      if (canOpen) {
        await Linking.openURL(storeUrl);
      } else {
        console.warn('[AppUpdateGate] Cannot open store URL:', storeUrl);
      }
    } catch (error) {
      console.warn('[AppUpdateGate] Failed to open store URL', error);
    }
  }, [storeUrl]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <Text style={styles.brand}>{BRAND_NAME}</Text>
        <ActivityIndicator size="large" color="#1d4ed8" style={styles.loader} />
      </View>
    );
  }

  if (mode === 'force') {
    return (
      <View style={styles.forceContainer}>
        <Text style={styles.brand}>{BRAND_NAME}</Text>
        <Text style={styles.title}>Update required</Text>
        <Text style={styles.body}>{forceMessage}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={openStore}>
          <Text style={styles.primaryButtonText}>Update now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      {children}
      <Modal
        visible={mode === 'optional'}
        transparent
        animationType="fade"
        onRequestClose={() => {
          void dismissOptionalUpdate();
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.title}>Update available</Text>
            <Text style={styles.body}>{optionalMessage}</Text>
            <Text style={styles.versionHint}>Version {latestVersion}</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={openStore}>
              <Text style={styles.primaryButtonText}>Update</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                void dismissOptionalUpdate();
              }}
            >
              <Text style={styles.secondaryButtonText}>Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  forceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 28,
  },
  brand: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1d4ed8',
    marginBottom: 24,
  },
  loader: {
    marginTop: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 20,
  },
  versionHint: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 16,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4b5563',
    fontSize: 15,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
});
