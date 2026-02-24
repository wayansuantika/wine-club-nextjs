import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { EventDB } from '@/lib/db/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const adminCheck = verifyAdmin(authResult.user);
    if (adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { id } = await params;
    const registrations = await EventDB.getEventRegistrations(id);

    return NextResponse.json({ registrations });
  } catch (error) {
    console.error('Admin event registrations fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
