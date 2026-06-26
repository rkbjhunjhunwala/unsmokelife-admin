import { adminDb } from '@/lib/firebaseAdmin';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function ActivityLogsPage() {
  const cookieStore = await cookies();
  const userRole = cookieStore.get('userRole')?.value?.trim().toLowerCase();

  // 1. Guard: Ensure the user is authorized to see any logs
  const authorizedRoles = ['super-admin', 'admin', 'accountant','customer-support'];
  if (!userRole || !authorizedRoles.includes(userRole)) {
    redirect('/dashboard');
  }

  // 2. Build the query: Base query for the most recent logs
  let query = adminDb.collection('activity_logs')
    .orderBy('timestamp', 'desc')
    .limit(50);

  // 3. Security Filtering: Accountants only see 'payment' category logs
  if (userRole === 'accountant') {
    query = query.where('category', '==', 'payment');
  }

  const snapshot = await query.get();
  const logs = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {userRole === 'accountant' ? 'Payment Activity Logs' : 'Admin Activity Logs'}
        </h1>
        <p className="text-slate-500 mt-1">
          {userRole === 'accountant'
            ? 'Audit trail of all payment-related transactions.'
            : 'Complete audit trail of all administrative actions.'}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-left font-semibold text-slate-700">Action</th>
              <th className="p-4 text-left font-semibold text-slate-700">Participant Details</th>
              <th className="p-4 text-left font-semibold text-slate-700">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.length > 0 ? (
              logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-900">{log.action}</td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-900">{log.userName || 'Unknown User'}</div>
                    <div className="text-xs text-slate-500">{log.userMobile || 'No mobile'}</div>
                  </td>
                  <td className="p-4 text-slate-500">
                    {log.timestamp && typeof log.timestamp.toDate === 'function'
                      ? new Date(log.timestamp.toDate()).toLocaleString() // Firestore Timestamp object
                      : log.timestamp instanceof Date
                        ? log.timestamp.toLocaleString()                  // Standard JS Date object
                        : new Date(log.timestamp).toLocaleString()        // String or Number (fallback)
                    }
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-8 text-center text-slate-400">
                  No logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}