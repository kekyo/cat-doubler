// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import ignore from 'ignore';
import { readFile, access } from 'fs/promises';
import { join, relative, dirname } from 'path';
import { Logger } from './logger';
import catdoublerignoreTemplate from '../config/catdoublerignore.template?raw';

export interface IgnoreManager {
  isIgnored(filePath: string): boolean | Promise<boolean>;
  addPatterns(patterns: string[]): void;
  getPatternCount(): number;
}

export interface IgnoreFileInfo {
  path: string;
  type: 'catdoublerignore' | 'gitignore';
  patterns: string[];
}

export interface HierarchicalIgnoreManager extends IgnoreManager {
  getAppliedRules(filePath: string): Promise<IgnoreFileInfo[]>;
}

// Check if a file exists
const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

// Collect all ignore files from root to target path
const collectIgnoreFiles = async (
  rootPath: string,
  targetPath: string,
  logger: Logger
): Promise<IgnoreFileInfo[]> => {
  const ignoreFiles: IgnoreFileInfo[] = [];
  const dirs: string[] = [];

  // Build directory hierarchy from root to target
  let currentPath = targetPath;
  while (currentPath.startsWith(rootPath)) {
    dirs.unshift(currentPath);
    if (currentPath === rootPath) break;
    const parent = dirname(currentPath);
    if (parent === currentPath) break; // Reached filesystem root
    currentPath = parent;
  }

  // Check each directory for ignore files and merge rules.
  // Ordering per directory: .gitignore (base) then .catdoublerignore (overrides)
  for (const dir of dirs) {
    const catdoublerignorePath = join(dir, '.catdoublerignore');
    const gitignorePath = join(dir, '.gitignore');

    // First, load .gitignore if present
    if (await fileExists(gitignorePath)) {
      try {
        const content = await readFile(gitignorePath, 'utf-8');
        const patterns = content
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#'));

        if (patterns.length > 0) {
          ignoreFiles.push({
            path: gitignorePath,
            type: 'gitignore',
            patterns,
          });
          logger.debug(`Found .gitignore in ${dir}`);
        }
      } catch (error) {
        logger.debug(`Failed to read ${gitignorePath}: ${error}`);
      }
    }

    // Then, load .catdoublerignore if present (overrides previous rules)
    if (await fileExists(catdoublerignorePath)) {
      try {
        const content = await readFile(catdoublerignorePath, 'utf-8');
        const patterns = content
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#'));

        if (patterns.length > 0) {
          ignoreFiles.push({
            path: catdoublerignorePath,
            type: 'catdoublerignore',
            patterns,
          });
          logger.debug(`Found .catdoublerignore in ${dir}`);
        }
      } catch (error) {
        logger.debug(`Failed to read ${catdoublerignorePath}: ${error}`);
      }
    }
  }

  return ignoreFiles;
};

