import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../auth/useAdminAuth';

export function LoginPage() {
  const { user, login } = useAdminAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from =
    (location.state as { from?: string } | null)?.from ?? '/dashboard';

  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#e5e7eb] px-4">
      <div className="w-full max-w-md rounded-xl border border-subtle bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-primary">Tutorix Admin</h1>
        <p className="mt-2 text-sm text-muted">Sign in with your admin account.</p>

        <form className="mt-8 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <label htmlFor="admin-email" className="block text-sm font-medium text-primary">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-subtle px-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-sm font-medium text-primary">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 h-11 w-full rounded-lg border border-subtle px-3 text-sm outline-none focus:border-primary"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-lg bg-[#5fa8ff] text-sm font-semibold text-white transition hover:bg-[#4a97f5] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
