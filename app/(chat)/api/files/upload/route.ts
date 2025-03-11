import { NextResponse } from 'next/server';
import { z } from 'zod';

import { auth } from '@/app/(auth)/auth';
import { uploadToS3 } from '@/lib/s3-service';

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size should be less than 5MB',
    })
    .refine((file) => {
      const fileType = file.type.toLowerCase();
      const fileName = file instanceof File ? file.name.toLowerCase() : '';
      const fileExtension = fileName.split('.').pop() || '';

      const textExtensions = ['txt', 'md', 'markdown', 'csv', 'json', 'html', 'htm', 'rtf', 'log'];
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
      const docExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];

      // Check against allowed MIME types
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'text/markdown',
        'text/x-markdown',
        'text/md',
        'application/markdown',
        'application/x-markdown',
        'text/csv',
        'text/html',
        'text/richtext',
        'application/rtf',
        'application/json',
      ];

      const hasValidExtension =
        textExtensions.includes(fileExtension) ||
        imageExtensions.includes(fileExtension) ||
        docExtensions.includes(fileExtension);

      const hasValidMimeType =
        allowedTypes.includes(fileType) ||
        fileType.includes('markdown') ||
        fileType.includes('/md') ||
        fileType.startsWith('text/');

      return hasValidExtension || hasValidMimeType || fileType === 'application/octet-stream';
    }, {
      message: 'Unsupported file type. Allowed types include images, PDFs, Office documents, and text files.',
    }),
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (request.body === null) {
    return new Response('Request body is empty', { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    console.log('File upload attempt:', {
      type: file?.type,
      size: file?.size,
      fileName: file instanceof File ? file.name : 'Unknown',
    });

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    let fileToValidate = file;
    if (file instanceof File) {
      const fileName = file.name.toLowerCase();
      if (
        (fileName.endsWith('.md') || fileName.endsWith('.markdown')) &&
        (!file.type || file.type === 'application/octet-stream')
      ) {
        // Create a new File with the correct MIME type
        fileToValidate = new File([await file.arrayBuffer()], file.name, {
          type: 'text/markdown',
        });
        console.log('Corrected MIME type for markdown file:', fileToValidate.type);
      }
    }

    if (file instanceof File) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      console.log('File validation details:', {
        fileName: file.name,
        fileType: file.type || 'No MIME type',
        fileExtension,
        size: file.size,
      });
    }

    const validatedData = FileSchema.safeParse({ file: fileToValidate });
    if (!validatedData.success) {
      console.error('File validation failed:', validatedData.error.errors);
      const errorMessage = validatedData.error.errors.map((error) => error.message).join(', ');
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const filename = file.name;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    console.log(
      `Uploading file: ${filename}, size: ${fileBuffer.length} bytes, content-type: ${file.type}`
    );

    let contentType = file.type;
    if (
      file instanceof File &&
      (!contentType || contentType === 'application/octet-stream')
    ) {
      const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
      const mimeTypeMap: Record<string, string> = {
        md: 'text/markdown',
        markdown: 'text/markdown',
        txt: 'text/plain',
        csv: 'text/csv',
        json: 'application/json',
        html: 'text/html',
        htm: 'text/html',
        rtf: 'application/rtf',
        log: 'text/plain',
      };

      if (mimeTypeMap[fileExtension]) {
        contentType = mimeTypeMap[fileExtension];
        console.log(`Corrected content type for ${fileExtension} file: ${contentType}`);
      }
    }

    console.log(`Uploading file: ${file.name}, content-type: ${contentType}`);
    const uploadResult = await uploadToS3(fileBuffer, filename, contentType);

    console.log('S3 upload result:', {
      url: uploadResult.url.substring(0, 50) + '...',
      objectName: uploadResult.objectName,
      name: uploadResult.name,
      contentType: uploadResult.contentType,
    });

    return NextResponse.json({
      url: uploadResult.url,
      objectName: uploadResult.objectName,
      name: uploadResult.name,
      contentType: uploadResult.contentType,
      size: file.size,
    });
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
