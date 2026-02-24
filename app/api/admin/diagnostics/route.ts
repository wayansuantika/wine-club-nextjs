import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import mongoose from 'mongoose';

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

    const MONGODB_URI = process.env.MONGODB_URI!;
    
    if (!mongoose.connection.readyState) {
      await mongoose.connect(MONGODB_URI, { dbName: 'club_wine' });
    }

    const db = mongoose.connection.db;
    
    // List all collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Count documents in each collection
    const collectionStats: any = {};
    for (const name of collectionNames) {
      try {
        const count = await db.collection(name).countDocuments();
        collectionStats[name] = count;
      } catch (error) {
        collectionStats[name] = 'Error counting';
      }
    }

    // Check for Events (capital E) vs events (lowercase)
    let eventsData: any = null;
    if (collectionNames.includes('Events')) {
      const count = await db.collection('Events').countDocuments();
      const samples = await db.collection('Events').find().limit(3).toArray();
      eventsData = { collection: 'Events', count, samples };
    } else if (collectionNames.includes('events')) {
      const count = await db.collection('events').countDocuments();
      const samples = await db.collection('events').find().limit(3).toArray();
      eventsData = { collection: 'events', count, samples };
    }

    // Check EventRegistrations
    let registrationsData: any = null;
    const registrationCollections = collectionNames.filter(n => 
      n.toLowerCase().includes('registration')
    );
    
    if (registrationCollections.length > 0) {
      const collName = registrationCollections[0];
      const count = await db.collection(collName).countDocuments();
      const samples = await db.collection(collName).find().limit(3).toArray();
      registrationsData = { collection: collName, count, samples };
    }

    return NextResponse.json({
      success: true,
      database: 'club_wine',
      collections: collectionNames,
      collection_counts: collectionStats,
      events_analysis: eventsData,
      registrations_analysis: registrationsData,
      note: 'Mongoose converts model names to lowercase plural. Event -> events, EventRegistration -> eventregistrations'
    });
  } catch (error: any) {
    console.error('[Diagnostics] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
