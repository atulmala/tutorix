import React from 'react';
import { useWebAuth } from './useWebAuth';

export function SessionLoadingGate({ children }: { children: React.ReactNode }) {
  const { loading } = useWebAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-subtle text-primary">
        <p className="text-sm text-muted">Loading…</p>
      </div>
    );
  }

  return children;
}
