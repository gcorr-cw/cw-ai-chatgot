/**
 * Centralized file for attachment type definitions and utilities
 */

// File type categories
export const ATTACHMENT_TYPES = {
  // Image types
  IMAGE: {
    JPEG: 'image/jpeg',
    PNG: 'image/png',
    GIF: 'image/gif',
    WEBP: 'image/webp',
    SVG: 'image/svg+xml',
  },
  // Document types
  DOCUMENT: {
    DOC: 'application/msword',
    DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  },
  // PDF document type (separate category)
  DOCUMENT_PDF: {
    PDF: 'application/pdf',
  },
  // Spreadsheet types
  SPREADSHEET: {
    XLS: 'application/vnd.ms-excel',
    XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  // CSV spreadsheet type (separate category)
  SPREADSHEET_CSV: {
    CSV: 'text/csv',
  },
  // Presentation types
  PRESENTATION: {
    PPT: 'application/vnd.ms-powerpoint',
    PPTX: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
  // Text types
  TEXT: {
    PLAIN: 'text/plain',
    MARKDOWN: 'text/markdown',
    X_MARKDOWN: 'text/x-markdown',
    MD: 'text/md',
    APP_MARKDOWN: 'application/markdown',
    APP_X_MARKDOWN: 'application/x-markdown',
    RICHTEXT: 'text/richtext',
    RTF: 'application/rtf',

  },
  // Code types
  CODE: {
    JSON: 'application/json',
    HTML: 'text/html',
    XML: 'application/xml',
    XHTML: 'application/xhtml+xml',
    CSS: 'text/css',
    JAVASCRIPT: 'application/javascript',
    TYPESCRIPT: 'application/typescript',
    PYTHON: 'text/x-python',
    JAVA: 'text/x-java',
    C: 'text/x-c',
    CPP: 'text/x-c++',
    CSHARP: 'text/x-csharp',
    PHP: 'application/x-php',
    RUBY: 'text/x-ruby',
    GO: 'text/x-go',
    SWIFT: 'text/x-swift',
    RUST: 'text/x-rust',
  },
};

// Flattened arrays for easier usage
export const IMAGE_TYPES = Object.values(ATTACHMENT_TYPES.IMAGE);
export const DOCUMENT_TYPES = Object.values(ATTACHMENT_TYPES.DOCUMENT);
export const DOCUMENT_PDF_TYPES = Object.values(ATTACHMENT_TYPES.DOCUMENT_PDF);
export const SPREADSHEET_TYPES = Object.values(ATTACHMENT_TYPES.SPREADSHEET);
export const SPREADSHEET_CSV_TYPES = Object.values(ATTACHMENT_TYPES.SPREADSHEET_CSV);
export const PRESENTATION_TYPES = Object.values(ATTACHMENT_TYPES.PRESENTATION);
export const TEXT_TYPES = Object.values(ATTACHMENT_TYPES.TEXT);
export const CODE_TYPES = Object.values(ATTACHMENT_TYPES.CODE);

// All supported MIME types
export const ALL_SUPPORTED_MIME_TYPES = [
  ...IMAGE_TYPES,
  ...DOCUMENT_TYPES,
  ...DOCUMENT_PDF_TYPES,
  ...SPREADSHEET_TYPES,
  ...SPREADSHEET_CSV_TYPES,
  ...PRESENTATION_TYPES,
  ...TEXT_TYPES,
  ...CODE_TYPES,
];

// Common file extensions mapped to MIME types
export const FILE_EXTENSIONS = {
  // Images
  jpg: ATTACHMENT_TYPES.IMAGE.JPEG,
  jpeg: ATTACHMENT_TYPES.IMAGE.JPEG,
  png: ATTACHMENT_TYPES.IMAGE.PNG,
  gif: ATTACHMENT_TYPES.IMAGE.GIF,
  webp: ATTACHMENT_TYPES.IMAGE.WEBP,
  svg: ATTACHMENT_TYPES.IMAGE.SVG,
  // Documents
  doc: ATTACHMENT_TYPES.DOCUMENT.DOC,
  docx: ATTACHMENT_TYPES.DOCUMENT.DOCX,
  pdf: ATTACHMENT_TYPES.DOCUMENT_PDF.PDF,
  // Spreadsheets
  xls: ATTACHMENT_TYPES.SPREADSHEET.XLS,
  xlsx: ATTACHMENT_TYPES.SPREADSHEET.XLSX,
  csv: ATTACHMENT_TYPES.SPREADSHEET_CSV.CSV,
  // Presentations
  ppt: ATTACHMENT_TYPES.PRESENTATION.PPT,
  pptx: ATTACHMENT_TYPES.PRESENTATION.PPTX,
  // Text
  txt: ATTACHMENT_TYPES.TEXT.PLAIN,
  md: ATTACHMENT_TYPES.TEXT.MARKDOWN,
  markdown: ATTACHMENT_TYPES.TEXT.MARKDOWN,
  rtf: ATTACHMENT_TYPES.TEXT.RTF,
  json: ATTACHMENT_TYPES.CODE.JSON,
  html: ATTACHMENT_TYPES.CODE.HTML,
  htm: ATTACHMENT_TYPES.CODE.HTML,
  // Code
  xml: ATTACHMENT_TYPES.CODE.XML,
  xhtml: ATTACHMENT_TYPES.CODE.XHTML,
  css: ATTACHMENT_TYPES.CODE.CSS,
  js: ATTACHMENT_TYPES.CODE.JAVASCRIPT,
  ts: ATTACHMENT_TYPES.CODE.TYPESCRIPT,
  py: ATTACHMENT_TYPES.CODE.PYTHON,
  java: ATTACHMENT_TYPES.CODE.JAVA,
  c: ATTACHMENT_TYPES.CODE.C,
  cpp: ATTACHMENT_TYPES.CODE.CPP,
  cs: ATTACHMENT_TYPES.CODE.CSHARP,
  php: ATTACHMENT_TYPES.CODE.PHP,
  rb: ATTACHMENT_TYPES.CODE.RUBY,
  go: ATTACHMENT_TYPES.CODE.GO,
  swift: ATTACHMENT_TYPES.CODE.SWIFT,
  rs: ATTACHMENT_TYPES.CODE.RUST,
};

// Utility functions
/**
 * Checks if a file type is an image
 */
export function isImageType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  return IMAGE_TYPES.includes(contentType);
}

/**
 * Checks if a file type is a document (PDF, DOC, DOCX)
 */
export function isDocumentType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  return [...DOCUMENT_TYPES, ...DOCUMENT_PDF_TYPES].includes(contentType);
}

