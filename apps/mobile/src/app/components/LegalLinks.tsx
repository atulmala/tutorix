import React from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from '../config';

type LegalLinksProps = {
  prefix?: boolean;
};

export const LegalLinks: React.FC<LegalLinksProps> = ({ prefix = false }) => {
  return (
    <Text style={styles.text}>
      {prefix ? 'By continuing you agree to our ' : null}
      <Text
        style={styles.link}
        onPress={() => {
          void Linking.openURL(PRIVACY_POLICY_URL);
        }}
      >
        Privacy Policy
      </Text>
      {' and '}
      <Text
        style={styles.link}
        onPress={() => {
          void Linking.openURL(TERMS_OF_SERVICE_URL);
        }}
      >
        Terms of Service
      </Text>
      {prefix ? '.' : null}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
});
