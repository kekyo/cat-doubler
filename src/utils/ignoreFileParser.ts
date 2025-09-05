// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import ignore from 'ignore';
import { readFile } from 'fs/promises';
import { join, relative } from 'path';
import { Logger } from './logger';
import catdoublerignoreTemplate from '../config/catdoublerignore.template?raw';

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

  // Read custom ignore file or use template
  const ignoreFilePath = ignorePath || join(sourcePath, '.catdoublerignore');

  try {
    const content = await readFile(ignoreFilePath, 'utf-8');
    ig.add(content);
    logger.info(`Loaded patterns from ${ignoreFilePath}`);
  } catch (error: any) {
    if (ignorePath) {
      // If a custom ignore path was specified but not found, it's an error
      throw new Error(`Specified ignore file not found: ${ignoreFilePath}`);
    }
    // If default .catdoublerignore doesn't exist, use template
    ig.add(catdoublerignoreTemplate);
    logger.debug(`.catdoublerignore not found, using default template`);
  }

  return {
    isIgnored(filePath: string): boolean {
      // Convert absolute path to relative path for ignore matching
      const relativePath = relative(sourcePath, filePath);
      return ig.ignores(relativePath);
    },

    addPatterns(patterns: string[]): void {
      ig.add(patterns);
    },

    getPatternCount(): number {
      // Not tracking count anymore since we use templates
      return 0;
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
