// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import {
  camelCase,
  constantCase,
  dotCase,
  kebabCase,
  pascalCase,
  pathCase,
  snakeCase,
} from 'change-case';

export interface CaseVariants {
  original: string;
  camelCase: string;
  pascalCase: string;
  kebabCase: string;
  snakeCase: string;
  constantCase: string;
  dotCase: string;
  pathCase: string;
  lowerCase: string;
  upperCase: string;
}

export const generateCaseVariants = (symbolName: string): CaseVariants => {
  return {
    original: symbolName,
    camelCase: camelCase(symbolName),
    pascalCase: pascalCase(symbolName),
    kebabCase: kebabCase(symbolName),
    snakeCase: snakeCase(symbolName),
    constantCase: constantCase(symbolName),
    dotCase: dotCase(symbolName),
    pathCase: pathCase(symbolName),
    lowerCase: symbolName.toLowerCase(),
    upperCase: symbolName.toUpperCase(),
  };
};

// Helper to escape string for use in RegExp
export const escapeRegExp = (str: string): string => {
  if (!str) return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Check if a string likely contains the symbol in any case variant
export const containsSymbol = (
  text: string,
  variants: CaseVariants
): boolean => {
  const variantsToCheck = [
    variants.original,
    variants.camelCase,
    variants.pascalCase,
    variants.kebabCase,
    variants.snakeCase,
    variants.constantCase,
    variants.dotCase,
    variants.pathCase,
    variants.lowerCase,
    variants.upperCase,
  ];

  return variantsToCheck.some(
    (variant) => variant.length > 2 && text.includes(variant)
  );
};