// Create a hierarchical ignore manager
export const createHierarchicalIgnoreManager = async (
  sourcePath: string,
  logger: Logger
): Promise<HierarchicalIgnoreManager> => {
  // Cache for ignore instances by the deepest ignore file directory
  const ignoreCache = new Map<string, ignore.Ignore>();
  // Cache for collectIgnoreFiles results
  const ignoreFilesCache = new Map<string, IgnoreFileInfo[]>();

  // Get or create ignore instance for a specific path
  const getIgnoreForPath = async (filePath: string): Promise<ignore.Ignore> => {
    const dir = dirname(filePath);

    // First, collect ignore files with caching
    let ignoreFiles: IgnoreFileInfo[];
    if (ignoreFilesCache.has(dir)) {
      ignoreFiles = ignoreFilesCache.get(dir)!;
    } else {
      ignoreFiles = await collectIgnoreFiles(sourcePath, dir, logger);
      ignoreFilesCache.set(dir, ignoreFiles);
    }

    // Determine cache key based on the deepest ignore file location
    // This allows sharing ignore instances for directories with the same rule set
    const cacheKey =
      ignoreFiles.length > 0
        ? dirname(ignoreFiles[ignoreFiles.length - 1]!.path)
        : sourcePath; // Use source path for default template case

    // Check if we already have an ignore instance for this rule set
    if (ignoreCache.has(cacheKey)) {
      logger.debug(`Using cached ignore instance for ${cacheKey}`);
      return ignoreCache.get(cacheKey)!;
    }

    // Create merged ignore instance
    const ig = ignore();

    // If no ignore files found, use default template
    if (ignoreFiles.length === 0) {
      ig.add(catdoublerignoreTemplate);
      logger.debug('No ignore files found, using default template');
    } else {
      // Add patterns from all ignore files (root to target)
      for (const ignoreFile of ignoreFiles) {
        // Adjust patterns to be relative to the source path
        const ignoreDir = dirname(ignoreFile.path);
        const relativeToSource = relative(sourcePath, ignoreDir);

        const adjustedPatterns = ignoreFile.patterns.map((pattern) => {
          // If we're not in the root directory, we need to adjust patterns
          if (relativeToSource) {
            if (pattern.startsWith('!')) {
              // Handle negation patterns
              const negatedPattern = pattern.substring(1);
              if (negatedPattern.startsWith('/')) {
                // Absolute negation pattern - make it relative to source root
                return `!${relativeToSource}${negatedPattern}`;
              } else {
                // Relative negation pattern - applies recursively, no adjustment needed
                return pattern;
              }
            } else if (pattern.startsWith('/')) {
              // Absolute pattern - make it relative to source root
              return `${relativeToSource}${pattern}`;
            } else {
              // Relative pattern - applies recursively, no adjustment needed
              return pattern;
            }
          }
          return pattern;
        });

        ig.add(adjustedPatterns);
        logger.debug(
          `Added ${ignoreFile.patterns.length} patterns from ${ignoreFile.path}`
        );
      }
    }

    ignoreCache.set(cacheKey, ig);
    logger.debug(`Created new ignore instance for ${cacheKey}`);
    return ig;
  };

  return {
    async isIgnored(filePath: string): Promise<boolean> {
      const ig = await getIgnoreForPath(filePath);
      const relativePath = relative(sourcePath, filePath);
      return ig.ignores(relativePath);
    },

    addPatterns(_patterns: string[]): void {
      // Clear both caches when patterns are added dynamically
      ignoreCache.clear();
      ignoreFilesCache.clear();
    },

    getPatternCount(): number {
      return 0; // Not tracking count in hierarchical mode
    },

    async getAppliedRules(filePath: string): Promise<IgnoreFileInfo[]> {
      const dir = dirname(filePath);
      return await collectIgnoreFiles(sourcePath, dir, logger);
    },
  };
};

// Legacy createIgnoreManager for backward compatibility
export const createIgnoreManager = async (
  ignorePath: string | undefined,
  sourcePath: string,
  logger: Logger
): Promise<IgnoreManager> => {
  // If a specific ignore path is provided, use the old behavior
  if (ignorePath) {
    const ig = ignore();
    try {
      const content = await readFile(ignorePath, 'utf-8');
      ig.add(content);
      logger.info(`Loaded patterns from ${ignorePath}`);
    } catch (error: any) {
      throw new Error(`Specified ignore file not found: ${ignorePath}`);
    }

    return {
      isIgnored(filePath: string): boolean {
        const relativePath = relative(sourcePath, filePath);
        return ig.ignores(relativePath);
      },
      addPatterns(patterns: string[]): void {
        ig.add(patterns);
      },
      getPatternCount(): number {
        return 0;
      },
    };
  }

  // Otherwise, use the new hierarchical manager
  return createHierarchicalIgnoreManager(sourcePath, logger);
};

export const parseIgnoreFile = async (filePath: string): Promise<string[]> => {
  const content = await readFile(filePath, 'utf-8');
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
};
