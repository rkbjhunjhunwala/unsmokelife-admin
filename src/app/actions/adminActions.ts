'use server';

import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { revalidatePath } from 'next/cache';

export async function createAdminAccount(
  // 1. Accept the ID Token instead of a role string
  idToken: string, 
  adminData: { email: string; name: string; role: string; password: string }
) {
  try {
    // 2. Verify the identity of the person making the request
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const requestorDoc = await adminDb.collection('admins').doc(decodedToken.uid).get();
    
    // 3. Server-side role verification
    if (requestorDoc.data()?.role !== 'super-admin') {
      return { success: false, error: 'Unauthorized: Access Denied.' };
    }

    // 4. Create the Auth account
    const userRecord = await adminAuth.createUser({
      email: adminData.email,
      password: adminData.password,
      displayName: adminData.name,
    });

    // 5. Store the profile in Firestore
    await adminDb.collection('admins').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: adminData.email,
      name: adminData.name,
      role: adminData.role,
      createdAt: new Date().toISOString(),
    });

    revalidatePath('/dashboard/settings/admins');
    return { success: true, uid: userRecord.uid };
  } catch (error) {
    console.error('Create Admin Error:', error);
    return { success: false, error: 'Failed to create admin account.' };
  }
}