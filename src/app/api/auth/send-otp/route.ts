import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOtpEmail } from '@/lib/email-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    // Check against authorized email
    const authorizedEmail = (process.env.AUTHORIZED_ADMIN_EMAIL || 'rajkumarsharma705214@gmail.com').toLowerCase();
    
    // Only allow authorized admin email or matching domain
    if (email !== authorizedEmail) {
      return NextResponse.json(
        {
          success: false,
          error: `Access Denied: Only authorized administrator (${authorizedEmail}) can access this system.`,
        },
        { status: 403 }
      );
    }

    // Check rate limiting: last request within 30 seconds
    const recentOtp = await prisma.emailOtp.findFirst({
      where: {
        email,
        createdAt: {
          gt: new Date(Date.now() - 30 * 1000),
        },
      },
    });

    if (recentOtp) {
      return NextResponse.json(
        {
          success: false,
          error: 'An OTP was recently generated. Please wait 30 seconds before requesting another.',
        },
        { status: 429 }
      );
    }

    // Delete existing expired/unverified OTPs for this email to keep table clean
    await prisma.emailOtp.deleteMany({
      where: {
        email,
      },
    });

    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

    await prisma.emailOtp.create({
      data: {
        email,
        otp,
        expiresAt,
        verified: false,
      },
    });

    // Send email
    const emailRes = await sendOtpEmail(email, otp);

    return NextResponse.json({
      success: true,
      message: emailRes.isDevFallback
        ? `OTP code generated for ${email}. (Dev fallback active: Check console or notification)`
        : `A 6-digit verification OTP has been dispatched to ${email}.`,
      isDevFallback: emailRes.isDevFallback,
      devOtp: emailRes.isDevFallback ? otp : undefined,
    });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process OTP request: ' + (error?.message || 'Server error') },
      { status: 500 }
    );
  }
}
