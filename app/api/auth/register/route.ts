import { NextRequest, NextResponse } from 'next/server';
import { UserDB, PointsDB } from '@/lib/db/mongodb';
import { hashPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    console.log('[Register] Request received');
    const { email, password, full_name } = await request.json();
    console.log('[Register] Email:', email, 'Full name:', full_name);

    // Validate input
    if (!email || !password) {
      console.log('[Register] Validation failed: missing email or password');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    console.log('[Register] Checking if user exists...');
    const existingUser = await UserDB.findByEmail(email);
    if (existingUser) {
      console.log('[Register] User already exists:', email);
      return NextResponse.json(
        { error: 'This email is already registered. Please login or use a different email.' },
        { status: 409 }
      );
    }
    console.log('[Register] User does not exist, proceeding with registration');

    // Hash password
    console.log('[Register] Hashing password...');
    const hashedPassword = await hashPassword(password);
    console.log('[Register] Password hashed successfully');

    // Create user as GUEST
    console.log('[Register] Creating user in database...');
    const user = await UserDB.create(email, hashedPassword, undefined, 'GUEST');
    console.log('[Register] User created with ID:', user._id.toString());

    // Update full name if provided
    if (full_name) {
      console.log('[Register] Updating full name...');
      await UserDB.updateProfile(user._id.toString(), { full_name });
    }

    // Initialize points balance
    console.log('[Register] Initializing points balance...');
    await PointsDB.create(user._id.toString(), 0);
    console.log('[Register] Points initialized');

    // Generate JWT token
    console.log('[Register] Generating JWT token...');
    const token = generateToken(
      user._id.toString(),
      user.email,
      user.role,
      'GUEST'
    );
    console.log('[Register] Token generated successfully');

    // Return user data and token
    console.log('[Register] Registration successful for:', user.email);
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
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[Register] Error occurred:', error);
    console.error('[Register] Error stack:', errorStack);
    console.error('[Register] Error name:', errorName);
    console.error('[Register] Error message:', errorMessage);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: errorMessage,
        name: errorName
      },
      { status: 500 }
    );
  }
}
