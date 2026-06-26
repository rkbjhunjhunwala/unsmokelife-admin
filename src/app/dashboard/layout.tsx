'use client';

import Sidebar from '@/components/dashboard/Sidebar';
import TopNav from '@/components/dashboard/TopNav';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  // Show a clean loading state while Firebase checks their credentials
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 text-slate-500 font-medium">
        Verifying access...
      </div>
    );
  }

  // If no user is found, prevent flashing UI
  if (!user) {
    return null; 
  }

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Pass the user's role and name from the auth hook to the TopNav */}
        <TopNav 
          adminRole={user.role || 'none'} 
          userName={user.name || 'Admin'} 
        />
        
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}