'use client';

import { useRouter } from 'next/navigation';
import { auth, signOut } from '@/lib/firebase';
import Link from 'next/link';

interface TopNavProps {
  adminRole: string;
  userName: string; // Added to display the person's name
}

export default function TopNav({ adminRole, userName }: TopNavProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error('❌ Logout failed:', error);
    }
  };

  // Updated to include customer-support
  const canViewDashboard = ['super-admin', 'admin', 'accountant', 'customer-support'].includes(adminRole);

  const roleDisplayNames: Record<string, string> = {
    'super-admin': 'Super Admin',
    'admin': 'Admin',
    'accountant': 'Accountant',
    'customer-support': 'Customer Support',
    'none': 'Admin Profile'
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 lg:px-8 shadow-sm">
      {/* Dashboard Link / Portal Name */}
      <div className="font-medium text-gray-800">
        {canViewDashboard ? (
            <Link href="/dashboard" className="hover:text-indigo-600 transition-colors">
              Admin Dashboard
            </Link>
        ) : (
            <span>Admin Portal</span>
        )}
      </div>
      
      <div className="flex items-center gap-6">
        {/* User Info Section */}
        <div className="text-right">
          <div className="text-sm font-bold text-gray-900">{userName || 'User'}</div>
          <div className="text-xs text-gray-500 font-medium">
            {roleDisplayNames[adminRole] || 'Admin Profile'}
          </div>
        </div>
        
        {/* Logout Button: Black default, Red on hover */}
        <button 
          onClick={handleLogout}
          className="text-sm border border-black text-black px-4 py-2 rounded-md transition-all font-medium 
                     hover:bg-red-600 hover:text-white hover:border-red-600"
        >
          Logout
        </button>
      </div>
    </header>
  );
}