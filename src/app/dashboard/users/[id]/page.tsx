import { adminDb } from '@/lib/firebaseAdmin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import AdminActionButtons from './AdminActionButtons';
import { cookies } from 'next/headers';

interface UserProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const resolvedParams = await params;
  const userId = resolvedParams.id;

  // 1. IDENTIFY THE CURRENT ADMIN
  const cookieStore = await cookies();
  const adminUid = cookieStore.get('admin_uid')?.value;

  // 2. FETCH ADMIN ROLE
  let adminRole = 'none';
  if (adminUid) {
    const adminDoc = await adminDb.collection('admins').doc(adminUid).get();
    if (adminDoc.exists) {
      adminRole = adminDoc.data()?.role || 'none';
    }
  }

  // 3. FETCH TARGET USER & SUB-COLLECTIONS
  const userDocRef = adminDb.collection('users').doc(userId);
  const userDoc = await userDocRef.get();
  
  const accessDoc = await userDocRef.collection('settings').doc('access').get();
  const progressDoc = await userDocRef.collection('progress').doc('status').get();
  
  // Fetch the list of completed chapters
  const completedChaptersSnap = await userDocRef.collection('completedChapters').get();
  const completedChaptersList = completedChaptersSnap.docs.map(doc => doc.id);

  if (!userDoc.exists) {
    notFound();
  }

  const user = userDoc.data();
  // Changed: Use null if document doesn't exist so we can show "Not Set"
  const accessData = accessDoc.exists ? accessDoc.data() : { unlockedDay: null };
  const progressData = progressDoc.exists ? progressDoc.data() : { lastCompletedPath: null };

  const formatProgressPath = (path: string | null) => {
    if (!path) return 'No progress yet';
    return path
      .split('/')
      .filter((_, index) => index % 2 !== 0)
      .map(s => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
      .join(', ');
  };

  const name = user?.name || 'Anonymous User';
  const mobile = user?.mobile || 'No mobile provided';
  const email = user?.email || 'No email provided';
  const photoURL = user?.photoURL || 'https://ui-avatars.com/api/?name=User&background=random';
  const cigsPerDay = user?.cigsPerDay || 0;
  const costPerCig = user?.costPerCig || 0;
  const yearsSmoking = user?.yearsSmoking || 0;
  const modulesCompleted = Array.isArray(user?.completedModules) ? user?.completedModules.length : 0;

  const joinedDate = user?.createdAt && typeof user?.createdAt.toDate === 'function'
    ? new Date(user.createdAt.toDate()).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      })
    : 'Unknown Date';

  const annualCost = cigsPerDay * costPerCig * 365;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/users" className="text-slate-500 hover:text-indigo-600 transition-colors">
          ← Back to Users
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">User Profile</h1>
        <div className="flex gap-3">
          <AdminActionButtons 
            userId={userId} 
            currentStatus={user?.status || 'active'} 
            initialName={name} // Pass the name variable here 
            initialCigs={cigsPerDay}
            initialUnlockedDay={accessData?.unlockedDay}
            adminRole={adminRole} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col items-center text-center">
          <img src={photoURL} alt="Profile" className="w-24 h-24 rounded-full border-4 border-slate-50 mb-4 object-cover" />
          <h2 className="text-xl font-bold text-slate-900">{name}</h2>
          <p className="text-slate-500 text-sm mb-4">Joined {joinedDate}</p>
          <div className="w-full border-t border-slate-100 pt-4 space-y-3 text-left mt-2">
            <div><div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mobile</div><div className="font-medium text-slate-900">{mobile}</div></div>
            <div><div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</div><div className="font-medium text-slate-900">{email}</div></div>
            <div><div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">User ID</div><div className="font-mono text-xs text-slate-500 bg-slate-50 p-2 rounded mt-1 break-all">{userId}</div></div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm">
              <div className="text-xs font-semibold text-amber-600 uppercase">Unlocked Day</div>
              {/* Changed: Displays "Not Set" if unlockedDay is null/undefined */}
              <div className="text-2xl font-bold text-amber-900 mt-1">
                {accessData?.unlockedDay ? `Day ${accessData.unlockedDay}` : 'Not Set'}
              </div>
            </div>
            <div className="bg-sky-50 p-4 rounded-xl border border-sky-100 shadow-sm">
              <div className="text-xs font-semibold text-sky-600 uppercase">Last Completed</div>
              <div className="text-sm font-bold text-sky-900 mt-2 truncate">
                {formatProgressPath(progressData?.lastCompletedPath || null)}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Smoking Baseline</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg"><div className="text-sm text-slate-500">Cigs / Day</div><div className="text-2xl font-bold text-slate-900 mt-1">{cigsPerDay}</div></div>
              <div className="bg-slate-50 p-4 rounded-lg"><div className="text-sm text-slate-500">Years</div><div className="text-2xl font-bold text-slate-900 mt-1">{yearsSmoking}</div></div>
              <div className="bg-slate-50 p-4 rounded-lg"><div className="text-sm text-slate-500">Cost / Cig</div><div className="text-2xl font-bold text-slate-900 mt-1">₹{costPerCig}</div></div>
              <div className="bg-rose-50 p-4 rounded-lg border border-rose-100"><div className="text-sm text-rose-600 font-medium">Est. Annual</div><div className="text-2xl font-bold text-rose-700 mt-1">₹{annualCost.toLocaleString()}</div></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Completed Chapters</h3>
            {completedChaptersList.length > 0 ? (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {completedChaptersList.map((chapterId) => (
                  <li key={chapterId} className="flex items-center text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="mr-2 text-green-500">✓</span>
                    {chapterId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 italic">No chapters completed yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}