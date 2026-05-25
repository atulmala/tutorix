import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { APPLICATION_REVIEW_MESSAGE } from '@tutorix/shared-utils';

export const TutorApplicationReview: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>{APPLICATION_REVIEW_MESSAGE}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoBanner: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoBannerText: {
    fontSize: 14,
    color: '#451a03',
    lineHeight: 20,
  },
});
