import { NextResponse } from 'next/server';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    // 1. Verify signature
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
      const referenceId = paymentDetails.reference_id; 

      // 3. Update Firestore with a check for existence
      const paymentRef = adminDb.collection('payments').doc(referenceId);
      
      await paymentRef.set({
        status: 'paid',
        paymentId: event.payload.payment.entity.id,
        updatedAt: new Date().toISOString(),
      }, { merge: true }); // Using merge: true prevents crashes if doc doesn't exist

      console.log(`Payment successful for reference: ${referenceId}`);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}