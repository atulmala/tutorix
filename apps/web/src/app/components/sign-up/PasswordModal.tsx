import React, { useEffect, useState } from 'react';

type PasswordModalProps = {
  open: boolean;
  password: string;
  confirmPassword: string;
  error: string;
  onChangePassword: (value: string) => void;
  onChangeConfirm: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
};

export const PasswordModal: React.FC<PasswordModalProps> = ({
  open,
  password,
  confirmPassword,
  error,
  onChangePassword,
  onChangeConfirm,
  onClose,
  onSubmit,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Reset visibility toggles when opened
  useEffect(() => {
    if (open) {
      setShowPassword(false);
      setShowConfirm(false);
    }
  }, [open]);

  if (!open) return null;

  const disabled = !password || !confirmPassword || !!error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-password-title"
      >
        <div className="flex items-start justify-between gap-4">
          <h3 id="create-password-title" className="text-xl font-semibold text-primary">
            Create Password
          </h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-primary transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-1 text-left">
            <label htmlFor="password" className="text-sm font-medium text-primary">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => onChangePassword(e.target.value)}
                className="w-full rounded-md border border-subtle bg-white px-md py-sm pr-10 text-primary shadow-sm focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-2 flex items-center text-muted hover:text-primary"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
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
                    className="h-6 w-6"
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
          </div>

          <div className="space-y-1 text-left">
            <label htmlFor="confirm-password" className="text-sm font-medium text-primary">
              Confirm password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => onChangeConfirm(e.target.value)}
                className="w-full rounded-md border border-subtle bg-white px-md py-sm pr-10 text-primary shadow-sm focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((prev) => !prev)}
                className="absolute inset-y-0 right-2 flex items-center text-muted hover:text-primary"
                aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirm ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
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
                    className="h-6 w-6"
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
          </div>

          {error && (
            <p className="text-xs text-danger" role="alert" aria-live="polite">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              className="rounded-md border border-subtle bg-white px-4 py-2 text-primary shadow-sm transition hover:border-primary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-[#5fa8ff] px-5 py-2 text-white shadow-sm transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:bg-[#5fa8ff]/40"
              onClick={onSubmit}
              disabled={disabled}
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

