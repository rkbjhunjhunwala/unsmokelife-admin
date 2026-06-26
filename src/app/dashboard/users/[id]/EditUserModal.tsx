'use client';

import { useState } from 'react';
import { updateUserProfile } from '@/app/actions/userActions';

interface EditUserModalProps {
  userId: string;
  onClose: () => void;
  initialData: { 
    name: string; // Changed from mobile
    cigsPerDay: number; 
    mobile?: string;
    unlockedDay?: number; 
  };
  adminRole: string;
}

export default function EditUserModal({ userId, onClose, initialData, adminRole }: EditUserModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    
    const result = await updateUserProfile(userId, formData, adminRole);
    
    setIsSaving(false);
    if (!result.success) {
      alert(result.error);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl space-y-4">
        <h2 className="text-xl font-bold">Edit Participant Data</h2>
        
        <div>
          <label className="block text-sm font-medium text-slate-700">Full Name</label>
          <input 
            name="name" 
            defaultValue={initialData.name} 
            className="w-full mt-1 p-2 border rounded-lg" 
            required 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700">Cigarettes per Day</label>
          <input 
            name="cigsPerDay" 
            type="number" 
            defaultValue={initialData.cigsPerDay} 
            className="w-full mt-1 p-2 border rounded-lg" 
            required 
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Unlocked Day</label>
          <select 
            name="unlockedDay" 
            defaultValue={initialData.unlockedDay || 7} 
            className="w-full mt-1 p-2 border rounded-lg"
          >
            {[2, 3, 4, 5, 6, 7].map((day) => (
              <option key={day} value={day}>Day {day}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-lg">Cancel</button>
          <button type="submit" disabled={isSaving} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}