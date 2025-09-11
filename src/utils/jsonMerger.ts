// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

/**
 * Deep merge two objects recursively.
 * Arrays are concatenated and deduplicated.
 * Objects are merged recursively.
 * Primitive values from source override target.
 */
export const deepMergeJson = (target: any, source: any): any => {
  // If source is not an object, return it directly (override)
  if (source === null || typeof source !== 'object') {
    return source;
  }

  // If target is not an object, return source
  if (target === null || typeof target !== 'object') {
    return source;
  }

  // Handle arrays
  if (Array.isArray(source)) {
    if (Array.isArray(target)) {
      // Concatenate and deduplicate arrays
      const merged = [...target, ...source];
      // Simple deduplication for primitive values
      return merged.filter((item, index, self) => {
        if (typeof item === 'object' && item !== null) {
          // For objects, keep all (no deduplication)
          return true;
        }
        // For primitives, keep only first occurrence
        return self.indexOf(item) === index;
      });
    }
    return source;
  }

  // Handle objects
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (key in result) {
        // Recursively merge if both values are objects
        if (
          typeof result[key] === 'object' &&
          result[key] !== null &&
          typeof source[key] === 'object' &&
          source[key] !== null &&
          !Array.isArray(result[key]) &&
          !Array.isArray(source[key])
        ) {
          result[key] = deepMergeJson(result[key], source[key]);
        } else {
          // Otherwise, source overrides target
          result[key] = deepMergeJson(result[key], source[key]);
        }
      } else {
        // Key doesn't exist in target, add it
        result[key] = source[key];
      }
    }
  }

  return result;
};

/**
 * Merge package.json objects with special handling for common fields
 */
export const mergePackageJson = (
  template: Record<string, any>,
  override: Record<string, any>
): Record<string, any> => {
  // Special handling for dependencies-like fields
  const dependencyFields = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ];

  const result = { ...template };

  for (const key in override) {
    if (Object.prototype.hasOwnProperty.call(override, key)) {
      if (dependencyFields.includes(key)) {
        // For dependency fields, merge objects directly (no array handling)
        result[key] = {
          ...(result[key] || {}),
          ...override[key],
        };
      } else if (key === 'scripts') {
        // For scripts, merge objects directly
        result[key] = {
          ...(result[key] || {}),
          ...override[key],
        };
      } else {
        // For other fields, use deep merge
        result[key] = deepMergeJson(result[key], override[key]);
      }
    }
  }

  return result;
};
