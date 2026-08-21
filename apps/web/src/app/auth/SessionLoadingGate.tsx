import React from 'react';
import { useWebAuth } from './useWebAuth';

export function SessionLoadingGate({ children }: { children: React.ReactNode }) {
  const { loading } = useWebAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#e9f5fe]">
        <img src="/tutorix-logo.png" alt="Tutorix" className="h-40 w-auto" />
      </div>
    );
  }

  return children;
}
