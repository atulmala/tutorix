import React from 'react';
import { View, Text } from 'react-native';
import { styles } from '../styles';

export const WelcomeScreen: React.FC = () => {
  return (
    <View style={styles.section}>
      <Text style={styles.textLg}>Hello there,</Text>
      <Text
        style={[styles.textXL, styles.appTitleText]}
        testID="heading"
        role="heading"
      >
        Welcome Mobile 👋
      </Text>
    </View>
  );
};
