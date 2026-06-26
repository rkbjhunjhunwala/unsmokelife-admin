import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const { userId, userName, amount, remarks } = await request.json();

    await adminDb.collection('payments').add({
      userId,
      userName,
      amount: parseFloat(amount),
      method: 'cash',
      status: 'paid',
      remarks,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to record cash payment' }, { status: 500 });
  }
}