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
      console.error('Webhook signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    console.log(`[Webhook] Processing event: ${event.event}`);

    // 2. Handle events that confirm money movement
    if (event.event === 'payment_link.paid' || event.event === 'payment.captured') {
      const payload = event.payload;
      const paymentEntity = payload?.payment?.entity;
      
      // 3. Multi-layer extraction
      const rawReference = 
        payload?.payment_link?.entity?.reference_id || 
        paymentEntity?.notes?.reference_id || 
        payload?.order?.entity?.notes?.reference_id;

      // Extract identifier
      const userIdentifier = rawReference 
        ? rawReference.split('_')[0] 
        : paymentEntity?.contact;

      const paymentId = paymentEntity?.id;
      
      // Extract and convert amount (paise to INR)
      const amount = paymentEntity?.amount ? paymentEntity.amount / 100 : 0;

      if (userIdentifier) {
        // Update Firestore
        const paymentRef = adminDb.collection('payments').doc(userIdentifier);
        
        await paymentRef.set({
          status: event.event === 'payment.captured' ? 'captured' : 'paid',
          paymentId: paymentId || 'N/A',
          amount: amount, 
          updatedAt: new Date().toISOString(),
          lastEvent: event.event,
          originalReference: rawReference || 'N/A'
        }, { merge: true });

        console.log(`[Success] Updated ${userIdentifier} to ${event.event} with amount: ${amount}`);
      } else {
        console.warn(`[Warning] Could not identify user for ${event.event}`, payload);
      }
    }

    return NextResponse.json({ status: 'ok' });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}