import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { AdminDB } from '@/lib/db/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

function sanitizeExt(fileName: string, mimeType: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const allowedExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

  if (allowedExt.includes(ext)) {
    return ext;
  }

  if (mimeType === 'image/jpeg') return '.jpg';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  if (mimeType === 'image/gif') return '.gif';

  return '.jpg';
}

async function deleteOldEventImage(oldUrl: string | undefined): Promise<void> {
  if (!oldUrl || !oldUrl.includes('/images/events/')) {
    return;
  }

  try {
    const fileName = oldUrl.split('/').pop();
    if (!fileName) return;

    const relativeDir = path.join('images', 'events');
    const absoluteDir = path.join(process.cwd(), 'public', relativeDir);
    const filePath = path.join(absoluteDir, fileName);

    await rm(filePath, { force: true });
    console.log(`Cleaned up old event image: ${fileName}`);
  } catch (error) {
    console.error('Failed to clean up old event image:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = verifyAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const adminCheck = verifyAdmin(authResult.user);
    if (adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const oldUrl = formData.get('oldUrl');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image must be 10MB or smaller' }, { status: 400 });
    }

    const ext = sanitizeExt(file.name, file.type);
    const fileName = `event-${Date.now()}${ext}`;
    const relativeDir = path.join('images', 'events');
    const absoluteDir = path.join(process.cwd(), 'public', relativeDir);
    const absolutePath = path.join(absoluteDir, fileName);

    await mkdir(absoluteDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(absolutePath, buffer);

    const publicUrl = `/images/events/${fileName}`;

    if (oldUrl) {
      await deleteOldEventImage(String(oldUrl));
    }

    await AdminDB.logAction(
      authResult.user.id,
      'UPLOAD_EVENT_IMAGE',
      'Event',
      'image',
      {
        file_name: fileName,
        file_size: file.size,
        content_type: file.type,
        url: publicUrl,
        old_url: oldUrl || null
      }
    );

    return NextResponse.json({
      message: 'Event image uploaded successfully',
      url: publicUrl
    });
  } catch (error: unknown) {
    console.error('Event image upload error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
