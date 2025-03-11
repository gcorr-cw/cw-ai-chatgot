import type { Attachment } from 'ai';

/**
 * Extended Attachment interface that includes the unique S3 key
 * needed for S3 storage and proper filename display.
 */
export interface ExtendedAttachment extends Attachment {
  /**
   * The unique S3 object key in AWS S3.
   */
  objectName?: string;
}
