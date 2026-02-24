import { NextResponse } from 'next/server';
import { EventDB } from '@/lib/db/mongodb';
import { getRuntimeAuthBanners } from '@/lib/server/authBannersStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get events with images
    const events = await EventDB.getAll(false);
    const eventsWithImages = events
      .filter(e => e.image_url)
      .map(e => ({
        id: e._id.toString(),
        title: e.title,
        image_url: e.image_url,
        status: e.status,
        urlType: e.image_url?.startsWith('http') ? 'external' : 'local relative'
      }));

    // Get auth banner config
    const banners = await getRuntimeAuthBanners();
    const bannerUrls = Object.entries(banners).map(([key, url]) => ({
      key,
      url,
      urlType: url.startsWith('http') ? 'external' : 'local relative'
    }));

    return NextResponse.json({
      success: true,
      events: {
        total: events.length,
        withImages: eventsWithImages.length,
        samples: eventsWithImages.slice(0, 5)
      },
      authBanners: bannerUrls,
      note: 'Local relative URLs (starting with /) should work if files exist in public/ folder and are committed to git. External URLs (http/https) should be publicly accessible.',
      recommendations: {
        forLocalImages: 'Ensure files in public/images/ are committed to git: git add public/images/ && git commit -m "Add images" && git push',
        forExternalImages: 'Use services like Cloudinary, Imgur, or Vercel Blob. Update image_url in database to use full https:// URLs'
      }
    });
  } catch (error) {
    console.error('Image URL debug error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: message
    }, { status: 500 });
  }
}
