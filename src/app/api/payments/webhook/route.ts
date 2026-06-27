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
    console.log(`Received Webhook Event: ${event.event}`);

    // 3. Handle the 'payment_link.paid' and 'payment.captured' events
    if (event.event === 'payment_link.paid' || event.event === 'payment.captured') {
      const paymentLinkEntity = event.payload?.payment_link?.entity;
      const paymentEntity = event.payload?.payment?.entity;
      
      // Attempt to find referenceId from either event source
      const referenceId = paymentLinkEntity?.reference_id || paymentEntity?.notes?.reference_id; 
      const paymentId = paymentEntity?.id;

      if (referenceId && paymentId) {
        const paymentRef = adminDb.collection('payments').doc(referenceId);
        
        await paymentRef.set({
          status: event.event === 'payment.captured' ? 'captured' : 'paid',
          paymentId: paymentId,
          updatedAt: new Date().toISOString(),
          lastEvent: event.event
        }, { merge: true });

        console.log(`Successfully processed ${event.event} for reference: ${referenceId}, Payment ID: ${paymentId}`);
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