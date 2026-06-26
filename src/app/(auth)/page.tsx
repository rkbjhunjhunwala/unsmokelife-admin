'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase'; 

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      // 1. Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Fetch profile from Firestore
      const adminDocRef = doc(db, 'admins', user.uid);
      const adminSnap = await getDoc(adminDocRef);

      if (!adminSnap.exists()) {
        throw new Error('No admin profile found.');
      }

      // 3. Get Role from DB
      const userData = adminSnap.data();
      const rawRole = userData.role?.trim().toLowerCase();

      // 4. Define allowed roles
      const allowedRoles = ['super-admin', 'admin', 'customer-support', 'accountant', 'superadmin'];

      // 5. Authorization Gate
      if (allowedRoles.includes(rawRole)) {
        // Setup secure cookie flags for production
        const isProd = process.env.NODE_ENV === 'production';
        const secureFlag = isProd ? '; Secure' : '';

        // Set cookies for Middleware visibility
        document.cookie = `admin_uid=${user.uid}; path=/; max-age=86400; SameSite=Lax${secureFlag}`;
        document.cookie = `userRole=${rawRole}; path=/; max-age=86400; SameSite=Lax${secureFlag}`;

        // Role-based Redirect Logic
        if (rawRole === 'accountant') {
          router.push('/dashboard/payments');
        } else {
          router.push('/dashboard');
        }
        
        router.refresh();
      } else {
        await auth.signOut();
        setErrorMessage('Access Denied: You do not have valid administrative privileges.');
      }
    } catch (error: any) {
      console.error('Login Error:', error);
      setErrorMessage('Invalid email/password or unauthorized access.');
      await auth.signOut().catch(() => {});
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">UNSMOKELIFE</h1>
          <p className="text-slate-500 font-medium">Admin Portal Access</p>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium rounded-r">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 pr-12 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-70"
          >
            {isLoading ? 'Verifying...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}