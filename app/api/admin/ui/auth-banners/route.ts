import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { AdminDB } from '@/lib/db/mongodb';
import { getRuntimeAuthBanners, updateRuntimeAuthBanners } from '@/lib/server/authBannersStore';

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

    const banners = await getRuntimeAuthBanners();
    return NextResponse.json({ banners });
  } catch (error) {
    console.error('Admin auth banners fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const adminCheck = verifyAdmin(authResult.user);
    if (adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const body = await request.json();
    const banners = await updateRuntimeAuthBanners(body, authResult.user.id);

    await AdminDB.logAction(
      authResult.user.id,
      'UPDATE_AUTH_BANNERS',
      'AppConfig',
      'auth_banners',
      body
    );

    return NextResponse.json({
      message: 'Auth banners updated successfully',
      banners
    });
  } catch (error: any) {
    console.error('Admin auth banners update error:', error);

    if (error?.message) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
