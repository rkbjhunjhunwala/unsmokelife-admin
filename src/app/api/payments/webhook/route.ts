import { NextResponse } from 'next/server';
import { validateWebhookSignature } from 'razorpay/dist/utils/razorpay-utils';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature') || '';

    // Verify signature
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

    // We only care about events that confirm money movement
    if (event.event === 'payment_link.paid' || event.event === 'payment.captured') {
      const payload = event.payload;
      
      // Multi-layer extraction to ensure we get the referenceId regardless of payload shape
      const referenceId = 
        payload?.payment_link?.entity?.reference_id || 
        payload?.payment?.entity?.notes?.reference_id || 
        payload?.order?.entity?.notes?.reference_id;

      const paymentId = payload?.payment?.entity?.id;

      if (referenceId) {
        // Extract the userIdentifier (e.g., "+917842193587" from "..._1719...")
        const userIdentifier = referenceId.split('_')[0];

        const paymentRef = adminDb.collection('payments').doc(userIdentifier);
        
        await paymentRef.set({
          status: event.event === 'payment.captured' ? 'captured' : 'paid',
          paymentId: paymentId || 'N/A',
          updatedAt: new Date().toISOString(),
          lastEvent: event.event,
          originalReference: referenceId
        }, { merge: true });

        console.log(`[Success] Updated ${userIdentifier} to ${event.event}`);
      } else {
        console.warn(`[Warning] Missing referenceId in payload for ${event.event}`, payload);
      }
    }

    return NextResponse.json({ status: 'ok' });
    
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}