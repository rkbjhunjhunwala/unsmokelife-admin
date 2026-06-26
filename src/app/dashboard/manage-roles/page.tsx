'use client';

import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { useAuth } from '@/hooks/useAuth';
import { canManageAdmins, ROLES } from '@/lib/permissions';

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'admin' },
  { label: 'Accountant', value: 'accountant' },
  { label: 'Customer Support', value: 'customer-support' },
];

export default function ManageRolesPage() {
  const { user, loading: authLoading } = useAuth();
  
  const initialFormState = { name: '', role: 'accountant', mobileNo: '', email: '', password: '' };
  const [formData, setFormData] = useState(initialFormState);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [teamList, setTeamList] = useState<any[]>([]);
  const [editingUid, setEditingUid] = useState<string | null>(null);

  const isSuperAdmin = user?.role?.trim().toLowerCase() === ROLES.SUPER_ADMIN.toLowerCase();
  const isAdminOrSuper = isSuperAdmin || user?.role?.trim().toLowerCase() === 'admin';

  const fetchRoles = async () => {
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;

      const res = await fetch('/api/admin/manage-roles', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');
      
      setTeamList(Array.isArray(data.roles) ? data.roles : []);
    } catch (error) {
      console.error("Failed to fetch roles", error);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchRoles();
  }, [authLoading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      
      const response = await fetch('/api/admin/manage-roles', {
        method: editingUid ? 'PATCH' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}` 
        },
        body: JSON.stringify(editingUid 
          ? { uid: editingUid, name: formData.name, role: formData.role, mobileNo: formData.mobileNo, adminUid: user?.uid } 
          : { ...formData, createdByUid: user?.uid }
        ),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Operation failed');

      setStatus({ type: 'success', message: `Team member ${editingUid ? 'updated' : 'added'} successfully!` });
      setFormData(initialFormState);
      setEditingUid(null);
      fetchRoles();
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (uid: string) => {
    if (uid === user?.uid) {
      alert("You cannot delete your own account.");
      return;
    }
    if (!window.confirm('Are you sure you want to delete this team member?')) return;
    
    try {
      const auth = getAuth();
      const idToken = await auth.currentUser?.getIdToken();
      
      const res = await fetch(`/api/admin/manage-roles?uid=${uid}`, { 
        method: 'DELETE',
        headers: { 
          'x-admin-uid': user?.uid || 'system',
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (!res.ok) throw new Error('Failed to delete');
      setTeamList((prev) => prev.filter((m) => m.uid !== uid));
    } catch (error) {
      alert("Delete failed. Please ensure you have sufficient permissions.");
    }
  };

  if (authLoading) return <div className="p-6">Loading permissions...</div>;

  return (
    <div className="p-6 space-y-8">
      {(canManageAdmins(user?.role) || isSuperAdmin) && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 max-w-2xl">
          <h2 className="text-lg font-semibold mb-4">{editingUid ? 'Edit Team Member' : 'Add New Team Member'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {status.message && <div className={`p-3 rounded-md text-sm ${status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{status.message}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} className="p-2 border rounded-md w-full" required />
              <input name="mobileNo" placeholder="Mobile Number" value={formData.mobileNo} onChange={handleChange} className="p-2 border rounded-md w-full" required pattern="[0-9]{10}" />
            </div>
            <input name="email" type="email" placeholder="Email Address" value={formData.email} onChange={handleChange} className="p-2 border rounded-md w-full" disabled={!!editingUid} required />
            {!editingUid && <input name="password" type="password" placeholder="Initial Password" value={formData.password} onChange={handleChange} className="p-2 border rounded-md w-full" required />}
            <select name="role" value={formData.role} onChange={handleChange} className="p-2 border rounded-md w-full">
              {ROLE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
            <button type="submit" disabled={isLoading} className="bg-indigo-600 text-white px-6 py-2 rounded-md font-medium">{isLoading ? 'Processing...' : 'Save Member'}</button>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <table className="w-full text-left text-sm">
          <tbody className="divide-y">
            {teamList.length > 0 ? teamList.map((m) => (
              <tr key={m.uid}>
                <td className="px-6 py-4 font-medium">{m.name}</td>
                <td className="px-6 py-4">{m.role}</td>
                <td className="px-6 py-4 text-right">
                  {isAdminOrSuper && (
                    <>
                      <button onClick={() => { setEditingUid(m.uid); setFormData({name: m.name, role: m.role, mobileNo: m.mobileNo, email: m.email, password: ''}); }} className="text-blue-600 mr-4 hover:underline">Edit</button>
                      <button onClick={() => handleDelete(m.uid)} className="text-red-600 hover:underline">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            )) : <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-500">No team members found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}