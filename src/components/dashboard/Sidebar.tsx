'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  canManageAdmins,
  canViewLogs,
  canAccessPayments,
  canViewUserList // Added this import
} from '@/lib/permissions';

export default function Sidebar() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // Normalize role to ensure our permission functions work
  const userRole = user?.role || 'guest';

  // 1. Define links and permissions
  const allLinks = [
    { name: 'Overview', href: '/dashboard', show: true },
    // Users tab now uses the granular permission check
    { name: 'Users', href: '/dashboard/users', show: canViewUserList(userRole) },
    { name: 'Manage Roles', href: '/dashboard/manage-roles', show: canManageAdmins(userRole) },
    { name: 'Payments', href: '/dashboard/payments', show: canAccessPayments(userRole) },
    { name: 'Logs', href: '/dashboard/logs', show: canViewLogs(userRole) },
  ];

  const navLinks = allLinks.filter(link => link.show);

  // 2. Consistent loading state (avoids flickering)
  if (loading) {
    return (
      <aside className="w-64 bg-slate-900 text-white flex flex-col h-full shadow-lg animate-pulse">
        <div className="h-16 px-6 border-b border-slate-800" />
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col h-full shadow-lg">
      <div className="h-16 flex items-center px-6 border-b border-slate-800 font-bold text-xl tracking-wider">
        UNSMOKELIFE
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`block px-4 py-3 rounded-md transition-all ${isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-4 border-t border-slate-800 text-center space-y-3">
        {/* Branding Footer */}
        <div className="flex flex-col items-center gap-2">
          <img
            src="/favicon.ico"
            alt="Logo"
            className="w-8 h-8 rounded-full border border-slate-700 object-cover opacity-90 shadow-sm"
          />
          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
            A Tomtechie Product
          </p>
        </div>

        {/* Version Info */}
        <div className="text-[10px] text-slate-600">
          Admin Portal v1.0
        </div>
      </div>
    </aside>
  );
}