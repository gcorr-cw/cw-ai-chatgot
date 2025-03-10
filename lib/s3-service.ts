/**
 * AWS S3 Service for handling file operations
 * This service handles all interactions with AWS S3 using server-side authentication
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

// Get the AWS region from environment variables, defaulting to us-west-2 if not specified
const awsRegion = process.env.AWS_REGION || 'us-west-2';

// S3 client with IAM role authentication (uses AWS SDK's default credentials provider chain)
const s3Client = new S3Client({
  region: awsRegion,
});

const bucketName = process.env.S3_BUCKET_NAME;

if (!bucketName) {
  throw new Error('S3_BUCKET_NAME environment variable is not set');
}

/**
 * Uploads a file to S3 and returns the file metadata in the same format as Vercel Blob
 * to maintain compatibility with the existing application
 */
export async function uploadToS3(
  fileBuffer: ArrayBuffer, 
  originalFilename: string, 
  contentType: string
): Promise<{ url: string; pathname: string; contentType: string }> {
  // Generate a unique filename to prevent collisions
  const fileExtension = originalFilename.split('.').pop() || '';
  const uniqueFilename = `${randomUUID()}.${fileExtension}`;
  
  // Define the S3 upload parameters
  const uploadParams = {
    Bucket: bucketName,
    Key: uniqueFilename,
    Body: Buffer.from(fileBuffer),
    ContentType: contentType,
  };

  // Upload the file to S3
  await s3Client.send(new PutObjectCommand(uploadParams));
  
  // Generate a presigned URL for the uploaded file (for public read access)
  const getObjectParams = {
    Bucket: bucketName,
    Key: uniqueFilename,
  };
  
  // Create a presigned URL with a 7-day expiration (adjust as needed)
  const url = await getSignedUrl(s3Client, new GetObjectCommand(getObjectParams), { expiresIn: 604800 });
  
  // Return metadata in the same format as Vercel Blob for compatibility
  return {
    url,
    pathname: uniqueFilename,
    contentType,
  };
}

/**
 * Deletes a file from S3 by its unique pathname
 */
export async function deleteFromS3(pathname: string): Promise<void> {
  const deleteParams = {
    Bucket: bucketName,
    Key: pathname,
  };
  
  await s3Client.send(new DeleteObjectCommand(deleteParams));
}

/**
 * Generates a presigned URL for a file in S3
 * This is useful for temporary access to files
 */
export async function getS3PresignedUrl(pathname: string, expiresIn: number = 3600): Promise<string> {
  const getObjectParams = {
    Bucket: bucketName,
    Key: pathname,
  };
  
  const url = await getSignedUrl(s3Client, new GetObjectCommand(getObjectParams), { expiresIn });
  return url;
}
