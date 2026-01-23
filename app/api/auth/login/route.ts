import { NextRequest, NextResponse } from 'next/server';
import { UserDB } from '@/lib/db/mongodb';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await UserDB.findByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken(
      user._id.toString(),
      user.email,
      user.role,
      user.subscription_status
    );

    // Return user data and token
    return NextResponse.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        status: user.subscription_status,
        full_name: user.full_name,
        profile_photo: user.profile_photo
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
