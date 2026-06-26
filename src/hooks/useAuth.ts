'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

// 1. Update the interface to include 'name' and any other fields you need
export interface AuthUser extends User {
  role?: string;
  name?: string;
  mobileNo?: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // 2. Fetch the entire document to get all fields (role, name, etc.)
        const userDoc = await getDoc(doc(db, 'admins', currentUser.uid));
        
        if (userDoc.exists()) {
          const data = userDoc.data();
          // 3. Spread the fetched data into the user object
          setUser({ 
            ...currentUser, 
            role: data.role, 
            name: data.name,
            mobileNo: data.mobileNo 
          });
        } else {
          setUser(currentUser);
        }
      } catch (error) {
        console.error("Auth sync error:", error);
        setUser(currentUser);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (!user && pathname.startsWith('/dashboard')) router.push('/');
      else if (user && pathname === '/') router.push('/dashboard');
    }
  }, [user, loading, pathname, router]);

  return { user, loading };
}