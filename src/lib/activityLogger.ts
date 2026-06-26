import { adminDb } from '@/lib/firebaseAdmin';

export async function logAdminAction(adminId: string, action: string, targetUserId: string) {
  try {
    // Fetch the user's current profile to get name and mobile
    const userDoc = await adminDb.collection('users').doc(targetUserId).get();
    const userData = userDoc.data();

    await adminDb.collection('activity_logs').add({
      adminId,
      action,
      targetUserId,
      // Store the friendly display info
      userName: userData?.name || 'Unknown',
      userMobile: userData?.mobile || 'N/A',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}