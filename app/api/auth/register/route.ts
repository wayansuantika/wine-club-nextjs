import { NextRequest, NextResponse } from 'next/server';
import { UserDB, PointsDB } from '@/lib/db/mongodb';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await UserDB.findByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user as GUEST
    const user = await UserDB.create(email, hashedPassword, undefined, 'GUEST');

    // Update full name if provided
    if (full_name) {
      await UserDB.updateProfile(user._id.toString(), { full_name });
    }

    // Initialize points balance
    await PointsDB.create(user._id.toString(), 0);

    // Generate JWT token
    const token = generateToken(
      user._id.toString(),
      user.email,
      user.role,
      'GUEST'
    );

    // Return user data and token
    return NextResponse.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        status: 'GUEST',
        full_name: full_name || null
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
