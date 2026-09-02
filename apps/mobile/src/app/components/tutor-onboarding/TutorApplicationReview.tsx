import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useQuery } from '@apollo/client';
import {
  GET_MY_IN_APP_MESSAGES,
  GET_MY_TUTOR_PROFILE,
  GET_ON_SCREEN_COPY,
} from '@tutorix/shared-graphql/queries';
import {
  APPLICATION_REVIEW_MESSAGE,
  TUTOR_ONBOARDING_APPROVED_EVENT,
  normalizeCertificationStage,
  resolveOnboardingApprovedCopy,
} from '@tutorix/shared-utils';

export const TutorApplicationReview: React.FC = () => {
  const { data: profileData } = useQuery(GET_MY_TUTOR_PROFILE, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 30_000,
  });

  const tutor = profileData?.myTutorProfile;
  const approved =
    tutor?.onBoardingComplete === true ||
    normalizeCertificationStage(tutor?.certificationStage) === 'complete';

  const { data: onScreenData } = useQuery(GET_ON_SCREEN_COPY, {
    variables: { event: TUTOR_ONBOARDING_APPROVED_EVENT },
    skip: !approved,
    fetchPolicy: 'cache-and-network',
  });
  const { data: inAppData } = useQuery(GET_MY_IN_APP_MESSAGES, {
    variables: { event: TUTOR_ONBOARDING_APPROVED_EVENT },
    skip: !approved,
    fetchPolicy: 'cache-and-network',
  });

  const approvedCopy = resolveOnboardingApprovedCopy({
    inAppBody: inAppData?.myInAppMessages?.[0]?.body,
    catalogBody: onScreenData?.onScreenCopy?.body,
  });

  return (
    <View style={styles.container}>
      <View style={[styles.infoBanner, approved && styles.approvedBanner]}>
        <Text style={[styles.infoBannerText, approved && styles.approvedText]}>
          {approved ? approvedCopy : APPLICATION_REVIEW_MESSAGE}
        </Text>
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
  approvedBanner: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
  },
  infoBannerText: {
    fontSize: 14,
    color: '#451a03',
    lineHeight: 20,
  },
  approvedText: {
    color: '#14532d',
  },
});
