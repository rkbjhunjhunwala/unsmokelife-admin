import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: Request) {
  try {
    const { amount, userName, userEmail, referenceId } = await request.json();

    const paymentLink = await razorpay.paymentLink.create({
      amount: amount * 100, // Amount in paise
      currency: "INR",
      accept_partial: false,
      description: `Payment for ${userName}`,
      customer: {
        name: userName,
        email: userEmail,
      },
      reference_id: referenceId, // Your internal ID (e.g., Firestore UID)
      callback_url: "https://yourwebsite.com/payment-success",
      callback_method: "get",
    });

    return NextResponse.json({ url: paymentLink.short_url });
  } catch (error) {
    console.error("Razorpay Error:", error);
    return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 });
  }
}