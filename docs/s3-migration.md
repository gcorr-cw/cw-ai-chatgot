# AWS S3 Migration Guide

This document explains how we migrated from Vercel Blob Storage to AWS S3 for file attachments in the AI Chatbot application.

## Implementation Details

### 1. S3 Integration

- **S3 Service Module**: Created `lib/s3-service.ts` as a central place for all S3 operations, ensuring they happen server-side
- **IAM Authentication**: Uses the server's IAM role for S3 authentication

### 2. API Endpoints

We implemented the following server-side API endpoints to handle file operations:

- **`/api/files/upload`**: Uploads files to S3
- **`/api/files/refresh-url`**: Refreshes expired presigned URLs for individual files
- **`/api/files/get-attachments`**: Batch retrieves presigned URLs for multiple attachments

### 3. Component Changes

- **PreviewAttachment**: Updated to handle S3 presigned URL expiration
- **Message Component**: Updated to use the `useAttachments` hook for server-side URL handling

### 4. Security Improvements

- All S3 operations now go through the server using IAM roles
- No direct S3 access from the client, enhancing security
- Presigned URLs have configurable expiration times

## Environment Variables

The following environment variables need to be set:

- `S3_BUCKET_NAME`: The name of your S3 bucket (required)

## Existing Files

For existing files stored in Vercel Blob, you may need to implement a migration script to transfer them to S3. The script should:

1. Fetch all message attachments from the database
2. Download each attachment from Vercel Blob
3. Upload to S3 using the `uploadToS3` function
4. Update the message record with the new S3 URL

## Troubleshooting

Common issues:

1. **Expired URLs**: If images stop loading, the presigned URL may have expired. The application should automatically refresh URLs on error.

2. **IAM Permissions**: Ensure the server has the following IAM permissions:
   - `s3:PutObject`
   - `s3:GetObject`
   - `s3:DeleteObject`

3. **CORS Issues**: If accessing S3 directly from the client browser, ensure proper CORS configuration on the S3 bucket (not needed with our server-side approach).
