import React, { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { SPLASH_BACKGROUND } from '../../assets/brand-colors';

const splashImage = require('../../assets/tutorix-splash.png');

type SplashScreenProps = {
  onFinish: () => void;
};

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <View style={styles.container}>
      <Image
        source={splashImage}
        style={styles.image}
        resizeMode="contain"
        accessibilityLabel="Tutorix"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: SPLASH_BACKGROUND,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
