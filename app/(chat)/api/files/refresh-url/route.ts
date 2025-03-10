import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { getS3PresignedUrl } from '@/lib/s3-service';

const RefreshUrlSchema = z.object({
  pathname: z.string()
});

/**
 * Endpoint to refresh presigned URLs for S3 attachments
 * This is necessary because S3 presigned URLs expire after a set time
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = RefreshUrlSchema.safeParse(body);

    if (!validatedData.success) {
      const errorMessage = validatedData.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { pathname } = validatedData.data;
    
    try {
      // Generate a new presigned URL for the attachment
      const url = await getS3PresignedUrl(pathname);
      
      return NextResponse.json({ url, pathname });
    } catch (error) {
      console.error('Failed to refresh URL:', error);
      return NextResponse.json({ error: 'Failed to refresh URL' }, { status: 500 });
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
