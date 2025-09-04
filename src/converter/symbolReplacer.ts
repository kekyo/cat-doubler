// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { CaseVariants, escapeRegExp } from '../utils/caseUtils';
import { detectCase } from './caseDetector';
import { PlaceholderSet } from './placeholderDetector';
import { Logger } from '../utils/logger';

export interface ReplacementResult {
  content: string;
  replacementCount: number;
}

// Replace symbol occurrences in content with placeholders
export const replaceSymbolInContent = (
  content: string,
  variants: CaseVariants,
  placeholders: PlaceholderSet,
  logger: Logger
): ReplacementResult => {
  let result = content;
  let totalReplacements = 0;

  // Order matters: replace longer variants first to avoid partial replacements
  const orderedVariants: Array<
    [keyof CaseVariants, keyof PlaceholderSet | null]
  > = [
    ['constantCase', 'constant'],
    ['upperCase', 'upper'],
    ['pascalCase', 'pascal'],
    ['camelCase', 'camel'],
    ['kebabCase', 'kebab'],
    ['snakeCase', 'snake'],
    ['dotCase', 'dot'],
    ['lowerCase', 'lower'],
    ['pathCase', null], // No direct placeholder for pathCase
  ];

  for (const [variantKey, placeholderKey] of orderedVariants) {
    const variant = variants[variantKey];

    // Skip if variant is too short or doesn't exist, or no placeholder mapping
    if (!variant || variant.length < 2 || !placeholderKey) continue;

    const placeholder = placeholders[placeholderKey];

    // Simple string replacement without word boundaries
    const pattern = new RegExp(escapeRegExp(variant), 'g');
    const matches = result.match(pattern);

    if (matches && matches.length > 0) {
      result = result.replace(pattern, placeholder);
      totalReplacements += matches.length;

      if (matches.length > 0) {
        logger.debug(
          `    Replaced ${matches.length} occurrences of "${variant}" with ${placeholder}`
        );
      }
    }
  }

  // Also check for the original symbol if it's different from other variants
  const originalPattern = new RegExp(escapeRegExp(variants.original), 'g');
  const originalMatches = result.match(originalPattern);

  if (originalMatches && originalMatches.length > 0) {
    // Determine the best placeholder based on the original format
    const detectedCase = detectCase(variants.original, variants);
    let placeholder = placeholders.pascal; // Default to pascal

    if (detectedCase) {
      switch (detectedCase.variant) {
        case 'camelCase':
          placeholder = placeholders.camel;
          break;
        case 'pascalCase':
          placeholder = placeholders.pascal;
          break;
        case 'kebabCase':
          placeholder = placeholders.kebab;
          break;
        case 'snakeCase':
          placeholder = placeholders.snake;
          break;
        case 'constantCase':
          placeholder = placeholders.constant;
          break;
        case 'dotCase':
          placeholder = placeholders.dot;
          break;
        case 'lowerCase':
          placeholder = placeholders.lower;
          break;
        case 'upperCase':
          placeholder = placeholders.upper;
          break;
      }
    }

    result = result.replace(originalPattern, placeholder);
    totalReplacements += originalMatches.length;

    if (originalMatches.length > 0) {
      logger.debug(
        `    Replaced ${originalMatches.length} occurrences of original "${variants.original}" with ${placeholder}`
      );
    }
  }

  return {
    content: result,
    replacementCount: totalReplacements,
  };
};

// Replace symbol in path (file/directory names)
export const replaceSymbolInPath = (
  path: string,
  variants: CaseVariants,
  placeholders: PlaceholderSet,
  logger: Logger
): string => {
  // Split path into segments
  const segments = path.split('/');
  const transformedSegments = segments.map((segment) => {
    // Check each variant in the segment
    const variantToPlaceholder: Record<
      keyof CaseVariants,
      keyof PlaceholderSet | null
    > = {
      constantCase: 'constant',
      pascalCase: 'pascal',
      camelCase: 'camel',
      kebabCase: 'kebab',
      snakeCase: 'snake',
      dotCase: 'dot',
      pathCase: null, // pathCase is not supported
      original: null,
      lowerCase: 'lower',
      upperCase: 'upper',
    };

    for (const [variantKey, placeholderKey] of Object.entries(
      variantToPlaceholder
    )) {
      const variant = variants[variantKey as keyof CaseVariants];

      if (!variant || variant.length < 2 || !placeholderKey) continue;

      // Check if segment contains this variant
      if (segment.includes(variant)) {
        const placeholder =
          placeholders[placeholderKey as keyof PlaceholderSet];
        const transformed = segment.replace(
          new RegExp(escapeRegExp(variant), 'g'),
          placeholder
        );

        if (transformed !== segment) {
          logger.debug(`    Path segment "${segment}" -> "${transformed}"`);
        }

        return transformed;
      }
    }

    // Check for original symbol
    if (segment.includes(variants.original)) {
      const detectedCase = detectCase(variants.original, variants);
      let placeholder = placeholders.pascal; // Default to pascal

      if (detectedCase) {
        switch (detectedCase.variant) {
          case 'camelCase':
            placeholder = placeholders.camel;
            break;
          case 'pascalCase':
            placeholder = placeholders.pascal;
            break;
          case 'kebabCase':
            placeholder = placeholders.kebab;
            break;
          case 'snakeCase':
            placeholder = placeholders.snake;
            break;
          case 'constantCase':
            placeholder = placeholders.constant;
            break;
          case 'dotCase':
            placeholder = placeholders.dot;
            break;
          case 'lowerCase':
            placeholder = placeholders.lower;
            break;
          case 'upperCase':
            placeholder = placeholders.upper;
            break;
        }
      }

      const transformed = segment.replace(
        new RegExp(escapeRegExp(variants.original), 'g'),
        placeholder
      );

      if (transformed !== segment) {
        logger.debug(`    Path segment "${segment}" -> "${transformed}"`);
      }

      return transformed;
    }

    return segment;
  });

  return transformedSegments.join('/');
};
