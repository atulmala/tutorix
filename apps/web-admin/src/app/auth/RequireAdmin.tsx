import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAdminAuth } from './useAdminAuth';

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#e9f5fe]">
        <img src="/tutorix-logo.png" alt="Tutorix" className="h-40 w-auto" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
