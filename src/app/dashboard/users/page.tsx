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
  joined: string; // Maps to createdAt from API
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // Default newest first

  useEffect(() => {
    fetch('/api/admin/get-users')
      .then(res => res.json())
      .then(data => setUsers(data.users))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  // Filter users by search term
  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.mobile?.includes(searchTerm)
  );

  // Sort users based on Joined On (createdAt)
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    const dateA = a.joined ? new Date(a.joined).getTime() : 0;
    const dateB = b.joined ? new Date(b.joined).getTime() : 0;
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Export to Excel / CSV function
  const exportToCSV = () => {
    const headers = ['Name', 'Mobile', 'Email', 'Cigs Per Day', 'Joined On'];
    const rows = sortedUsers.map(u => [
      `"${u.name || 'No Name'}"`,
      `"${u.mobile || ''}"`,
      `"${u.email || ''}"`,
      u.cigsPerDay,
      `"${u.joined ? new Date(u.joined).toLocaleString() : ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `program_participants_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (authLoading) return <div className="p-6">Loading permissions...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Program Participants</h1>
        <button
          onClick={exportToCSV}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors flex items-center gap-2 shadow-sm"
        >
          📥 Download Excel (CSV)
        </button>
      </div>
      
      <input
        type="text"
        placeholder="Search by name or mobile..."
        className="w-full p-4 border rounded-xl"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="bg-white rounded-xl border overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b text-sm">
            <tr>
              <th className="p-4">Contact Info</th>
              <th className="p-4 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={toggleSortOrder}>
                <div className="flex items-center gap-1">
                  Joined On {sortOrder === 'asc' ? '↑' : '↓'}
                </div>
              </th>
              <th className="p-4">Smoking Stats</th>
              <th className="p-4 text-center">Progress</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Loading participants...</td></tr>
            ) : sortedUsers.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">No participants found.</td></tr>
            ) : (
              sortedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <div className="font-medium text-slate-900">{user.mobile}</div>
                    <div className="text-xs text-slate-500">{user.name || 'No Name'}</div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {user.joined ? new Date(user.joined).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 'N/A'}
                  </td>
                  <td className="p-4 text-sm text-slate-700">{user.cigsPerDay} cigs/day</td>
                  <td className="p-4 text-center"><ProgressCell userId={user.id} /></td>
                  <td className="p-4 text-right flex justify-end gap-3 items-center">
                    <Link href={`/dashboard/users/${user.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">View</Link>
                    {canEditData(admin?.role) && (
                      <button onClick={() => setEditingUser(user)} className="text-blue-600 hover:text-blue-800 font-medium text-sm">Edit</button>
                    )}
                  </td>
                </tr>
              ))
            )}
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