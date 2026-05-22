import React from 'react';
import { Outlet } from 'react-router-dom';
import { AdminNavDrawer } from '../components/AdminNavDrawer';

export function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-[#e5e7eb]">
      <AdminNavDrawer />
      <main className="flex-1 overflow-auto p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
