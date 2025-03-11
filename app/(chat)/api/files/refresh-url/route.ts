import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { getS3PresignedUrl } from '@/lib/s3-service';

// Update schema to accept objectName or pathname
const RefreshUrlSchema = z.object({
  pathname: z.string(), // Can contain pathname or objectName
  objectName: z.string().optional() // Optional objectName parameter
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

    // Use objectName if provided, otherwise use pathname
    const { pathname, objectName } = validatedData.data;
    const objectKey = objectName || pathname;
    
    try {
      // Generate a new presigned URL for the attachment
      const url = await getS3PresignedUrl(objectKey);
      
      return NextResponse.json({ 
        url, 
        pathname: objectKey, // Return the key used for consistency
        objectName: objectName || pathname // Return the objectName for future use
      });
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
