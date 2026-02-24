/**
 * Test script to check MongoDB connection and registrations
 * Run with: node --loader ts-node/esm scripts/test-mongodb.mjs
 * Or in Next.js: Create an API route and call it
 */

import { connectDB } from '../lib/db/mongodb.js';
import * as models from '../lib/db/models.js';

async function testMongoDB() {
  console.log('=== MongoDB Connection Test ===\n');

  try {
    // Test connection
    console.log('1. Testing MongoDB connection...');
    await connectDB();
    console.log('✓ Connected to MongoDB successfully\n');

    // Count total registrations
    console.log('2. Checking EventRegistration collection...');
    const totalRegistrations = await models.EventRegistration.countDocuments();
    console.log(`   Total registrations: ${totalRegistrations}\n`);

    // Count registrations without codes
    console.log('3. Checking registrations WITHOUT reservation codes...');
    const withoutCode = await models.EventRegistration.countDocuments({
      $or: [
        { reservation_code: { $exists: false } },
        { reservation_code: null },
        { reservation_code: '' }
      ]
    });
    console.log(`   Registrations without codes: ${withoutCode}\n`);

    // Count registrations WITH codes
    console.log('4. Checking registrations WITH reservation codes...');
    const withCode = await models.EventRegistration.countDocuments({
      reservation_code: { $exists: true, $ne: null, $ne: '' }
    });
    console.log(`   Registrations with codes: ${withCode}\n`);

    // Show sample registrations
    console.log('5. Sample registrations (first 5)...');
    const samples = await models.EventRegistration.find()
      .limit(5)
      .populate('user_id', 'email')
      .populate('event_id', 'title');
    
    samples.forEach((reg, index) => {
      console.log(`   ${index + 1}. User: ${reg.user_id?.email || 'Unknown'}`);
      console.log(`      Event: ${reg.event_id?.title || 'Unknown'}`);
      console.log(`      Code: ${reg.reservation_code || 'NOT SET'}`);
      console.log(`      Status: ${reg.status}`);
      console.log('');
    });

    console.log('=== Test Complete ===');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testMongoDB();
