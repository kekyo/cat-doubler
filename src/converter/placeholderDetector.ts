// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { readFile } from 'fs/promises';
import { ScannedFile } from '../scanner/fileScanner';
import { Logger } from '../utils/logger';

export interface PlaceholderSet {
  camel: string;
  pascal: string;
  kebab: string;
  snake: string;
  constant: string;
  dot: string;
  lower: string;
  upper: string;
}

// Find safe placeholders that don't collide with existing content
export const findSafePlaceholders = async (
  files: ScannedFile[],
  logger: Logger
): Promise<PlaceholderSet> => {
  logger.debug('Phase 2: Detecting safe placeholders...');

  // Collect all existing strings from file paths and contents
  const existingStrings = new Set<string>();

  // Add all file paths (including directory names)
  for (const file of files) {
    // Split path into segments and add each
    const segments = file.relativePath.split('/');
    segments.forEach((segment) => {
      existingStrings.add(segment);
      // Also add parts of the segment split by common delimiters
      segment.split(/[-_.]/).forEach((part) => existingStrings.add(part));
    });
  }

  // Scan file contents for existing strings
  for (const file of files) {
    if (file.requiresTemplating && !file.isDirectory) {
      try {
        const content = await readFile(file.absolutePath, 'utf-8');

        // Extract potential placeholder-like strings
        // Match sequences that look like __something__
        const placeholderPattern = /__[a-zA-Z0-9]+__/g;
        const matches = content.match(placeholderPattern);
        if (matches) {
          matches.forEach((match) => existingStrings.add(match));
        }

        // Also check for our specific pattern variations
        const words = content.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g);
        if (words) {
          words.forEach((word) => {
            if (word.includes('__')) {
              existingStrings.add(word);
            }
          });
        }
      } catch (error) {
        logger.debug(
          `  Warning: Could not read file ${file.relativePath}: ${error}`
        );
      }
    }
  }

  // Find safe placeholder names
  let counter = 1;
  let maxTries = 1000; // Prevent infinite loop

  while (counter < maxTries) {
    const candidates: PlaceholderSet = {
      camel: `__camel${counter}__`,
      pascal: `__pascal${counter}__`,
      kebab: `__kebab${counter}__`,
      snake: `__snake${counter}__`,
      constant: `__constant${counter}__`,
      dot: `__dot${counter}__`,
      lower: `__lower${counter}__`,
      upper: `__upper${counter}__`,
    };

    // Check if any candidate collides with existing strings
    const hasCollision = Object.values(candidates).some((placeholder) =>
      existingStrings.has(placeholder)
    );

    if (!hasCollision) {
      logger.debug(`  Found safe placeholders with suffix: ${counter}`);
      logger.debug(`    camel: ${candidates.camel}`);
      logger.debug(`    pascal: ${candidates.pascal}`);
      logger.debug(`    kebab: ${candidates.kebab}`);
      logger.debug(`    snake: ${candidates.snake}`);
      logger.debug(`    constant: ${candidates.constant}`);
      logger.debug(`    dot: ${candidates.dot}`);
      logger.debug(`    lower: ${candidates.lower}`);
      logger.debug(`    upper: ${candidates.upper}`);
      return candidates;
    }

    counter++;
  }

  // This should never happen in practice
  throw new Error('Could not find safe placeholder names after 1000 attempts');
};
