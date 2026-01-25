import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { BRAND_NAME } from '../../config';
import { REGISTER_USER } from '@tutorix/shared-graphql';
import { getPhoneCountryCode } from '@tutorix/shared-utils';

export type BasicDetails = {
  firstName: string;
  lastName: string;
  dob: string | null;
  gender: 'male' | 'female';
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
  dob: null,
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
  onSubmit: (value: BasicDetails, userId: number, user?: { isMobileVerified: boolean; isEmailVerified: boolean }) => void;
  onBackHome?: () => void;
  onLogin?: () => void;
};

type ErrorMap = Partial<Record<keyof BasicDetails, string>>;

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
  const [touchedPhone, setTouchedPhone] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);
  const [touchedConfirm, setTouchedConfirm] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const hasErrorRef = useRef(false);
  const firstNameRef = useRef<HTMLInputElement | null>(null);
  const lastNameRef = useRef<HTMLInputElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmRef = useRef<HTMLInputElement | null>(null);

  const [registerUser, { loading: isSubmitting }] = useMutation(REGISTER_USER, {
    onError: (error) => {
      hasErrorRef.current = true;
      // Extract the specific error message from GraphQL errors
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
    // Remove undefined entries
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

  const focusFirstError = (errs: ErrorMap) => {
    const order: Array<keyof BasicDetails> = [
      'firstName',
      'lastName',
      'dob',
      'phone',
      'email',
      'password',
      'confirmPassword',
    ];
    const refMap: Record<
      keyof BasicDetails,
      React.RefObject<HTMLInputElement | null> | undefined
    > = {
      firstName: firstNameRef,
      lastName: lastNameRef,
      dob: undefined,
      phone: phoneRef,
      email: emailRef,
      password: passwordRef,
      confirmPassword: confirmRef,
      gender: undefined,
      countryCode: undefined,
      isTutor: undefined,
    };
    for (const key of order) {
      if (errs[key]) {
        const ref = refMap[key];
        if (ref?.current) {
          setTimeout(() => ref.current?.focus(), 0);
        }
        break;
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitAttempted(true);
    setSubmitError(null);
    hasErrorRef.current = false;
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length > 0) {
      focusFirstError(validationErrors);
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
          dob: form.dob ? new Date(form.dob).toISOString() : null,
        },
      });

      // Only check data if there was no error (onError callback sets hasErrorRef)
      if (hasErrorRef.current) {
        // Error was already handled by onError callback
        return;
      }

      if (data?.registerUser?.id) {
        onSubmit(
          form, 
          data.registerUser.id,
          {
            isMobileVerified: data.registerUser.isMobileVerified || false,
            isEmailVerified: data.registerUser.isEmailVerified || false,
          }
        );
      } else {
        setSubmitError('Registration successful but user ID not received.');
      }
    } catch (error) {
      // Error is handled by onError callback
      // This catch block is for unexpected errors only
      if (!hasErrorRef.current) {
        let errorMessage = 'An unexpected error occurred. Please try again.';
        
        if (error instanceof Error) {
          const graphQLError = error as Error & { graphQLErrors?: Array<{ message?: string }> };
          errorMessage = graphQLError.graphQLErrors?.[0]?.message || error.message || errorMessage;
        }
        
        setSubmitError(errorMessage);
      }
    }
  };

  const handlePhoneChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    updateField('phone', digitsOnly);
    const error = touchedPhone ? validatePhone(digitsOnly) : undefined;
    setErrors((prev) => ({ ...prev, phone: error }));
  };

  const handleEmailChange = (value: string) => {
    updateField('email', value);
    const error = touchedEmail ? validateEmail(value) : undefined;
    setErrors((prev) => ({ ...prev, email: error }));
  };

  const guardPhoneFirst = () => {
    const err = validatePhone(form.phone);
    if (err) {
      setTouchedPhone(true);
      setErrors((prev) => ({ ...prev, phone: err }));
      setTimeout(() => phoneRef.current?.focus(), 0);
      return true;
    }
    return false;
  };

  const showPhoneError = (touchedPhone || submitAttempted) && errors.phone;
  const showEmailError = (touchedEmail || submitAttempted) && errors.email;
  const showPasswordError = (touchedPassword || touchedConfirm || submitAttempted) && errors.password;
  const showConfirmError = (touchedConfirm || touchedPassword || submitAttempted) && errors.confirmPassword;

  const updatePasswordErrors = (pwd: string, confirm: string, force = false) => {
    if (!(force || touchedPassword || touchedConfirm || submitAttempted)) return;
    const { passwordError, confirmError } = validatePasswords(pwd, confirm);
    setErrors((prev) => ({ ...prev, password: passwordError, confirmPassword: confirmError }));
  };

  const handlePasswordChange = (value: string) => {
    updateField('password', value);
    updatePasswordErrors(value, form.confirmPassword);
  };

  const handleConfirmChange = (value: string) => {
    updateField('confirmPassword', value);
    updatePasswordErrors(form.password, value);
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5 leading-tight mb-6 md:mb-8">
          <p className="text-3xl font-bold text-primary">Welcome to {BRAND_NAME}.</p>
          <p className="text-3xl font-bold text-primary">Let’s create your account.</p>
          <p className="text-base text-muted">We’ll need a few details to get started.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label htmlFor="first-name" className="text-sm font-medium text-primary">
            First Name
          </label>
          <input
            id="first-name"
            type="text"
            value={form.firstName}
            onChange={(e) => updateField('firstName', e.target.value)}
            className="h-11 w-full rounded-md border border-subtle bg-white px-3 text-primary shadow-sm focus:border-primary focus:outline-none"
            placeholder="Enter first name"
            ref={firstNameRef}
          />
          {errors.firstName && <p className="text-xs text-danger">{errors.firstName}</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor="last-name" className="text-sm font-medium text-primary">
            Last Name
          </label>
          <input
            id="last-name"
            type="text"
            value={form.lastName}
            onChange={(e) => updateField('lastName', e.target.value)}
            className="h-11 w-full rounded-md border border-subtle bg-white px-3 text-primary shadow-sm focus:border-primary focus:outline-none"
            placeholder="Enter last name"
            ref={lastNameRef}
          />
          {errors.lastName && <p className="text-xs text-danger">{errors.lastName}</p>}
        </div>
        <div className="space-y-1">
          <label htmlFor="dob" className="text-sm font-medium text-primary">
            Date of Birth
          </label>
          <input
            id="dob"
            type="date"
            value={form.dob || ''}
            onChange={(e) => updateField('dob', e.target.value || null)}
            max={new Date().toISOString().split('T')[0]}
            className="h-11 w-full rounded-md border border-subtle bg-white px-3 text-primary shadow-sm focus:border-primary focus:outline-none"
          />
          {errors.dob && <p className="text-xs text-danger">{errors.dob}</p>}
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-primary mb-2">Gender</p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {(['male', 'female'] as const).map((option) => (
              <label key={option} className="flex items-center gap-2 text-sm text-primary">
                <input
                  type="radio"
                  name="gender"
                  value={option}
                  checked={form.gender === option}
                  onChange={() => updateField('gender', option)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="capitalize">{option}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:items-start md:gap-4">
        <div className="space-y-1 md:col-span-2 lg:col-span-2">
          <label htmlFor="country-code" className="text-sm font-medium text-primary">
            Country
          </label>
          <select
            id="country-code"
            className="h-11 w-full rounded-md border border-subtle bg-white px-3 text-primary shadow-sm focus:border-primary focus:outline-none"
            value={form.countryCode}
            onChange={(e) => updateField('countryCode', e.target.value)}
          >
            <option value="IN">India (+91)</option>
            <option value="US">United States (+1)</option>
            <option value="GB">United Kingdom (+44)</option>
            <option value="AU">Australia (+61)</option>
          </select>
        </div>
        <div className="space-y-1 md:col-span-4 lg:col-span-4">
          <label htmlFor="phone" className="text-sm font-medium text-primary">
            Phone Number
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            value={form.phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            onBlur={() => {
              setTouchedPhone(true);
              const err = validatePhone(form.phone);
              setErrors((prev) => ({ ...prev, phone: err }));
            }}
            className={`h-11 w-full rounded-md border ${
              showPhoneError ? 'border-danger' : 'border-subtle'
            } bg-white px-3 text-primary shadow-sm focus:border-primary focus:outline-none`}
            placeholder="Enter phone number"
            ref={phoneRef}
          />
          <p
            className={`min-h-[18px] text-xs ${
              showPhoneError ? 'text-danger' : 'text-transparent'
            }`}
          >
            {showPhoneError ? errors.phone : 'placeholder'}
          </p>
        </div>
        <div className="space-y-1 md:col-span-6 lg:col-span-6">
          <label htmlFor="email" className="text-sm font-medium text-primary">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => handleEmailChange(e.target.value)}
            onFocus={() => {
              guardPhoneFirst();
            }}
            onBlur={() => {
              setTouchedEmail(true);
              const err = validateEmail(form.email);
              setErrors((prev) => ({ ...prev, email: err }));
            }}
            className={`h-11 w-full rounded-md border ${
              showEmailError ? 'border-danger' : 'border-subtle'
            } bg-white px-3 text-primary shadow-sm focus:border-primary focus:outline-none`}
            placeholder="Enter email address"
            ref={emailRef}
          />
          <p
            className={`min-h-[18px] text-xs ${
              showEmailError ? 'text-danger' : 'text-transparent'
            }`}
          >
            {showEmailError ? errors.email : 'placeholder'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="password" className="text-sm font-medium text-primary">
            Create Password
          </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                onFocus={() => {
                  if (guardPhoneFirst()) return;
                }}
                onBlur={() => {
                  setTouchedPassword(true);
                  updatePasswordErrors(form.password, form.confirmPassword, true);
                }}
                className={`h-11 w-full rounded-md border ${
                  showPasswordError ? 'border-danger' : 'border-subtle'
                } bg-white px-3 pr-10 text-primary shadow-sm focus:border-primary focus:outline-none`}
                placeholder="Create password"
                ref={passwordRef}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-1 flex items-center justify-center text-muted hover:text-primary"
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m3 3 18 18" />
                    <path d="M10.6 10.6a3 3 0 0 0 4.8 3.4" />
                    <path d="M9.9 4.2A9.53 9.53 0 0 1 12 4c5 0 9 4.5 9.5 8-.12.79-.61 1.93-1.54 3.07M6.3 6.3C4.3 7.67 3 9.64 2.5 12c.27 1.31 1.07 2.84 2.36 4.17A11.88 11.88 0 0 0 12 20c1.14 0 2.24-.17 3.28-.52" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1.5 12C2.5 8.5 6.5 4 12 4s9.5 4.5 10.5 8c-1 3.5-5 8-10.5 8S2.5 15.5 1.5 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          <p
            className={`min-h-[18px] text-xs ${
              showPasswordError ? 'text-danger' : 'text-transparent'
            }`}
          >
            {showPasswordError ? errors.password : 'placeholder'}
          </p>
        </div>
        <div className="space-y-1">
          <label htmlFor="confirm-password" className="text-sm font-medium text-primary">
            Confirm Password
          </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={(e) => handleConfirmChange(e.target.value)}
                onFocus={() => {
                  if (guardPhoneFirst()) return;
                }}
                onBlur={() => {
                  setTouchedConfirm(true);
                  updatePasswordErrors(form.password, form.confirmPassword, true);
                }}
                className={`h-11 w-full rounded-md border ${
                  showConfirmError ? 'border-danger' : 'border-subtle'
                } bg-white px-3 pr-10 text-primary shadow-sm focus:border-primary focus:outline-none`}
                placeholder="Confirm password"
                ref={confirmRef}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute inset-y-0 right-1 flex items-center justify-center text-muted hover:text-primary"
              >
                {showConfirm ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m3 3 18 18" />
                    <path d="M10.6 10.6a3 3 0 0 0 4.8 3.4" />
                    <path d="M9.9 4.2A9.53 9.53 0 0 1 12 4c5 0 9 4.5 9.5 8-.12.79-.61 1.93-1.54 3.07M6.3 6.3C4.3 7.67 3 9.64 2.5 12c.27 1.31 1.07 2.84 2.36 4.17A11.88 11.88 0 0 0 12 20c1.14 0 2.24-.17 3.28-.52" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M1.5 12C2.5 8.5 6.5 4 12 4s9.5 4.5 10.5 8c-1 3.5-5 8-10.5 8S2.5 15.5 1.5 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          <p
            className={`min-h-[18px] text-xs ${
              showConfirmError ? 'text-danger' : 'text-transparent'
            }`}
          >
            {showConfirmError ? errors.confirmPassword : 'placeholder'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-primary">Registering as</p>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            {
              key: 'student',
              title: 'Student',
              desc: 'Learn with expert tutors and structured paths.',
              icon: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-8 w-8 text-[#1d4ed8]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 10 12 6l8 4-8 4-8-4Z" />
                  <path d="M12 12v6" />
                  <path d="m6 12 6 3 6-3" />
                </svg>
              ),
            },
            {
              key: 'tutor',
              title: 'Tutor',
              desc: 'Teach, mentor, and grow your tutoring practice.',
              icon: (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-8 w-8 text-[#059669]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="9" cy="9" r="3" />
                  <path d="M5 20v-1a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v1" />
                  <path d="M15 8h4" />
                  <path d="m17 6 2 2-2 2" />
                  <path d="M15.5 12.5c.5.3 1 .5 1.5.5h2" />
                </svg>
              ),
            },
          ].map((role) => {
            const selected =
              form.isTutor !== null &&
              ((role.key === 'tutor' && form.isTutor === true) ||
                (role.key === 'student' && form.isTutor === false));
            return (
              <button
                key={role.key}
                type="button"
                onClick={() => updateField('isTutor', role.key === 'tutor')}
                className={`flex h-full w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  selected
                    ? 'border-[#5fa8ff] bg-[#eef3ff]'
                    : 'border-subtle bg-white hover:border-primary'
                }`}
              >
                <div className="rounded-lg bg-white p-2 shadow-sm">{role.icon}</div>
                <div className="space-y-1">
                  <p className="text-base font-semibold text-primary">{role.title}</p>
                  <p className="text-sm text-muted">{role.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {submitError && (
        <div className="rounded-lg border border-danger bg-red-50 p-3 text-sm text-danger">
          {submitError}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="h-11 rounded-lg bg-[#5fa8ff] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:bg-[#5fa8ff]/40"
        >
          {isSubmitting ? 'Creating Account...' : 'Verify Phone'}
        </button>
      </div>
    </form>
  );
};


