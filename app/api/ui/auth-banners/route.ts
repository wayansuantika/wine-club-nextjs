import { NextResponse } from 'next/server';
import { getRuntimeAuthBanners } from '@/lib/server/authBannersStore';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const banners = await getRuntimeAuthBanners();
    return NextResponse.json(
      { banners },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      }
    );
  } catch (error) {
    console.error('Auth banners fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
