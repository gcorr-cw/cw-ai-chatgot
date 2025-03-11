import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { getS3PresignedUrl } from '@/lib/s3-service';

const GetAttachmentsSchema = z.object({
  pathnames: z.array(z.string()) // Can contain pathnames or objectNames
});

/**
 * Endpoint to get fresh presigned URLs for multiple attachments at once
 * This is useful when loading a chat with multiple attachments
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

    const { pathnames } = validatedData.data;
    
    try {
      // Generate fresh presigned URLs for all attachments
      const attachmentPromises = pathnames.map(async (pathname) => {
        try {
          // pathname could be an objectName or a pathname
          const url = await getS3PresignedUrl(pathname);
          return { 
            pathname, // Keep the original key used
            url,
            objectName: pathname, // Use the supplied key as objectName for consistency
            success: true 
          };
        } catch (error) {
          console.error(`Failed to get URL for ${pathname}:`, error);
          return { pathname, success: false };
        }
      });
      
      const results = await Promise.all(attachmentPromises);
      
      return NextResponse.json({ 
        attachments: results.filter(result => result.success) 
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
