// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import chardet from 'chardet';
import { isBinaryFile } from 'isbinaryfile';
import { readFile, stat } from 'fs/promises';
import { basename, extname } from 'path';
import { Logger } from './logger';

export interface FileEncodingResult {
  isTextFile: boolean;
  encoding: string | null;
  confidence: number;
  requiresTemplating: boolean;
  warning?: string;
}

// UTF-8 required by specification
const UTF8_SPEC_REQUIRED_EXTENSIONS = [
  '.json', // RFC 8259
  '.jsonc', // JSON with Comments
  '.json5', // JSON5
  '.go', // Go language specification
  '.rs', // Rust language specification
  '.toml', // TOML specification
];

const UTF8_SPEC_REQUIRED_FILENAMES = [
  'go.mod', // Go Modules specification
  'go.sum', // Go Modules specification
  'Cargo.toml', // Rust/TOML
  'Cargo.lock', // Rust/TOML
];

// Known binary file extensions
const KNOWN_BINARY_EXTENSIONS = [
  // Images
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.bmp',
  '.ico',
  '.svg',
  '.tiff',
  '.tif',
  '.psd',
  '.raw',
  '.heif',
  '.heic',
  // Documents
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.odt',
  '.ods',
  '.odp',
  '.chm',
  // Archives
  '.zip',
  '.arc',
  '.lzh',
  '.tar',
  '.gz',
  '.bz2',
  '.xz',
  '.7z',
  '.lz4',
  '.rar',
  '.cab',
  '.dmg',
  '.img',
  '.iso',
  // Executables
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.obj',
  '.pdb',
  '.app',
  '.deb',
  '.rpm',
  '.msi',
  '.bin',
  '.AppImage',
  // Media
  '.mpeg',
  '.mpg',
  '.mp2',
  '.mp3',
  '.mp4',
  '.avi',
  '.mov',
  '.mkv',
  '.wav',
  '.flac',
  '.ogg',
  '.webm',
  '.m4a',
  '.aac',
  '.wma',
  '.flv',
  '.wmv',
  // Fonts
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  // Data
  '.db',
  '.sqlite',
  '.mdb',
  '.accdb',
];

// UTF-16 hint extensions (files that are often UTF-16 without BOM)
const UTF16_HINT_EXTENSIONS = ['.resx', '.rc', '.res'];

export const detectFileEncoding = async (
  filePath: string,
  logger: Logger
): Promise<FileEncodingResult> => {
  const ext = extname(filePath).toLowerCase();
  const filename = basename(filePath);

  // Step 1: Check known binary extensions
  if (KNOWN_BINARY_EXTENSIONS.includes(ext)) {
    logger.debug(`File ${filePath} identified as binary by extension`);
    return {
      isTextFile: false,
      encoding: null,
      confidence: 1.0,
      requiresTemplating: false,
    };
  }

  // Step 2: Check UTF-8 guaranteed files (by specification)
  if (
    UTF8_SPEC_REQUIRED_EXTENSIONS.includes(ext) ||
    UTF8_SPEC_REQUIRED_FILENAMES.includes(filename)
  ) {
    logger.debug(
      `File ${filePath} assumed to be UTF-8 (specification required)`
    );
    return {
      isTextFile: true,
      encoding: 'UTF-8',
      confidence: 1.0,
      requiresTemplating: true,
    };
  }

  // Step 3: Check if file is binary using isbinaryfile
  try {
    const isBinary = await isBinaryFile(filePath);

    if (isBinary) {
      logger.debug(`File ${filePath} detected as binary by content analysis`);
      return {
        isTextFile: false,
        encoding: null,
        confidence: 1.0,
        requiresTemplating: false,
      };
    }
  } catch (error: any) {
    logger.debug(
      `Error checking binary status for ${filePath}: ${error.message}`
    );
    // Continue to encoding detection if binary check fails
  }

  // Step 4: Special handling for UTF-16 hint files
  if (UTF16_HINT_EXTENSIONS.includes(ext)) {
    try {
      const fullBuffer = await readFile(filePath, { encoding: null });
      const buffer = fullBuffer.subarray(0, 100);

      // Check for UTF-16 LE pattern (ASCII characters followed by NULL)
      let nullCount = 0;
      for (let i = 1; i < buffer.length; i += 2) {
        if (buffer[i] === 0) nullCount++;
      }

      if (nullCount > buffer.length / 4) {
        logger.warn(
          `File ${filePath} appears to be UTF-16 without BOM, ` +
            `treating as binary (only UTF-8 text files are supported)`
        );
        return {
          isTextFile: false,
          encoding: 'UTF-16LE (detected)',
          confidence: 0.8,
          requiresTemplating: false,
          warning: 'UTF-16 file detected',
        };
      }
    } catch (error: any) {
      logger.debug(`Could not check UTF-16 for ${filePath}: ${error.message}`);
    }
  }

  // Step 5: Detect encoding using chardet for text files
  try {
    const fileStat = await stat(filePath);
    const sampleSize = Math.min(fileStat.size, 65536); // Read up to 64KB

    const detectedEncoding = await chardet.detectFile(filePath, {
      sampleSize: sampleSize,
    });

    if (!detectedEncoding) {
      // Unable to detect encoding = likely binary
      logger.debug(
        `Unable to detect encoding for ${filePath}, treating as binary`
      );
      return {
        isTextFile: false,
        encoding: null,
        confidence: 0,
        requiresTemplating: false,
      };
    }

    // Check if UTF-8 compatible
    let isUtf8Compatible =
      detectedEncoding === 'UTF-8' ||
      detectedEncoding === 'UTF-8-SIG' ||
      detectedEncoding === 'ascii' ||
      detectedEncoding === 'ASCII';

    // Special handling for ISO-8859-1: check if it's actually pure ASCII
    if (!isUtf8Compatible && detectedEncoding === 'ISO-8859-1') {
      try {
        const content = await readFile(filePath);
        // Check if all bytes are ASCII (< 128)
        const isPureAscii = !content.some((byte) => byte > 127);
        if (isPureAscii) {
          // Pure ASCII is UTF-8 compatible
          isUtf8Compatible = true;
          logger.debug(
            `File ${filePath} detected as ISO-8859-1 but is pure ASCII, treating as UTF-8 compatible`
          );
        }
      } catch (err) {
        // If we can't read the file, keep original detection
        logger.debug(`Could not verify ISO-8859-1 file ${filePath}: ${err}`);
      }
    }

    if (!isUtf8Compatible) {
      // Non-UTF-8 text file = treat as binary with warning
      logger.warn(
        `File ${filePath} detected as ${detectedEncoding}, ` +
          `treating as binary (only UTF-8 text files are supported for templating)`
      );
      return {
        isTextFile: false,
        encoding: detectedEncoding,
        confidence: 1.0,
        requiresTemplating: false,
        warning: `Non-UTF-8 encoding (${detectedEncoding}) detected`,
      };
    }

    // UTF-8 compatible text file
    logger.debug(`File ${filePath} detected as ${detectedEncoding}`);
    return {
      isTextFile: true,
      encoding: detectedEncoding,
      confidence: 1.0,
      requiresTemplating: true,
    };
  } catch (error: any) {
    // Error reading file = treat as binary
    logger.debug(
      `Error reading ${filePath}: ${error.message}, treating as binary`
    );
    return {
      isTextFile: false,
      encoding: null,
      confidence: 0,
      requiresTemplating: false,
    };
  }
};