/**
 * Checks if a file type is a spreadsheet
 */
export function isSpreadsheetType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  return [...SPREADSHEET_TYPES, ...SPREADSHEET_CSV_TYPES].includes(contentType);
}

/**
 * Checks if a file type is a presentation
 */
export function isPresentationType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  return PRESENTATION_TYPES.includes(contentType);
}

/**
 * Checks if a file type is text-based
 */
export function isTextType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  return TEXT_TYPES.includes(contentType);
}

/**
 * Checks if a file type is code-based
 */
export function isCodeType(contentType: string | undefined): boolean {
  if (!contentType) return false;
  return CODE_TYPES.includes(contentType);
}

/**
 * Gets the MIME type from a file extension
 */
export function getMimeTypeFromExtension(extension: string): string | undefined {
  const ext = extension.toLowerCase().replace('.', '');
  return FILE_EXTENSIONS[ext as keyof typeof FILE_EXTENSIONS];
}

/**
 * Gets a human-readable file type description
 */
export function getFileTypeDescription(contentType: string | undefined): string {
  if (!contentType) return 'Unknown file';

  const typeMap: Record<string, string> = {
    [ATTACHMENT_TYPES.IMAGE.JPEG]: 'JPEG image',
    [ATTACHMENT_TYPES.IMAGE.PNG]: 'PNG image',
    [ATTACHMENT_TYPES.IMAGE.GIF]: 'GIF image',
    [ATTACHMENT_TYPES.IMAGE.WEBP]: 'WebP image',
    [ATTACHMENT_TYPES.IMAGE.SVG]: 'SVG image',
    [ATTACHMENT_TYPES.DOCUMENT.DOC]: 'Word document',
    [ATTACHMENT_TYPES.DOCUMENT.DOCX]: 'Word document',
    [ATTACHMENT_TYPES.DOCUMENT_PDF.PDF]: 'PDF document',
    [ATTACHMENT_TYPES.SPREADSHEET.XLS]: 'Excel spreadsheet',
    [ATTACHMENT_TYPES.SPREADSHEET.XLSX]: 'Excel spreadsheet',
    [ATTACHMENT_TYPES.SPREADSHEET_CSV.CSV]: 'CSV file',
    [ATTACHMENT_TYPES.PRESENTATION.PPT]: 'PowerPoint presentation',
    [ATTACHMENT_TYPES.PRESENTATION.PPTX]: 'PowerPoint presentation',
    [ATTACHMENT_TYPES.TEXT.PLAIN]: 'Text file',
    [ATTACHMENT_TYPES.TEXT.MARKDOWN]: 'Markdown file',
    [ATTACHMENT_TYPES.TEXT.X_MARKDOWN]: 'Markdown file',
    [ATTACHMENT_TYPES.TEXT.MD]: 'Markdown file',
    [ATTACHMENT_TYPES.TEXT.APP_MARKDOWN]: 'Markdown file',
    [ATTACHMENT_TYPES.TEXT.APP_X_MARKDOWN]: 'Markdown file',
    [ATTACHMENT_TYPES.CODE.HTML]: 'HTML file',
    [ATTACHMENT_TYPES.TEXT.RICHTEXT]: 'Rich text file',
    [ATTACHMENT_TYPES.TEXT.RTF]: 'Rich text file',
    [ATTACHMENT_TYPES.CODE.JSON]: 'JSON file',
    [ATTACHMENT_TYPES.CODE.XML]: 'XML file',
    [ATTACHMENT_TYPES.CODE.XHTML]: 'XHTML file',
    [ATTACHMENT_TYPES.CODE.CSS]: 'CSS file',
    [ATTACHMENT_TYPES.CODE.JAVASCRIPT]: 'JavaScript file',
    [ATTACHMENT_TYPES.CODE.TYPESCRIPT]: 'TypeScript file',
    [ATTACHMENT_TYPES.CODE.PYTHON]: 'Python file',
    [ATTACHMENT_TYPES.CODE.JAVA]: 'Java file',
    [ATTACHMENT_TYPES.CODE.C]: 'C file',
    [ATTACHMENT_TYPES.CODE.CPP]: 'C++ file',
    [ATTACHMENT_TYPES.CODE.CSHARP]: 'C# file',
    [ATTACHMENT_TYPES.CODE.PHP]: 'PHP file',
    [ATTACHMENT_TYPES.CODE.RUBY]: 'Ruby file',
    [ATTACHMENT_TYPES.CODE.GO]: 'Go file',
    [ATTACHMENT_TYPES.CODE.SWIFT]: 'Swift file',
    [ATTACHMENT_TYPES.CODE.RUST]: 'Rust file',
  };

  return typeMap[contentType] || contentType;
}

