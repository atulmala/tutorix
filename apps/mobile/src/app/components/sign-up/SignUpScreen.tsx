import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useQuery } from '@apollo/client';
import { BRAND_NAME } from '../../config';
import { BasicDetailsForm, BasicDetails, createEmptyDetails } from './BasicDetailsForm';
import { PhoneVerification } from './PhoneVerification';
import { EmailVerification } from './EmailVerification';
import { GET_USER_BY_ID } from '@tutorix/shared-graphql/queries';
import { getIsoCountryCode } from '@tutorix/shared-utils';

type SignUpProps = {
  resumeUserId?: number;
  resumeVerificationStatus?: { isMobileVerified: boolean; isEmailVerified: boolean };
};

type Step = 'basic' | 'phone' | 'email';

const steps: Array<{ id: Step; label: string }> = [
  { id: 'basic', label: 'Basic details' },
  { id: 'phone', label: 'Verify phone' },
  { id: 'email', label: 'Verify email' },
];

export const SignUpScreen: React.FC<SignUpProps> = ({
  resumeUserId,
  resumeVerificationStatus,
}) => {
  const [step, setStep] = useState<Step>('basic');
  const [basicDetails, setBasicDetails] = useState<BasicDetails>(createEmptyDetails());
  const [userId, setUserId] = useState<number | null>(resumeUserId || null);
  const [mobileVerified, setMobileVerified] = useState(resumeVerificationStatus?.isMobileVerified || false);
  const [emailVerified, setEmailVerified] = useState(resumeVerificationStatus?.isEmailVerified || false);

  const { data: userData } = useQuery(GET_USER_BY_ID, {
    variables: { id: resumeUserId?.toString() },
    skip: !resumeUserId,
    fetchPolicy: 'network-only',
  });

  useEffect(() => {
    if (resumeUserId && resumeVerificationStatus) {
      setUserId(resumeUserId);
      setMobileVerified(resumeVerificationStatus.isMobileVerified);
      setEmailVerified(resumeVerificationStatus.isEmailVerified);

      if (!resumeVerificationStatus.isMobileVerified) {
        setStep('phone');
      } else if (!resumeVerificationStatus.isEmailVerified) {
        setStep('email');
      } else {
        setStep('basic');
      }
    }
  }, [resumeUserId, resumeVerificationStatus]);

  useEffect(() => {
    if (userData?.user && resumeUserId) {
      const user = userData.user;
      setBasicDetails((prev) => ({
        ...prev,
        phone: user.mobileNumber || '',
        countryCode: user.mobileCountryCode ? getIsoCountryCode(user.mobileCountryCode) : 'IN',
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        gender: user.gender?.toLowerCase() === 'female' ? 'female' : 'male',
        dob: user.dob || null,
      }));
    }
  }, [userData, resumeUserId]);

  const handleBasicSubmit = (
    details: BasicDetails,
    registeredUserId: number,
    userVerificationStatus?: { isMobileVerified: boolean; isEmailVerified: boolean }
  ) => {
    setBasicDetails(details);
    setUserId(registeredUserId);

    if (userVerificationStatus) {
      const { isMobileVerified: isMobile, isEmailVerified: isEmail } = userVerificationStatus;
      if (isMobile && !isEmail) {
        setMobileVerified(true);
        setStep('email');
      } else if (!isMobile) {
        setStep('phone');
      } else {
        setMobileVerified(true);
        setEmailVerified(true);
      }
    } else {
      setStep('phone');
    }
  };

  const handleMobileVerified = () => {
    setMobileVerified(true);
    setStep('email');
  };

  const handleEmailVerified = () => {
    setEmailVerified(true);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerTitle}>{BRAND_NAME} • Sign up</Text>
            </View>
            <View style={styles.headerActions}>
              {(step === 'phone' || step === 'email') && (
                <TouchableOpacity style={styles.headerLinkButton} onPress={() => setStep('basic')}>
                  <Text style={styles.headerLinkText}>Back to details</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.stepRow}>
            {steps.map((item, idx) => {
              const isActive = step === item.id;
              const isComplete =
                (item.id === 'basic' && step !== 'basic') ||
                (item.id === 'phone' && mobileVerified) ||
                (item.id === 'email' && emailVerified);
              return (
                <View
                  key={item.id}
                  style={[
                    styles.stepChip,
                    isActive && styles.stepChipActive,
                    isComplete && styles.stepChipComplete,
                  ]}
                >
                  <Text style={styles.stepChipText}>Step {idx + 1}</Text>
                  <View style={styles.stepChipLabelRow}>
                    <Text style={styles.stepChipLabel}>{item.label}</Text>
                    {isComplete && <Text style={styles.stepChipTick}>✓</Text>}
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.headerDividerHorizontal} />

          <View style={styles.body}>
            {step === 'basic' && (
              <BasicDetailsForm
                initialValue={basicDetails}
                onSubmit={handleBasicSubmit}
              />
            )}
            {step === 'phone' && userId !== null && (
              <PhoneVerification
                userId={userId}
                initialCountryCode={basicDetails.countryCode}
                initialMobile={basicDetails.phone}
                onVerified={handleMobileVerified}
                onBack={() => setStep('basic')}
                helperText="We will send a 6 digit OTP to the phone number you provided."
              />
            )}
            {step === 'email' && userId !== null && (
              <EmailVerification
                userId={userId}
                initialEmail={basicDetails.email}
                disabled={false}
                onVerified={handleEmailVerified}
                onBackToDetails={() => setStep('basic')}
              />
            )}
          </View>

          {step === 'email' && emailVerified && (
            <View style={styles.successCard}>
              <Text style={styles.successTitle}>You are all set.</Text>
              <Text style={styles.successText}>Phone and email verified. Continue to complete your profile.</Text>
              <TouchableOpacity style={styles.successButton}>
                <Text style={styles.successButtonText}>Continue to build your profile</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerDividerHorizontal: {
    height: 2,
    backgroundColor: '#9ca3af',
    marginTop: 0,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerLinkButton: {
    paddingVertical: 4,
  },
  headerLinkText: {
    fontSize: 13,
    color: '#1d4ed8',
    fontWeight: '600',
  },
  stepRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  stepChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#64748b',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
  },
  stepChipActive: {
    borderColor: '#5fa8ff',
    backgroundColor: '#eef3ff',
  },
  stepChipComplete: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  stepChipText: {
    fontSize: 9,
    color: '#64748b',
  },
  stepChipLabel: {
    fontSize: 11,
    color: '#1e293b',
    fontWeight: '600',
  },
  stepChipLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepChipTick: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '700',
  },
  body: {
    marginTop: 0,
  },
  successCard: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  successText: {
    fontSize: 13,
    color: '#166534',
  },
  successButton: {
    backgroundColor: '#22c55e',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  successButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
