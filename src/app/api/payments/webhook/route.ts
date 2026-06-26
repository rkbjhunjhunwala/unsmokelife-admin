import { NextResponse } from 'next/server';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-razorpay-signature') || '';

  // 1. Verify the signature to ensure the request is actually from Razorpay
  const isValid = validateWebhookSignature(
    body,
    signature,
    process.env.RAZORPAY_WEBHOOK_SECRET!
  );

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const event = JSON.parse(body);

  // 2. Handle the 'payment_link.paid' event
  if (event.event === 'payment_link.paid') {
    const paymentDetails = event.payload.payment_link.entity;
    const referenceId = paymentDetails.reference_id; // Your Firestore UID

    // 3. Update Firestore status
    await adminDb.collection('payments').doc(referenceId).update({
      status: 'paid',
      paymentId: event.payload.payment.entity.id,
      updatedAt: new Date().toISOString(),
    });

    console.log(`Payment successful for reference: ${referenceId}`);
  }

  return NextResponse.json({ status: 'ok' });
}