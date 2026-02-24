import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { connectDB } from '@/lib/db/mongodb';
import * as models from '@/lib/db/models';

export async function POST(request: NextRequest) {
  try {
    console.log('[Migration] Starting reservation code migration...');
    
    const authResult = verifyAuth(request);
    if ('error' in authResult) {
      console.log('[Migration] Auth failed:', authResult.error);
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const adminCheck = verifyAdmin(authResult.user);
    if (adminCheck) {
      console.log('[Migration] Admin check failed:', adminCheck.error);
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    console.log('[Migration] Connecting to database...');
    await connectDB();

    // Find all registrations without reservation codes
    console.log('[Migration] Searching for registrations without codes...');
    const registrationsWithoutCode = await models.EventRegistration.find({
      $or: [
        { reservation_code: { $exists: false } },
        { reservation_code: null },
        { reservation_code: '' }
      ]
    });

    console.log(`[Migration] Found ${registrationsWithoutCode.length} registrations without codes`);

    if (registrationsWithoutCode.length === 0) {
      return NextResponse.json({ 
        message: 'No registrations need migration',
        updated: 0 
      });
    }

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let updated = 0;

    // Generate unique codes for each registration
    console.log('[Migration] Starting code generation...');
    for (const registration of registrationsWithoutCode) {
      let reservationCode = '';
      let isUnique = false;

      while (!isUnique) {
        reservationCode = 'RES-';
        for (let i = 0; i < 8; i++) {
          reservationCode += chars[Math.floor(Math.random() * chars.length)];
        }

        // Check if code already exists
        const existingCode = await models.EventRegistration.findOne({ reservation_code: reservationCode });
        if (!existingCode) {
          isUnique = true;
        }
      }

      // Update the registration
      registration.reservation_code = reservationCode;
      await registration.save();
      updated++;
      
      if (updated % 10 === 0) {
        console.log(`[Migration] Updated ${updated} registrations...`);
      }
    }

    console.log(`[Migration] Complete! Updated ${updated} registrations`);
    return NextResponse.json({ 
      message: 'Successfully migrated registrations',
      updated 
    });
  } catch (error) {
    console.error('[Migration] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
