import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { BRAND_NAME } from '../config';

type SplashScreenProps = {
  onFinish: () => void;
};

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    // Show splash for 2 seconds, then navigate to login
    const timer = setTimeout(() => {
      onFinish();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <Text style={styles.brandName}>{BRAND_NAME}</Text>
      <ActivityIndicator size="large" color="#1d4ed8" style={styles.loader} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  brandName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1d4ed8',
    marginBottom: 24,
  },
  loader: {
    marginTop: 16,
  },
});
