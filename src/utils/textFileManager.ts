// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { Logger } from './logger';
import { detectFileEncoding, FileEncodingResult } from './encodingDetector';

export interface TextFileManager {
  isTextFile(filePath: string): Promise<boolean>;
  validateEncoding(filePath: string): Promise<FileEncodingResult>;
}

export const createTextFileManager = async (
  logger: Logger
): Promise<TextFileManager> => {
  return {
    async isTextFile(filePath: string): Promise<boolean> {
      const result = await detectFileEncoding(filePath, logger);
      return result.isTextFile;
    },

    async validateEncoding(filePath: string): Promise<FileEncodingResult> {
      return await detectFileEncoding(filePath, logger);
    },
  };
};

// Create a default text file manager for backward compatibility
export const createDefaultTextFileManager =
  async (): Promise<TextFileManager> => {
    // Create a no-op logger for default manager
    const noOpLogger: Logger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };

    return createTextFileManager(noOpLogger);
  };
