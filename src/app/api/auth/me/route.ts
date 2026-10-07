import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifyAuthToken } from '@/lib/auth-token';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const payload = await verifyAuthToken(token);
  if (!payload) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    },
  });
}
