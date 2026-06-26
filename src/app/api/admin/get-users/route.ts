import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin'; 

export async function GET() {
  try {
    console.log('🔍 Fetching all users from Firestore...');
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
      console.log('⚠️ No users found in database.');
      return NextResponse.json({ users: [] }, { status: 200 });
    }

    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'No Name',
        email: data.email || 'No Email',
        // Mapping existing fields from Firestore
        mobile: data.mobile || null,
        cigsPerDay: data.cigsPerDay || 0,
        yearsSmoking: data.yearsSmoking || 0,
        modulesCompleted: Array.isArray(data.completedModules) ? data.completedModules.length : 0,
        status: data.accountStatus || 'Unverified',
        // Safe date formatting
        joined: data.createdAt 
          ? (typeof data.createdAt.toDate === 'function' 
              ? data.createdAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'Unknown')
          : 'Unknown',
      };
    });

    console.log(`✅ Successfully fetched ${users.length} users.`);
    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error fetching users:', errorMessage);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}