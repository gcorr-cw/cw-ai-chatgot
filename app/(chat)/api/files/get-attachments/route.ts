import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { getS3PresignedUrl } from '@/lib/s3-service';

const GetAttachmentsSchema = z.object({
  // We rename the array from "pathnames" to "objectNames"
  objectNames: z.array(z.string()),
});

/**
 * Endpoint to get fresh presigned URLs for multiple attachments at once.
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validatedData = GetAttachmentsSchema.safeParse(body);

    if (!validatedData.success) {
      const errorMessage = validatedData.error.errors
        .map((error) => error.message)
        .join(', ');
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { objectNames } = validatedData.data;

    try {
      // Generate fresh presigned URLs for all attachments
      const attachmentPromises = objectNames.map(async (objectName) => {
        try {
          const url = await getS3PresignedUrl(objectName);
          return {
            objectName,
            url,
            success: true,
          };
        } catch (error) {
          console.error(`Failed to get URL for ${objectName}:`, error);
          return { objectName, success: false };
        }
      });

      const results = await Promise.all(attachmentPromises);

      return NextResponse.json({
        attachments: results.filter((result) => result.success),
      });
    } catch (error) {
      console.error('Failed to get attachment URLs:', error);
      return NextResponse.json({ error: 'Failed to get attachment URLs' }, { status: 500 });
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
