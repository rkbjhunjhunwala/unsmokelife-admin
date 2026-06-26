'use client';

import { useState } from 'react';
import { toggleUserSuspension } from '@/app/actions/userActions';
import EditUserModal from './EditUserModal';
import { canEditData, canSuspendUser } from '@/lib/permissions';

interface AdminActionButtonsProps {
  userId: string;
  currentStatus: string;
  initialName: string; 
  initialCigs: number;
  adminRole: string;
  initialUnlockedDay?: number;
}

export default function AdminActionButtons({ 
  userId, 
  currentStatus, 
  initialName, 
  initialCigs,
  adminRole,
  initialUnlockedDay
}: AdminActionButtonsProps) {
  const [isSuspending, setIsSuspending] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const isSuspended = currentStatus === 'suspended';

  // Resilient Permission Checks
  const normalizedRole = adminRole?.trim().toLowerCase();
  const hasEditPermission = canEditData(normalizedRole) || normalizedRole === 'superadmin' || normalizedRole === 'super-admin';
  const hasSuspendPermission = canSuspendUser(normalizedRole) || normalizedRole === 'superadmin' || normalizedRole === 'super-admin';

  const handleSuspend = async () => {
    const confirmed = window.confirm(
      isSuspended 
        ? 'Reactivate this user?' 
        : 'Suspend this user? They will lose access to the app.'
    );
    
    if (!confirmed) return;

    setIsSuspending(true);
    try {
      await toggleUserSuspension(userId, currentStatus, adminRole);
    } catch (error) {
      console.error("Suspension failed:", error);
      alert("Failed to update user status.");
    } finally {
      setIsSuspending(false);
    }
  };

  return (
    <>
      <div className="flex gap-3">
        {/* Suspend Button */}
        {hasSuspendPermission && (
          <button 
            onClick={handleSuspend}
            disabled={isSuspending}
            className={`px-4 py-2 rounded-lg font-medium transition-colors border ${
              isSuspended 
                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                : 'bg-white text-rose-600 border-slate-200 hover:bg-rose-50'
            }`}
          >
            {isSuspending ? 'Processing...' : isSuspended ? 'Reactivate' : 'Suspend'}
          </button>
        )}
        
        {/* Edit Data Button */}
        {hasEditPermission && (
          <button 
            onClick={() => setShowEditModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Edit Data
          </button>
        )}
      </div>

      {showEditModal && (
        <EditUserModal 
          userId={userId} 
          onClose={() => setShowEditModal(false)}
          initialData={{
            name: initialName,
            cigsPerDay: initialCigs,
            unlockedDay: initialUnlockedDay
          }}
          adminRole={adminRole}
        />
      )}
    </>
  );
}