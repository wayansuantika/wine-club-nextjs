import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { verifyAuth, verifyAdmin } from '@/lib/auth';
import { AdminDB } from '@/lib/db/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_FIELDS = new Set([
  'loginMobile',
  'loginDesktop',
  'loginFallback',
  'registerMobile',
  'registerDesktop',
  'registerFallback'
]);

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
    const field = String(formData.get('field') || '');
    const file = formData.get('file');

    if (!ALLOWED_FIELDS.has(field)) {
      return NextResponse.json({ error: 'Invalid banner field' }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image must be 5MB or smaller' }, { status: 400 });
    }

    const ext = sanitizeExt(file.name, file.type);
    const fileName = `${field}-${Date.now()}${ext}`;
    const relativeDir = path.join('images', 'auth-banners');
    const absoluteDir = path.join(process.cwd(), 'public', relativeDir);
    const absolutePath = path.join(absoluteDir, fileName);

    await mkdir(absoluteDir, { recursive: true });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(absolutePath, buffer);

    const publicUrl = `/images/auth-banners/${fileName}`;

    await AdminDB.logAction(
      authResult.user.id,
      'UPLOAD_AUTH_BANNER_IMAGE',
      'AppConfig',
      field,
      {
        field,
        file_name: fileName,
        file_size: file.size,
        content_type: file.type,
        url: publicUrl
      }
    );

    return NextResponse.json({
      message: 'Banner image uploaded successfully',
      field,
      url: publicUrl
    });
  } catch (error: unknown) {
    console.error('Auth banner upload error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
