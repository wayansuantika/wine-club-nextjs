import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongodb';
import * as models from '@/lib/db/models';

export async function GET(request: NextRequest) {
  try {
    const authResult = verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const adminCheck = verifyAdmin(authResult.user);
    if (adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    console.log('[Test] Connecting to database...');
    await connectDB();
    console.log('[Test] Connected successfully');

    // Count total registrations
    const totalRegistrations = await models.EventRegistration.countDocuments();
    console.log('[Test] Total registrations:', totalRegistrations);

    // Count registrations without codes
    const withoutCode = await models.EventRegistration.countDocuments({
      $or: [
        { reservation_code: { $exists: false } },
        { reservation_code: null },
        { reservation_code: '' }
      ]
    });
    console.log('[Test] Without codes:', withoutCode);

    // Count registrations WITH codes
    const withCode = await models.EventRegistration.countDocuments({
      reservation_code: { $exists: true, $nin: [null, ''] }
    });
    console.log('[Test] With codes:', withCode);

    // Get sample registrations
    const samples = await models.EventRegistration.find()
      .limit(5)
      .populate('user_id', 'email')
      .populate('event_id', 'title');

    const sampleData = samples.map(reg => ({
      id: reg._id,
      user_email: reg.user_id?.email || 'Unknown',
      event_title: reg.event_id?.title || 'Unknown',
      reservation_code: reg.reservation_code || 'NOT SET',
      status: reg.status,
      registered_at: reg.registered_at
    }));

    return NextResponse.json({
      success: true,
      database_connected: true,
      stats: {
        total_registrations: totalRegistrations,
        registrations_without_codes: withoutCode,
        registrations_with_codes: withCode
      },
      samples: sampleData
    });
  } catch (error: any) {
    console.error('[Test] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
