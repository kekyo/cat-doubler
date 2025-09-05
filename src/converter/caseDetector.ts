// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { CaseVariants } from '../utils/caseUtils';

export interface DetectedCase {
  variant: keyof CaseVariants;
  value: string;
  handlebarsHelper: string;
}

// Detect which case variant a string matches
export const detectCase = (
  str: string,
  variants: CaseVariants
): DetectedCase | undefined => {
  // Check each variant in priority order
  const checks: Array<[keyof CaseVariants, string]> = [
    ['constantCase', 'constantCase'],
    ['pascalCase', 'pascalCase'],
    ['camelCase', 'camelCase'],
    ['kebabCase', 'kebabCase'],
    ['snakeCase', 'snakeCase'],
    ['dotCase', 'dotCase'],
    ['pathCase', 'pathCase'],
    ['upperCase', 'constantCase'], // Use constantCase helper for uppercase
    ['lowerCase', 'lowerCase'],
    ['original', 'pascalCase'], // Default to pascalCase for original
  ];

  for (const [variantKey, helperName] of checks) {
    if (str === variants[variantKey]) {
      return {
        variant: variantKey,
        value: str,
        handlebarsHelper: helperName,
      };
    }
  }

  return undefined;
};

// Create a regex pattern that matches any case variant of the symbol
export const createSymbolPattern = (variants: CaseVariants): RegExp => {
  // Sort variants by length (longest first) to prevent partial matches
  const variantValues = Object.values(variants)
    .filter((v) => v.length > 2) // Skip very short variants
    .sort((a, b) => b.length - a.length);

  // Escape special regex characters and join with |
  const pattern = variantValues
    .map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  return new RegExp(`\\b(${pattern})\\b`, 'g');
};
