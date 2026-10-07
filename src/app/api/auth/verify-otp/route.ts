import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  signAuthToken,
  SESSION_COOKIE_NAME,
  verifyPendingOtp,
  PENDING_OTP_COOKIE_NAME,
} from '@/lib/auth-token';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const otp = (body.otp || '').trim();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: 'Both email and verification code are required.' },
        { status: 400 }
      );
    }

    let isOtpValid = false;

    // 1. Verify via cryptographic pending OTP cookie (serverless resilient)
    const pendingToken = req.cookies.get(PENDING_OTP_COOKIE_NAME)?.value;
    if (pendingToken) {
      isOtpValid = await verifyPendingOtp(pendingToken, email, otp);
    }

    // 2. If cookie verification didn't match or cookie was missing, check database
    if (!isOtpValid) {
      try {
        const otpRecord = await prisma.emailOtp.findFirst({
          where: {
            email,
            otp,
            verified: false,
            expiresAt: {
              gt: new Date(),
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (otpRecord) {
          isOtpValid = true;
          await prisma.emailOtp
            .update({
              where: { id: otpRecord.id },
              data: { verified: true },
            })
            .catch(() => {});
        }
      } catch (dbErr: any) {
        console.warn('[AUTH] Prisma OTP query check skipped (fallback mode):', dbErr?.message);
      }
    }

    if (!isOtpValid) {
      return NextResponse.json(
        { success: false, error: 'Incorrect or expired OTP code. Please check your Gmail and try again.' },
        { status: 400 }
      );
    }

    // 3. Resolve user identity (attempt DB upsert with graceful fallback)
    let user = {
      id: 'admin-' + email.split('@')[0],
      email,
      name: email.includes('rajkumar') ? 'Rajkumar Sharma' : email.split('@')[0],
      role: 'ADMIN',
    };

    try {
      const dbUser = await prisma.user.upsert({
        where: { email },
        update: {
          updatedAt: new Date(),
        },
        create: {
          email,
          name: email.includes('rajkumar') ? 'Rajkumar Sharma' : email.split('@')[0],
          role: 'ADMIN',
        },
      });
      user = {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
      };
    } catch (dbErr: any) {
      console.warn('[AUTH] Prisma user upsert skipped, using admin profile:', dbErr?.message);
    }

    // 4. Create signed 7-day JWT session token
    const token = await signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Email successfully verified. Welcome back!',
      user,
    });

    // Set secure HTTP-only session cookie
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Clear pending OTP cookie
    response.cookies.set(PENDING_OTP_COOKIE_NAME, '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed: ' + (error?.message || 'Server error') },
      { status: 500 }
    );
  }
}

