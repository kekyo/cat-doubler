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
  // Optional base directory hint used for pattern adjustment
  // If provided, patterns are treated as if they were defined in this directory
  baseDir?: string;
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
  logger: Logger,
  options?: { rootCatIgnorePath?: string }
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
    // For root directory, allow overriding the .catdoublerignore location via options
    const catdoublerignorePath =
      dir === rootPath && options?.rootCatIgnorePath
        ? options.rootCatIgnorePath
        : join(dir, '.catdoublerignore');
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
          // If the root .catdoublerignore path is overridden and is outside the source root,
          // we treat its patterns as if they were defined at the source root for adjustment purposes.
          const baseDirHint =
            dir === rootPath && options?.rootCatIgnorePath
              ? rootPath
              : undefined;
          ignoreFiles.push({
            path: catdoublerignorePath,
            type: 'catdoublerignore',
            patterns,
            baseDir: baseDirHint,
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
  logger: Logger,
  opts?: { rootCatIgnorePath?: string }
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
      ignoreFiles = await collectIgnoreFiles(sourcePath, dir, logger, {
        rootCatIgnorePath: opts?.rootCatIgnorePath,
      });
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

    // Always seed with built-in baseline template first
    ig.add(catdoublerignoreTemplate);
    logger.debug('Seeded ignore with built-in baseline template');

    // Add patterns from all ignore files (root to target)
    for (const ignoreFile of ignoreFiles) {
      // Adjust patterns to be relative to the source path
      const ignoreDir = ignoreFile.baseDir ?? dirname(ignoreFile.path);
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
  // If a specific ignore path is provided, treat it as the location of the root .catdoublerignore
  // and still use hierarchical merging with .gitignore and subdirectory rules.
  if (ignorePath) {
    try {
      await access(ignorePath);
    } catch {
      throw new Error(`Specified ignore file not found: ${ignorePath}`);
    }
    logger.info(`Using .catdoublerignore at: ${ignorePath}`);
    return createHierarchicalIgnoreManager(sourcePath, logger, {
      rootCatIgnorePath: ignorePath,
    });
  }

  // No specific path provided: use hierarchical manager with autodetected .catdoublerignore locations
  return createHierarchicalIgnoreManager(sourcePath, logger);
};

export const parseIgnoreFile = async (filePath: string): Promise<string[]> => {
  const content = await readFile(filePath, 'utf-8');
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
};
