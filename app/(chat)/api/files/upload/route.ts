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
    // Support common file types supported by the Vercel AI SDK and OpenAI API
    .refine((file) => {
      // Get the file type
      const fileType = file.type.toLowerCase();
      
      // For File objects, we can check the extension
      const fileName = file instanceof File ? file.name.toLowerCase() : '';
      const fileExtension = fileName.split('.').pop() || '';
      
      // Known text file extensions
      const textExtensions = ['txt', 'md', 'markdown', 'csv', 'json', 'html', 'htm', 'rtf', 'log'];
      // Known image file extensions
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
      // Known document file extensions
      const docExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'];
      
      // Check against allowed MIME types
      const allowedTypes = [
        // Images
        'image/jpeg', 
        'image/png', 
        'image/gif', 
        'image/webp',
        // Documents
        'application/pdf',
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
        // Text formats
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
        'application/json'
      ];
      
      // Check for file extension match
      const hasValidExtension = 
        textExtensions.includes(fileExtension) || 
        imageExtensions.includes(fileExtension) || 
        docExtensions.includes(fileExtension);
        
      // Check for MIME type match
      const hasValidMimeType = allowedTypes.includes(fileType) ||
        fileType.includes('markdown') || 
        fileType.includes('/md') ||
        fileType.startsWith('text/');
      
      // Accept if either extension or MIME type is valid
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
    
    // Log file details for debugging - File extends Blob and has name property
    console.log('File upload attempt:', {
      type: file?.type,
      size: file?.size,
      fileName: file instanceof File ? file.name : 'Unknown'
    });

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Modify the file MIME type if it's a markdown file with empty or incorrect MIME type
    let fileToValidate = file;
    if (file instanceof File) {
      const fileName = file.name.toLowerCase();
      if ((fileName.endsWith('.md') || fileName.endsWith('.markdown')) && 
          (!file.type || file.type === 'application/octet-stream')) {
        // Create a new File with the correct MIME type
        fileToValidate = new File([await file.arrayBuffer()], file.name, { 
          type: 'text/markdown' 
        });
        console.log('Corrected MIME type for markdown file:', fileToValidate.type);
      }
    }

    // Log detailed validation info for debugging
    if (file instanceof File) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      console.log('File validation details:', {
        fileName: file.name,
        fileType: file.type || 'No MIME type',
        fileExtension,
        size: file.size
      });
    }

    const validatedData = FileSchema.safeParse({ file: fileToValidate });

    if (!validatedData.success) {
      // Log validation error details
      console.error('File validation failed:', validatedData.error.errors);
      const errorMessage = validatedData.error.errors
        .map((error) => error.message)
        .join(', ');

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get filename from formData since Blob doesn't have name property
    const filename = file.name;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    console.log(`Uploading file: ${filename}, size: ${fileBuffer.length} bytes, content-type: ${file.type}`);
    
    // Determine if we need to use a corrected content type
    let contentType = file.type;
    
    // For files with application/octet-stream MIME type, determine the proper type from extension
    if (file instanceof File && (!contentType || contentType === 'application/octet-stream')) {
      const fileExtension = filename.split('.').pop()?.toLowerCase() || '';
      
      // Map common extensions to MIME types
      const mimeTypeMap: Record<string, string> = {
        'md': 'text/markdown',
        'markdown': 'text/markdown',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'json': 'application/json',
        'html': 'text/html',
        'htm': 'text/html',
        'rtf': 'application/rtf',
        'log': 'text/plain'
      };
      
      if (mimeTypeMap[fileExtension]) {
        contentType = mimeTypeMap[fileExtension];
        console.log(`Corrected content type for ${fileExtension} file: ${contentType}`);
      }
    }
    
    // Upload to S3 with potentially corrected content type
    console.log(`Uploading file: ${file.name}, content-type: ${contentType}`);
    const uploadResult = await uploadToS3(
      fileBuffer,
      filename,
      contentType
    );
    
    console.log('S3 upload result:', {
      url: uploadResult.url.substring(0, 50) + '...',
      pathname: uploadResult.pathname,
      objectName: uploadResult.objectName,
      name: uploadResult.name,
      contentType: uploadResult.contentType
    });

    // Format response with explicit properties to match the expected structure
    // Note: The AI SDK expects specific fields for attachments
    return NextResponse.json({
      url: uploadResult.url,
      pathname: uploadResult.pathname,
      objectName: uploadResult.objectName, // Make sure this is explicitly included
      name: uploadResult.name, // Include original filename
      contentType: uploadResult.contentType,
      // Add any missing properties that AI SDK attachment type might expect
      size: file.size,
    });
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
