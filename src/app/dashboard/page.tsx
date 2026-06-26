import { adminDb } from '@/lib/firebaseAdmin';
import UserChart from './UserChart';

export default async function DashboardOverviewPage() {
  const snapshot = await adminDb.collection('users').get();
  const users = snapshot.docs.map(doc => doc.data());

  // Metrics Logic
  const totalUsers = users.length;
  const unverifiedUsers = users.filter(u => u.status !== 'active').length;
  const completedProgram = users.filter(u => Array.isArray(u.completedModules) && u.completedModules.length >= 21).length;
  const totalCigsAvoided = users.reduce((sum, u) => {
    const daily = u.cigsPerDay || 0;
    const daysClean = Array.isArray(u.completedModules) ? u.completedModules.length : 0;
    return sum + (daily * daysClean);
  }, 0);

  // Process data for the Chart (grouping by month)
  const monthlyData = users.reduce((acc: any, u) => {
    if (u.createdAt) {
      const month = new Date(u.createdAt.toDate()).toLocaleString('default', { month: 'short' });
      acc[month] = (acc[month] || 0) + 1;
    }
    return acc;
  }, {});

  const chartData = Object.keys(monthlyData).map(month => ({
    name: month,
    users: monthlyData[month]
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1">Live analytics from your UnsmokeLife database.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm font-medium text-slate-500 mb-1">Total Users</div>
          <div className="text-3xl font-bold text-slate-900">{totalUsers}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm font-medium text-slate-500 mb-1">Pending Approval</div>
          <div className="text-3xl font-bold text-amber-600">{unverifiedUsers}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm font-medium text-slate-500 mb-1">Program Completions</div>
          <div className="text-3xl font-bold text-indigo-600">{completedProgram}</div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-sm font-medium text-slate-500 mb-1">Total Cigs Avoided</div>
          <div className="text-3xl font-bold text-rose-600">{totalCigsAvoided.toLocaleString()}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h3 className="font-semibold text-slate-900 mb-6">User Acquisition Trends</h3>
        <UserChart data={chartData} />
      </div>
    </div>
  );
}