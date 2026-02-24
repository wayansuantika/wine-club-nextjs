import { NextRequest, NextResponse } from 'next/server';
import { UserDB } from '@/lib/db/mongodb';
import { verifyPassword, generateToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    console.log('[Login] Request received');
    const { email, password } = await request.json();
    console.log('[Login] Email:', email);

    // Validate input
    if (!email || !password) {
      console.log('[Login] Validation failed: missing email or password');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user by email
    console.log('[Login] Looking up user in database...');
    const user = await UserDB.findByEmail(email);
    if (!user) {
      console.log('[Login] User not found:', email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    console.log('[Login] User found:', user.email, 'Role:', user.role);

    // Verify password
    console.log('[Login] Verifying password...');
    const isPasswordValid = await verifyPassword(password, user.password);
    if (!isPasswordValid) {
      console.log('[Login] Password verification failed');
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    console.log('[Login] Password verified successfully');

    // Generate JWT token
    console.log('[Login] Generating JWT token...');
    const token = generateToken(
      user._id.toString(),
      user.email,
      user.role,
      user.subscription_status
    );
    console.log('[Login] Token generated successfully');

    // Return user data and token
    console.log('[Login] Login successful for:', user.email);
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
  } catch (error: any) {
    console.error('[Login] Error occurred:', error);
    console.error('[Login] Error stack:', error.stack);
    console.error('[Login] Error name:', error.name);
    console.error('[Login] Error message:', error.message);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
        name: error.name
      },
      { status: 500 }
    );
  }
}
