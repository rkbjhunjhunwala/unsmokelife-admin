import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: Request) {
  try {
    const { amount, userName, userEmail, userPhone, referenceId } = await request.json();

    // 1. Prepare customer object safely
    const customer: any = {
      name: userName || "Valued Customer",
    };

    // Only add email if it's in a valid format (contains @ and .)
    if (userEmail && userEmail.includes('@') && userEmail.includes('.')) {
      customer.email = userEmail;
    }

    // Add phone if provided (Ensure it is a string and potentially E.164 format)
    if (userPhone) {
      customer.contact = userPhone;
    }

    // 2. Create the Payment Link
    const paymentLink = await razorpay.paymentLink.create({
      amount: amount * 100,
      currency: "INR",
      accept_partial: false,
      description: `Payment for ${userName || "Service"}`,
      customer: customer, // Uses the conditionally built object
      reference_id: referenceId,
      callback_url: "https://unsmokelife-admin.tomtechie.com/payment-success",
      callback_method: "get",
    });

    return NextResponse.json({ url: paymentLink.short_url });
  } catch (error: any) {
    console.error("Razorpay Error:", error.error || error);
    return NextResponse.json({ 
      error: error.error?.description || 'Failed to create payment link' 
    }, { status: 500 });
  }
}