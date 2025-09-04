// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import ignore from 'ignore';
import { readFile } from 'fs/promises';
import { join, relative } from 'path';
import { Logger } from './logger';

export interface IgnoreManager {
  isIgnored(filePath: string): boolean;
  addPatterns(patterns: string[]): void;
  getPatternCount(): number;
}

export const createIgnoreManager = async (
  ignorePath: string | undefined,
  sourcePath: string,
  logger: Logger
): Promise<IgnoreManager> => {
  const ig = ignore();
  let totalPatternCount = 0;

  // Always ignore these directories
  const defaultIgnorePatterns = [
    'node_modules/',
    '.git/',
    'dist/',
    'build/',
    'coverage/',
    '.next/',
    '.nuxt/',
    'test-results/',
  ];

  ig.add(defaultIgnorePatterns);
  totalPatternCount += defaultIgnorePatterns.length;
  logger.debug(`Added ${defaultIgnorePatterns.length} default ignore patterns`);

  // Read custom ignore file
  const ignoreFilePath = ignorePath || join(sourcePath, '.catdoublerignore');

  try {
    const content = await readFile(ignoreFilePath, 'utf-8');
    const patterns = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));

    if (patterns.length > 0) {
      ig.add(patterns);
      totalPatternCount += patterns.length;
      logger.info(`Loaded ${patterns.length} patterns from ${ignoreFilePath}`);
    }
  } catch (error: any) {
    if (ignorePath) {
      // If a custom ignore path was specified but not found, it's an error
      throw new Error(`Specified ignore file not found: ${ignoreFilePath}`);
    }
    // If default .catdoublerignore doesn't exist, it's fine
    logger.debug(`.catdoublerignore not found, using only default patterns`);
  }

  return {
    isIgnored(filePath: string): boolean {
      // Convert absolute path to relative path for ignore matching
      const relativePath = relative(sourcePath, filePath);
      return ig.ignores(relativePath);
    },

    addPatterns(patterns: string[]): void {
      ig.add(patterns);
      totalPatternCount += patterns.length;
    },

    getPatternCount(): number {
      return totalPatternCount;
    },
  };
};

export const parseIgnoreFile = async (filePath: string): Promise<string[]> => {
  const content = await readFile(filePath, 'utf-8');
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
};
