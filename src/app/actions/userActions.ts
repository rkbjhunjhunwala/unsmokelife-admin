'use server';

import { adminDb } from '@/lib/firebaseAdmin';
import { revalidatePath } from 'next/cache';
import { logAdminAction } from '@/lib/activityLogger';
import { canEditData, canSuspendUser } from '@/lib/permissions';

/**
 * Toggles a user's account status between 'active' and 'suspended'.
 */
export async function toggleUserSuspension(userId: string, currentStatus: string, adminRole: string) {
  try {
    if (!canSuspendUser(adminRole)) {
      return { success: false, error: 'Unauthorized: You do not have permission to suspend users.' };
    }

    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    
    await adminDb.collection('users').doc(userId).update({
      status: newStatus,
      updatedAt: new Date().toISOString()
    });

    await logAdminAction('admin-dashboard', `Toggled status to ${newStatus}`, userId);

    revalidatePath(`/dashboard/users/${userId}`);
    revalidatePath('/dashboard/users');

    return { success: true, newStatus };
  } catch (error) {
    console.error('Error updating user status:', error);
    return { success: false, error: 'Failed to update user status.' };
  }
}

/**
 * Updates user profile, unlockedDay setting, and lastCompletedPath progress.
 */
export async function updateUserProfile(userId: string, formData: FormData, adminRole: string) {
  try {
    // 1. SECURITY GUARD: Check permissions
    if (!canEditData(adminRole)) {
      return { success: false, error: 'Unauthorized: You do not have permission to edit user data.' };
    }

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return { success: false, error: 'User not found.' };
    }

    // 2. Extract and sanitize inputs
    const formMobile = formData.get('mobile') as string;
    const formCigs = formData.get('cigsPerDay') as string;
    const formUnlockedDay = formData.get('unlockedDay') as string;
    const formLastPath = formData.get('lastCompletedPath') as string;

    // 3. Prepare core user update data
    const updateData = {
      mobile: formMobile && formMobile.trim() !== '' ? formMobile : (userDoc.data()?.mobile || ''),
      cigsPerDay: formCigs && formCigs.trim() !== '' ? Number(formCigs) : (userDoc.data()?.cigsPerDay || 0),
      updatedAt: new Date().toISOString()
    };

    if (isNaN(updateData.cigsPerDay)) {
      return { success: false, error: 'Invalid input for cigarettes per day.' };
    }

    // 4. Use a Batch to update all locations atomically
    const batch = adminDb.batch();

    // A. Update main user document
    batch.update(userDocRef, updateData);

    // B. Update nested 'unlockedDay' in /users/{userId}/settings/access
    if (formUnlockedDay) {
      const accessDocRef = userDocRef.collection('settings').doc('access');
      batch.set(accessDocRef, { 
        unlockedDay: Number(formUnlockedDay), 
        updatedAt: new Date().toISOString() 
      }, { merge: true });
    }

    // C. Update 'lastCompletedPath' in /users/{userId}/progress/status
    if (formLastPath) {
      const progressDocRef = userDocRef.collection('progress').doc('status');
      batch.set(progressDocRef, { 
        lastCompletedPath: formLastPath,
        updatedAt: new Date().toISOString() 
      }, { merge: true });
    }

    // 5. Commit batch
    await batch.commit();

    // 6. Log action
    await logAdminAction('admin-dashboard', 'Updated profile, access, and progress path', userId);

    revalidatePath(`/dashboard/users/${userId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    return { success: false, error: 'Failed to update user profile.' };
  }
}