/**
 * Checks if a file is text-based by examining both MIME type and extension
 */
export function isTextBasedFile(contentType: string | undefined, fileName: string): boolean {
  if (!contentType) return false;

  // Check by MIME type
  const isTextByMimeType =
    contentType.startsWith('text/') ||
    contentType.includes('markdown') ||
    contentType.includes('/md') ||
    contentType === 'application/rtf' ||
    contentType === 'application/json';

  if (isTextByMimeType) return true;

  // Check by extension for octet-stream files
  if (contentType === 'application/octet-stream') {
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
    return ['md', 'markdown', 'txt', 'csv', 'json', 'html', 'htm', 'rtf', 'log'].includes(fileExtension);
  }

  return false;
}

/**
 * Gets the file size limit in bytes
 */
export const FILE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB

/**
 * Gets the file type category for a given MIME type or file extension
 */
export function getFileTypeCategory(contentType: string | undefined, fileName?: string): string {
  if (!contentType && !fileName) return 'Unknown';
  
  // Try to get MIME type from extension if contentType is not provided
  if (!contentType && fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension) {
      contentType = getMimeTypeFromExtension(extension);
    }
  }
  
  if (!contentType) return 'Unknown';
  
  if (isImageType(contentType)) return 'Image';
  if (DOCUMENT_PDF_TYPES.includes(contentType)) return 'PDF';
  if (isDocumentType(contentType)) return 'Document';
  if (SPREADSHEET_CSV_TYPES.includes(contentType)) return 'CSV';
  if (isSpreadsheetType(contentType)) return 'Spreadsheet';
  if (isPresentationType(contentType)) return 'Presentation';
  if (isTextType(contentType)) return 'Text';
  if (isCodeType(contentType)) return 'Code';
  
  return 'Other';
}

/**
 * Gets a list of supported file type categories for a list of MIME types
 */
export function getSupportedFileTypeCategories(mimeTypes: string[]): string[] {
  const categories = new Set<string>();
  
  mimeTypes.forEach(mimeType => {
    const category = getFileTypeCategory(mimeType);
    if (category !== 'Unknown' && category !== 'Other') {
      categories.add(category);
    }
  });
  
  return Array.from(categories).sort();
}
