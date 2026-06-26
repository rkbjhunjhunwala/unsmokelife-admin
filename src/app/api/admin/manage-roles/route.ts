import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { logAdminAction } from '@/lib/logger';

/**
 * Validates if the user has the required permission level.
 */
async function authorize(
  request: Request, 
  minRole: 'admin' | 'customer-support' | 'super-admin' = 'admin'
): Promise<boolean> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return false;
    
    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    const adminDoc = await adminDb.collection('admins').doc(decodedToken.uid).get();
    const adminData = adminDoc.data();
    
    if (!adminData) return false;

    const roleHierarchy = { 'customer-support': 1, 'admin': 2, 'super-admin': 3 };
    const userRoleValue = roleHierarchy[adminData.role as keyof typeof roleHierarchy] || 0;
    const requiredRoleValue = roleHierarchy[minRole];

    return userRoleValue >= requiredRoleValue;
  } catch (error) {
    console.error("Auth: Verification failed", error);
    return false;
  }
}

// 1. CREATE (POST)
export async function POST(request: Request) {
  if (!(await authorize(request, 'admin'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, role, mobileNo, email, password, createdByUid } = body;

    const userRecord = await adminAuth.createUser({ email, password, displayName: name });
    await adminAuth.setCustomUserClaims(userRecord.uid, { adminRole: role });
    
    await adminDb.collection('admins').doc(userRecord.uid).set({
      name, role, mobileNo, email, uid: userRecord.uid, 
      createdAt: new Date().toISOString(), status: 'active'
    });

    await logAdminAction(createdByUid || 'system', `Created team member: ${name}`, userRecord.uid);
    return NextResponse.json({ success: true, uid: userRecord.uid });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 2. READ (GET)
export async function GET(request: Request) {
  if (!(await authorize(request, 'customer-support'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // DEBUG: Log collection name to ensure it matches your Firebase Console
    const snapshot = await adminDb.collection('admins').get();
    
    console.log(`[DEBUG] Querying 'admins' collection. Found ${snapshot.size} docs.`);
    
    const roles = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    return NextResponse.json({ roles });
  } catch (error: any) {
    console.error("[DEBUG] API GET Error:", error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

// 3. UPDATE (PATCH)
export async function PATCH(request: Request) {
  if (!(await authorize(request, 'admin'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { uid, role, name, mobileNo, adminUid } = await request.json();
    if (!uid) return NextResponse.json({ error: 'UID required' }, { status: 400 });

    await adminDb.collection('admins').doc(uid).update({ 
      role, name, mobileNo, updatedAt: new Date().toISOString() 
    });
    
    if (role) await adminAuth.setCustomUserClaims(uid, { adminRole: role });

    await logAdminAction(adminUid || 'system', `Updated team member: ${name}`, uid);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 4. DELETE (DELETE)
export async function DELETE(request: Request) {
  if (!(await authorize(request, 'admin'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const uidToDelete = searchParams.get('uid');
    
    // Auth check for self-deletion
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split('Bearer ')[1];
    const requester = await adminAuth.verifyIdToken(token!);

    if (!uidToDelete || requester.uid === uidToDelete) {
        return NextResponse.json({ error: 'Invalid UID or Self-deletion forbidden' }, { status: 403 });
    }

    const adminUid = request.headers.get('x-admin-uid') || 'system';
    await adminAuth.deleteUser(uidToDelete);
    await adminDb.collection('admins').doc(uidToDelete).delete();

    await logAdminAction(adminUid, `Deleted team member`, uidToDelete);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}