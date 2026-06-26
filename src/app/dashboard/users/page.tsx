'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth'; 
import { canEditData, canManageAdmins } from '@/lib/permissions';
import EditUserModal from '@/app/dashboard/users/[id]/EditUserModal';

interface User {
  id: string;
  name: string;
  email: string;
  mobile: string;
  cigsPerDay: number;
  joined: string;
}

// Fixed Progress Component with explicit error logging
function ProgressCell({ userId }: { userId: string }) {
  const [data, setData] = useState<string>('...');

  useEffect(() => {
    let isMounted = true;
    async function fetchProgress() {
      try {
        const docRef = doc(db, 'users', userId, 'progress', 'status');
        const snap = await getDoc(docRef);
        
        if (!isMounted) return;

        if (snap.exists()) {
          const path = snap.data()?.lastCompletedPath || "";
          if (!path) { setData("Started"); return; }

          const parts = path.split('/');
          const getVal = (label: string) => parts.indexOf(label) !== -1 ? parts[parts.indexOf(label) + 1] : null;
          
          const day = getVal('days')?.replace('day_', '') || '0';
          const mod = getVal('modules')?.replace(/day\d+_/, '').replace('module_', '') || '0';
          const ch = getVal('chapters') || '0';
          
          setData(`D${day} M${mod} C${ch}`);
        } else {
          setData('New');
        }
      } catch (err) {
        console.error("Progress Fetch Error:", err);
        setData('Err');
      }
    }
    fetchProgress();
    return () => { isMounted = false; };
  }, [userId]);

  return <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-semibold">{data}</span>;
}

export default function UsersPage() {
  const { user: admin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/admin/get-users')
      .then(res => res.json())
      .then(data => setUsers(data.users))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.mobile?.includes(searchTerm)
  );

  if (authLoading) return <div className="p-6">Loading permissions...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Program Participants</h1>
      
      <input
        type="text"
        placeholder="Search by name or mobile..."
        className="w-full p-4 border rounded-xl"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b text-sm">
            <tr>
              <th className="p-4">Contact Info</th>
              <th className="p-4">Smoking Stats</th>
              <th className="p-4 text-center">Progress</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? <tr><td colSpan={4} className="p-8 text-center">Loading...</td></tr> : 
             filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="p-4">
                  <div className="font-medium">{user.mobile}</div>
                  <div className="text-xs text-slate-500">{user.name || 'No Name'}</div>
                </td>
                <td className="p-4">{user.cigsPerDay} cigs/day</td>
                <td className="p-4 text-center"><ProgressCell userId={user.id} /></td>
                <td className="p-4 text-right flex justify-end gap-2">
                  <Link href={`/dashboard/users/${user.id}`} className="text-indigo-600 font-medium text-sm">View</Link>
                  {canEditData(admin?.role) && <button onClick={() => setEditingUser(user)} className="text-blue-600 font-medium text-sm">Edit</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <EditUserModal 
          userId={editingUser.id} 
          onClose={() => setEditingUser(null)}
          initialData={{ 
            name: editingUser.name || 'Anonymous', 
            mobile: editingUser.mobile, 
            cigsPerDay: editingUser.cigsPerDay 
          }}
          adminRole={admin?.role || 'none'}
        />
      )}
    </div>
  );
}