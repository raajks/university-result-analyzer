import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signAuthToken, SESSION_COOKIE_NAME } from '@/lib/auth-token';

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

    // Verify OTP from database
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

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, error: 'Incorrect or expired OTP code. Please check and try again.' },
        { status: 400 }
      );
    }

    // Mark OTP as used
    await prisma.emailOtp.update({
      where: { id: otpRecord.id },
      data: { verified: true },
    });

    // Ensure User record exists
    const user = await prisma.user.upsert({
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

    // Create signed JWT session token
    const token = await signAuthToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Email successfully verified. Welcome back!',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
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
