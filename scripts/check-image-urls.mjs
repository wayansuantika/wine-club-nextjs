/**
 * Check image URLs in the database
 * Run with: node scripts/check-image-urls.mjs
 */

import { connectDB } from '../lib/db/mongodb.js';
import * as models from '../lib/db/models.js';

async function checkImageURLs() {
  console.log('=== Checking Image URLs in Database ===\n');

  try {
    await connectDB();
    console.log('✓ Connected to MongoDB\n');

    // Check Events with images
    console.log('📸 Event Images:');
    const events = await models.Event.find({ image_url: { $exists: true, $ne: null, $ne: '' } })
      .select('title image_url status')
      .limit(10);
    
    if (events.length === 0) {
      console.log('   No events with image_url found');
    } else {
      events.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.title}`);
        console.log(`      URL: ${event.image_url}`);
        console.log(`      Status: ${event.status}\n`);
      });
    }

    // Check AppConfig for auth banners
    console.log('🎨 Auth Banner Config:');
    const bannerConfig = await models.AppConfig.findOne({ key: 'auth_banners' });
    if (bannerConfig) {
      console.log('   Found banner configuration:');
      console.log(JSON.stringify(bannerConfig.value, null, 2));
    } else {
      console.log('   No auth banner configuration found (using defaults)');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkImageURLs();
