import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOtpEmail } from '@/lib/email-service';
import { signPendingOtp, PENDING_OTP_COOKIE_NAME } from '@/lib/auth-token';

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

    // Rate limiting check (safe with DB or fallback)
    try {
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
    } catch (dbErr: any) {
      console.warn('[AUTH] Prisma rate limit check skipped (fallback mode):', dbErr?.message);
    }

    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

    // Attempt to persist OTP to database (non-blocking if DB is cold/read-only on serverless)
    try {
      await prisma.emailOtp.deleteMany({
        where: {
          email,
        },
      });

      await prisma.emailOtp.create({
        data: {
          email,
          otp,
          expiresAt,
          verified: false,
        },
      });
    } catch (dbErr: any) {
      console.warn('[AUTH] Prisma OTP record skipped (cryptographic session will be used):', dbErr?.message);
    }

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

    // Sign cryptographic pending OTP token
    const pendingToken = await signPendingOtp(email, otp, 600);

    const response = NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${email}. Please check your Gmail inbox.`,
    });

    // Set secure HTTP-only cookie with the signed pending OTP
    response.cookies.set(PENDING_OTP_COOKIE_NAME, pendingToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error: any) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process OTP request: ' + (error?.message || 'Server error') },
      { status: 500 }
    );
  }
}

