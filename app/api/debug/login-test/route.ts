import { NextRequest, NextResponse } from 'next/server';
import { UserDB } from '@/lib/db/mongodb';
import { verifyPassword } from '@/lib/auth';
import mongoose from 'mongoose';

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    steps: []
  };

  try {
    // Step 1: Check environment variables
    diagnostics.steps.push({
      step: 1,
      name: 'Environment Check',
      mongodb_uri_exists: !!process.env.MONGODB_URI,
      mongodb_uri_preview: process.env.MONGODB_URI?.substring(0, 30) + '...',
      jwt_secret_exists: !!process.env.JWT_SECRET,
      node_env: process.env.NODE_ENV
    });

    // Step 2: Test MongoDB connection
    try {
      const user = await UserDB.findByEmail('admin@clubwine.com');
      
      diagnostics.steps.push({
        step: 2,
        name: 'MongoDB Connection',
        status: 'success',
        connection_state: mongoose.connection.readyState,
        database_name: mongoose.connection.db?.databaseName
      });

      // Step 3: Check if admin user exists
      if (!user) {
        diagnostics.steps.push({
          step: 3,
          name: 'Admin User Check',
          status: 'not_found',
          message: 'Admin user not found in database'
        });
        
        return NextResponse.json({
          success: false,
          issue: 'Admin user does not exist',
          diagnostics
        });
      }

      diagnostics.steps.push({
        step: 3,
        name: 'Admin User Check',
        status: 'found',
        user_id: user._id.toString(),
        email: user.email,
        role: user.role,
        subscription_status: user.subscription_status,
        has_password: !!user.password,
        password_length: user.password?.length || 0,
        password_starts_with_bcrypt: user.password?.startsWith('$2a$') || user.password?.startsWith('$2b$')
      });

      // Step 4: Test password verification
      try {
        const isValid = await verifyPassword('Admin@2026', user.password);
        
        diagnostics.steps.push({
          step: 4,
          name: 'Password Verification',
          status: isValid ? 'success' : 'failed',
          password_match: isValid
        });

        if (!isValid) {
          return NextResponse.json({
            success: false,
            issue: 'Password hash does not match',
            hint: 'The password hash in DB may be incorrect. Try re-seeding accounts.',
            diagnostics
          });
        }

      } catch (pwError: any) {
        diagnostics.steps.push({
          step: 4,
          name: 'Password Verification',
          status: 'error',
          error: pwError.message
        });

        return NextResponse.json({
          success: false,
          issue: 'Password verification failed',
          diagnostics
        });
      }

      // Step 5: All checks passed
      diagnostics.steps.push({
        step: 5,
        name: 'Final Status',
        status: 'all_checks_passed',
        message: 'Login should work with admin@clubwine.com / Admin@2026'
      });

      return NextResponse.json({
        success: true,
        message: 'All login checks passed successfully!',
        diagnostics
      });

    } catch (dbError: any) {
      diagnostics.steps.push({
        step: 2,
        name: 'MongoDB Connection',
        status: 'error',
        error: dbError.message,
        error_code: dbError.code,
        error_name: dbError.name
      });

      return NextResponse.json({
        success: false,
        issue: 'MongoDB connection failed',
        hint: 'Check MONGODB_URI in .env and MongoDB Atlas IP whitelist',
        diagnostics
      }, { status: 500 });
    }

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      issue: 'Unexpected error',
      error: error.message,
      diagnostics
    }, { status: 500 });
  }
}
