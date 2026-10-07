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
    
    // Only allow authorized admin email
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
          error: 'An OTP was recently sent. Please check your inbox or wait 30 seconds before requesting another.',
        },
        { status: 429 }
      );
    }

    // Delete existing unverified OTPs for this email
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

    // Send real email via SMTP
    const emailRes = await sendOtpEmail(email, otp);

    if (!emailRes.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to deliver OTP to your email: ' + (emailRes.error || 'SMTP delivery failed'),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${email}. Please check your Gmail inbox.`,
    });
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process OTP request: ' + (error?.message || 'Server error') },
      { status: 500 }
    );
  }
}
