import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAdminAuth } from '../auth/useAdminAuth';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/tutors', label: 'Tutors' },
  { to: '/students', label: 'Students' },
] as const;

export function AdminNavDrawer() {
  const { user, logout } = useAdminAuth();

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.email ||
    'Admin';

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-subtle bg-white">
      <div className="border-b border-subtle px-5 py-5">
        <p className="text-lg font-semibold text-primary">Tutorix Admin</p>
        <p className="mt-1 truncate text-xs text-muted">{displayName}</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-gray-50 hover:text-primary'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-subtle p-4">
        <button
          type="button"
          onClick={() => void logout()}
          className="h-10 w-full rounded-lg border border-subtle text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary/5"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
