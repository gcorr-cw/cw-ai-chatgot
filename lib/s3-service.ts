import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

// Create S3 client using the default credential provider chain
const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? 'us-west-2',
});

// Log configuration
console.log('S3 client configured:', {
  region: process.env.AWS_REGION ?? 'us-west-2',
  bucket: process.env.S3_BUCKET_NAME,
});

const bucketName = process.env.S3_BUCKET_NAME ?? '';

/**
 * Get file extension from a filename.
 */
const getExtensionFromFilename = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? `.${parts.pop()}` : '';
};

/**
 * Upload a file to S3 and return a presigned URL for access.
 */
export async function uploadToS3(
  fileBuffer: Buffer,
  originalFilename: string,
  contentType: string
): Promise<{
  url: string;
  objectName: string;
  name: string;
  contentType: string;
}> {
  try {
    // Generate a unique filename to prevent collisions
    const uniqueFilename = `${randomUUID()}${getExtensionFromFilename(originalFilename)}`;

    console.log('S3 upload parameters:', {
      originalFilename,
      uniqueFilename,
      contentType,
      bucketName: process.env.S3_BUCKET_NAME,
      bufferSize: fileBuffer.length,
    });

    const uploadParams = {
      Bucket: bucketName,
      Key: uniqueFilename,
      Body: fileBuffer,
      ContentType: contentType,
    };

    console.log('Uploading to S3...');
    try {
      await s3Client.send(new PutObjectCommand(uploadParams));
      console.log('File uploaded successfully to S3');
    } catch (uploadError: any) {
      console.error('S3 upload error details:', {
        code: uploadError.Code || uploadError.code,
        message: uploadError.message,
        region: process.env.AWS_REGION,
        bucket: bucketName,
      });

      if (
        uploadError.Code === 'AuthorizationHeaderMalformed' ||
        uploadError.message?.includes('credentials')
      ) {
        console.error('AWS authentication error. Check IAM role configuration or AWS credentials.');
      }

      throw uploadError;
    }

    // Generate a presigned URL for the uploaded file (for public read access)
    const getObjectParams = {
      Bucket: bucketName,
      Key: uniqueFilename,
    };

    // Create a presigned URL with a 7-day expiration (adjust as needed)
    const url = await getSignedUrl(s3Client, new GetObjectCommand(getObjectParams), {
      expiresIn: 604800,
    });
    console.log('Generated presigned URL for uploaded file');

    const result = {
      url,
      objectName: uniqueFilename,
      name: originalFilename,
      contentType,
    };

    console.log('Returning metadata from uploadToS3:', {
      url: result.url.substring(0, 50) + '...',
      objectName: result.objectName,
      name: result.name,
      contentType: result.contentType,
    });

    return result;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
}

/**
 * Get a presigned URL for an S3 object.
 */
export async function getS3PresignedUrl(key: string, expiresIn = 604800): Promise<string> {
  try {
    console.log(`Getting presigned URL for key: ${key}`);

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });

    console.log(`Generated presigned URL for ${key} (expires in ${expiresIn} seconds)`);
    return url;
  } catch (error) {
    console.error(`Error generating presigned URL for ${key}:`, error);
    throw error;
  }
}
