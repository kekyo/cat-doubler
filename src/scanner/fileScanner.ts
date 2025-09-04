// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { glob } from 'glob';
import { join } from 'path';
import { classifyFileWithManager } from '../utils/fileTypes';
import { stat } from 'fs/promises';
import { Logger } from '../utils/logger';
import { createIgnoreManager } from '../utils/ignoreFileParser';
import { createTextFileManager } from '../utils/textFileManager';

export interface ScannedFile {
  relativePath: string;
  absolutePath: string;
  isTextFile: boolean;
  requiresTemplating: boolean;
  isDirectory: boolean;
}

export const scanDirectory = async (
  sourcePath: string,
  ignorePath: string | undefined,
  textPath: string | undefined,
  logger: Logger
): Promise<ScannedFile[]> => {
  const files: ScannedFile[] = [];

  // Create ignore manager
  const ignoreManager = await createIgnoreManager(
    ignorePath,
    sourcePath,
    logger
  );

  // Create text file manager
  const textFileManager = await createTextFileManager(
    textPath,
    sourcePath,
    logger
  );

  logger.debug(`Scanning directory: ${sourcePath}`);

  // Use glob to find all files (we'll filter with ignore manager)
  const patterns = ['**/*'];

  const foundFiles = await glob(patterns, {
    cwd: sourcePath,
    ignore: [], // Don't use glob's ignore, we'll use our ignore manager
    dot: true, // Include dotfiles
    absolute: false,
    nodir: false, // Include directories
  });

  for (const file of foundFiles) {
    const absolutePath = join(sourcePath, file);

    // Check if file should be ignored
    if (ignoreManager.isIgnored(absolutePath)) {
      logger.debug(`  [ignored] ${file}`);
      continue;
    }

    const stats = await stat(absolutePath);

    if (stats.isDirectory()) {
      files.push({
        relativePath: file,
        absolutePath,
        isTextFile: false,
        requiresTemplating: false,
        isDirectory: true,
      });
    } else {
      const classification = classifyFileWithManager(file, textFileManager);

      files.push({
        relativePath: file,
        absolutePath,
        isTextFile: classification.isTextFile,
        requiresTemplating: classification.requiresTemplating,
        isDirectory: false,
      });

      const status = classification.requiresTemplating
        ? '[template]'
        : classification.isTextFile
          ? '[text]'
          : '[binary]';
      logger.debug(`  ${status} ${file}`);
    }
  }

  const textFiles = files.filter((f) => f.requiresTemplating).length;
  const binaryFiles = files.filter(
    (f) => !f.isDirectory && !f.isTextFile
  ).length;
  const directories = files.filter((f) => f.isDirectory).length;

  logger.info(`Scan complete:`);
  logger.info(`  - Directories: ${directories}`);
  logger.info(`  - Text files (templatable): ${textFiles}`);
  logger.info(`  - Binary/other files: ${binaryFiles}`);

  return files;
};

export const filterFilesForTemplating = (
  files: ScannedFile[]
): ScannedFile[] => {
  return files.filter((file) => !file.isDirectory);
};
