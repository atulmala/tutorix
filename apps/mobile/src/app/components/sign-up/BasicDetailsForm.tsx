import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useMutation } from '@apollo/client';
import { BRAND_NAME } from '../../config';
import { REGISTER_USER } from '@tutorix/shared-graphql/mutations';
import { getPhoneCountryCode } from '@tutorix/shared-graphql/utils';

export type BasicDetails = {
  firstName: string;
  lastName: string;
  gender: 'male' | 'female' | 'other';
  countryCode: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  isTutor: boolean | null;
};

export const createEmptyDetails = (): BasicDetails => ({
  firstName: '',
  lastName: '',
  gender: 'male',
  countryCode: 'IN',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
  isTutor: null,
});

type BasicDetailsFormProps = {
  initialValue: BasicDetails;
  onSubmit: (
    value: BasicDetails,
    userId: number,
    user?: { isMobileVerified: boolean; isEmailVerified: boolean }
  ) => void;
  onBackHome?: () => void;
  onLogin?: () => void;
};

type ErrorMap = Partial<Record<keyof BasicDetails, string>>;

const COUNTRY_OPTIONS = [
  { code: 'IN', label: 'India (+91)' },
  { code: 'US', label: 'United States (+1)' },
  { code: 'GB', label: 'United Kingdom (+44)' },
  { code: 'AU', label: 'Australia (+61)' },
];

