import { NextResponse } from 'next/server';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    // 1. Get body and signature
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    // 2. Verify signature to ensure it's from Razorpay
    const isValid = validateWebhookSignature(
      body,
      signature,
      process.env.RAZORPAY_WEBHOOK_SECRET!
    );

    if (!isValid) {
      console.error('Webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);

    // 3. Handle the 'payment_link.paid' event
    if (event.event === 'payment_link.paid') {
      const paymentLinkEntity = event.payload?.payment_link?.entity;
      const paymentEntity = event.payload?.payment?.entity;
      
      const referenceId = paymentLinkEntity?.reference_id; 
      const paymentId = paymentEntity?.id;

      if (referenceId && paymentId) {
        // Update Firestore with existence check
        const paymentRef = adminDb.collection('payments').doc(referenceId);
        
        await paymentRef.set({
          status: 'paid',
          paymentId: paymentId,
          updatedAt: new Date().toISOString(),
        }, { merge: true }); // Merge prevents overwriting existing metadata

        console.log(`Payment successful for reference: ${referenceId}, Payment ID: ${paymentId}`);
      } else {
        console.warn('Webhook received but missing referenceId or paymentId', { referenceId, paymentId });
      }
    }

    // 4. Return 200 to acknowledge receipt
    return NextResponse.json({ status: 'ok' });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}