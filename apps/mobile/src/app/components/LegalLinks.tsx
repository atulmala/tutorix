import React from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import {
  CONTACT_US_URL,
  PRIVACY_POLICY_URL,
  REFUND_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from '../config';

type LegalLinksProps = {
  prefix?: boolean;
};

const LegalLink: React.FC<{ url: string; label: string }> = ({ url, label }) => (
  <Text
    style={styles.link}
    accessibilityRole="link"
    onPress={() => {
      void Linking.openURL(url);
    }}
  >
    {label}
  </Text>
);

export const LegalLinks: React.FC<LegalLinksProps> = ({ prefix = false }) => {
  return (
    <Text style={styles.text}>
      {prefix ? 'By continuing you agree to our ' : null}
      <LegalLink url={PRIVACY_POLICY_URL} label="Privacy Policy" />
      {' and '}
      <LegalLink url={TERMS_OF_SERVICE_URL} label="Terms of Service" />
      {prefix ? '.' : null}
      {'\n'}
      <LegalLink url={REFUND_POLICY_URL} label="Refunds & Cancellations" />
      {' · '}
      <LegalLink url={CONTACT_US_URL} label="Contact Us" />
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
