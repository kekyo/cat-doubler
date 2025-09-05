// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { extname, basename } from 'path';
import { TextFileManager } from './textFileManager';

export interface FileClassification {
  isTextFile: boolean;
  requiresTemplating: boolean;
  extension: string;
  filename: string;
}

// Function that uses TextFileManager for text file detection
export const classifyFileWithManager = async (
  filePath: string,
  textFileManager: TextFileManager
): Promise<FileClassification> => {
  const ext = extname(filePath).toLowerCase();
  const filename = basename(filePath);

  // Use TextFileManager for text file detection
  const isTextFile = await textFileManager.isTextFile(filePath);
  const requiresTemplating = isTextFile;

  return {
    isTextFile,
    requiresTemplating,
    extension: ext,
    filename,
  };
};