export const BasicDetailsForm: React.FC<BasicDetailsFormProps> = ({
  initialValue,
  onSubmit,
  onBackHome,
  onLogin,
}) => {
  const [form, setForm] = useState<BasicDetails>(initialValue);
  const [errors, setErrors] = useState<ErrorMap>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [hasError, setHasError] = useState(false);

  const [registerUser, { loading: isSubmitting }] = useMutation(REGISTER_USER, {
    onError: (error) => {
      setHasError(true);
      const errorMessage =
        error.graphQLErrors?.[0]?.message ||
        error.message ||
        'Failed to create account. Please try again.';
      setSubmitError(errorMessage);
      console.error('Registration error:', error);
    },
  });

  useEffect(() => {
    setForm(initialValue);
  }, [initialValue]);

  const updateField = <K extends keyof BasicDetails>(key: K, value: BasicDetails[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validatePhone = (value: string) => {
    if (!value.trim()) return 'Phone number is required';
    if (/[^0-9]/.test(value)) return 'Numbers only';
    if (value.length < 10) return 'Enter at least 10 digits';
    return undefined;
  };

  const validateEmail = (value: string) => {
    if (!value.trim()) return 'Email is required';
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    if (!valid) return 'Enter a valid email';
    return undefined;
  };

  const validatePasswords = (password: string, confirm: string) => {
    let passwordError: string | undefined;
    let confirmError: string | undefined;
    if (!password) {
      passwordError = 'Password is required';
    } else if (password.length < 6) {
      passwordError = 'Password must be at least 6 characters';
    }
    if (!confirm) {
      confirmError = 'Please confirm password';
    }
    if (password && confirm && password !== confirm) {
      passwordError = passwordError ?? 'Passwords do not match';
      confirmError = 'Passwords do not match';
    }
    return { passwordError, confirmError };
  };

  const validationErrors = useMemo(() => {
    const next: ErrorMap = {};
    if (!form.firstName.trim()) next.firstName = 'First name is required';
    if (!form.lastName.trim()) next.lastName = 'Last name is required';
    next.phone = validatePhone(form.phone);
    next.email = validateEmail(form.email);
    const { passwordError, confirmError } = validatePasswords(form.password, form.confirmPassword);
    if (passwordError) next.password = passwordError;
    if (confirmError) next.confirmPassword = confirmError;
    if (form.isTutor === null) next.isTutor = 'Please select a role';
    Object.keys(next).forEach((key) => {
      if (next[key as keyof BasicDetails] === undefined) {
        delete next[key as keyof BasicDetails];
      }
    });
    return next;
  }, [form]);

  const canSubmit =
    Object.keys(validationErrors).length === 0 &&
    form.firstName &&
    form.lastName &&
    form.phone &&
    form.email &&
    form.password &&
    form.confirmPassword &&
    form.isTutor !== null;

  const handleSubmit = async () => {
    setSubmitAttempted(true);
    setSubmitError(null);
    setHasError(false);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    try {
      const { data } = await registerUser({
        variables: {
          role: form.isTutor ? 'TUTOR' : 'STUDENT',
          mobileCountryCode: getPhoneCountryCode(form.countryCode),
          mobileNumber: form.phone,
          email: form.email,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          gender: form.gender.toUpperCase() as 'MALE' | 'FEMALE' | 'OTHER',
        },
      });

      if (hasError) {
        return;
      }

      if (data?.registerUser?.id) {
        onSubmit(form, data.registerUser.id, {
          isMobileVerified: data.registerUser.isMobileVerified || false,
          isEmailVerified: data.registerUser.isEmailVerified || false,
        });
      } else {
        setSubmitError('Registration successful but user ID not received.');
      }
    } catch (error) {
      if (!hasError) {
        const errorMessage =
          (error as any)?.graphQLErrors?.[0]?.message ||
          (error as any)?.message ||
          'An unexpected error occurred. Please try again.';
        setSubmitError(errorMessage);
      }
    }
  };

  const showPhoneError = (submitAttempted && errors.phone) || errors.phone;
  const showEmailError = (submitAttempted && errors.email) || errors.email;
  const showPasswordError = (submitAttempted && errors.password) || errors.password;
  const showConfirmError = (submitAttempted && errors.confirmPassword) || errors.confirmPassword;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={[styles.input, errors.firstName && styles.inputError]}
            value={form.firstName}
            onChangeText={(value) => updateField('firstName', value)}
            placeholder="Enter first name"
            placeholderTextColor="#9ca3af"
          />
          {errors.firstName && <Text style={styles.fieldError}>{errors.firstName}</Text>}
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={[styles.input, errors.lastName && styles.inputError]}
            value={form.lastName}
            onChangeText={(value) => updateField('lastName', value)}
            placeholder="Enter last name"
            placeholderTextColor="#9ca3af"
          />
          {errors.lastName && <Text style={styles.fieldError}>{errors.lastName}</Text>}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.radioRow}>
          {(['male', 'female', 'other'] as const).map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.radioOption,
                form.gender === option && styles.radioOptionSelected,
              ]}
              onPress={() => updateField('gender', option)}
            >
              <Text style={styles.radioLabel}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, styles.countryGroup]}>
          <Text style={styles.label}>Country</Text>
          <TouchableOpacity
            style={styles.countrySelect}
            onPress={() => setShowCountryModal(true)}
          >
            <Text style={styles.countrySelectText}>
              {COUNTRY_OPTIONS.find((c) => c.code === form.countryCode)?.label || 'Select'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.inputGroup, styles.phoneGroup]}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={[styles.input, showPhoneError && styles.inputError]}
            value={form.phone}
            onChangeText={(value) => updateField('phone', value.replace(/\D/g, ''))}
            placeholder="Enter phone number"
            placeholderTextColor="#9ca3af"
            keyboardType="phone-pad"
          />
          {showPhoneError && <Text style={styles.fieldError}>{errors.phone}</Text>}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={[styles.input, showEmailError && styles.inputError]}
          value={form.email}
          onChangeText={(value) => updateField('email', value)}
          placeholder="Enter email address"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {showEmailError && <Text style={styles.fieldError}>{errors.email}</Text>}
      </View>

      <View style={styles.row}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Create Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, showPasswordError && styles.inputError]}
              value={form.password}
              onChangeText={(value) => updateField('password', value)}
              placeholder="Create password"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.showPasswordButton}
              onPress={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? (
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#1d4ed8">
                  <Path
                    d="M3 3 21 21"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                  />
                  <Path
                    d="M10.6 10.6a3 3 0 0 0 4.8 3.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                  />
                  <Path
                    d="M9.9 4.2A9.53 9.53 0 0 1 12 4c5 0 9 4.5 9.5 8-.12.79-.61 1.93-1.54 3.07M6.3 6.3C4.3 7.67 3 9.64 2.5 12c.27 1.31 1.07 2.84 2.36 4.17A11.88 11.88 0 0 0 12 20c1.14 0 2.24-.17 3.28-.52"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                  />
                </Svg>
              ) : (
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#1d4ed8">
                  <Path
                    d="M1.5 12C2.5 8.5 6.5 4 12 4s9.5 4.5 10.5 8c-1 3.5-5 8-10.5 8S2.5 15.5 1.5 12Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                  />
                  <Circle cx="12" cy="12" r="3" strokeWidth={1.8} />
                </Svg>
              )}
            </TouchableOpacity>
          </View>
          {showPasswordError && <Text style={styles.fieldError}>{errors.password}</Text>}
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput, showConfirmError && styles.inputError]}
              value={form.confirmPassword}
              onChangeText={(value) => updateField('confirmPassword', value)}
              placeholder="Confirm password"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity
              style={styles.showPasswordButton}
              onPress={() => setShowConfirm((prev) => !prev)}
            >
              {showConfirm ? (
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#1d4ed8">
                  <Path
                    d="M3 3 21 21"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                  />
                  <Path
                    d="M10.6 10.6a3 3 0 0 0 4.8 3.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                  />
                  <Path
                    d="M9.9 4.2A9.53 9.53 0 0 1 12 4c5 0 9 4.5 9.5 8-.12.79-.61 1.93-1.54 3.07M6.3 6.3C4.3 7.67 3 9.64 2.5 12c.27 1.31 1.07 2.84 2.36 4.17A11.88 11.88 0 0 0 12 20c1.14 0 2.24-.17 3.28-.52"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                  />
                </Svg>
              ) : (
                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#1d4ed8">
                  <Path
                    d="M1.5 12C2.5 8.5 6.5 4 12 4s9.5 4.5 10.5 8c-1 3.5-5 8-10.5 8S2.5 15.5 1.5 12Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                  />
                  <Circle cx="12" cy="12" r="3" strokeWidth={1.8} />
                </Svg>
              )}
            </TouchableOpacity>
          </View>
          {showConfirmError && <Text style={styles.fieldError}>{errors.confirmPassword}</Text>}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Registering as</Text>
        <View style={styles.roleRow}>
          {[
            { key: 'student', title: 'Student', desc: 'Learn with expert tutors.' },
            { key: 'tutor', title: 'Tutor', desc: 'Teach and grow your practice.' },
          ].map((role) => {
            const selected =
              form.isTutor !== null &&
              ((role.key === 'tutor' && form.isTutor === true) ||
                (role.key === 'student' && form.isTutor === false));
            return (
              <TouchableOpacity
                key={role.key}
                style={[styles.roleCard, selected && styles.roleCardSelected]}
                onPress={() => updateField('isTutor', role.key === 'tutor')}
              >
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleDesc}>{role.desc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {errors.isTutor && <Text style={styles.fieldError}>{errors.isTutor}</Text>}
      </View>

      {submitError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{submitError}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.primaryButton, (!canSubmit || isSubmitting) && styles.primaryButtonDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit || isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.primaryButtonText}>Verify Phone</Text>
        )}
      </TouchableOpacity>


      <Modal transparent visible={showCountryModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select Country</Text>
            {COUNTRY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.code}
                style={styles.modalOption}
                onPress={() => {
                  updateField('countryCode', option.code);
                  setShowCountryModal(false);
                }}
              >
                <Text style={styles.modalOptionText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowCountryModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  inputError: {
    borderColor: '#f87171',
    backgroundColor: '#fef2f2',
  },
  fieldError: {
    color: '#dc2626',
    fontSize: 12,
    marginTop: 4,
  },
  countryGroup: {
    flex: 2,
  },
  phoneGroup: {
    flex: 3,
  },
  countrySelect: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  countrySelectText: {
    fontSize: 14,
    color: '#1e293b',
  },
  radioRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  radioOption: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  radioOptionSelected: {
    borderColor: '#5fa8ff',
    backgroundColor: '#eef3ff',
  },
  radioLabel: {
    fontSize: 12,
    color: '#1e293b',
    textTransform: 'capitalize',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 60,
  },
  showPasswordButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  roleCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  roleCardSelected: {
    borderColor: '#5fa8ff',
    backgroundColor: '#eef3ff',
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  roleDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    padding: 12,
  },
  errorText: {
    color: '#991b1b',
    fontSize: 13,
  },
  primaryButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  modalOption: {
    paddingVertical: 10,
  },
  modalOptionText: {
    fontSize: 14,
    color: '#1e293b',
  },
  modalClose: {
    marginTop: 8,
    alignItems: 'flex-end',
  },
  modalCloseText: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
});
