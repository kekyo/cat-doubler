// cat-doubler - Convert any project into a lightweight template generator
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { describe, it, expect } from 'vitest';
import {
  replaceSymbolInContent,
  replaceSymbolInPath,
} from '../src/converter/symbolReplacer';
import { PlaceholderSet } from '../src/converter/placeholderDetector';
import { generateCaseVariants } from '../src/utils/caseUtils';
import { createMockLogger } from './helpers/mockLogger';

describe('symbolReplacer', () => {
  const mockLogger = createMockLogger();

  // Default placeholder set for testing
  const placeholders: PlaceholderSet = {
    camel: '__camel1__',
    pascal: '__pascal1__',
    kebab: '__kebab1__',
    snake: '__snake1__',
    constant: '__constant1__',
    dot: '__dot1__',
    lower: '__lower1__',
    upper: '__upper1__',
  };

  describe('replaceSymbolInContent', () => {
    it('should replace PascalCase symbols in content', () => {
      const content = `import { FooBarApp } from './FooBarApp';
      
class FooBarAppController extends FooBarApp {
  constructor() {
    super('FooBarApp');
  }
}`;

      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInContent(
        content,
        variants,
        placeholders,
        mockLogger
      );

      expect(result.content).toContain('__pascal1__');
      expect(result.replacementCount).toBeGreaterThan(0);
      // All FooBarApp occurrences should be replaced
      expect(result.content).not.toContain('FooBarApp');
    });

    it('should replace camelCase symbols in content', () => {
      const content = `const fooBarApp = new Application();
export default fooBarApp;`;

      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInContent(
        content,
        variants,
        placeholders,
        mockLogger
      );

      expect(result.content).toContain('__camel1__');
      expect(result.replacementCount).toBe(2);
      expect(result.content).not.toContain('fooBarApp');
    });

    it('should replace kebab-case symbols in content', () => {
      const content = `{
  "name": "foo-bar-app",
  "bin": {
    "foo-bar-app": "./bin/cli.js"
  }
}`;

      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInContent(
        content,
        variants,
        placeholders,
        mockLogger
      );

      expect(result.content).toContain('__kebab1__');
      expect(result.replacementCount).toBe(2);
      expect(result.content).not.toContain('foo-bar-app');
    });

    it('should replace snake_case symbols in content', () => {
      const content = `const foo_bar_app_config = {
  name: 'foo_bar_app'
};`;

      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInContent(
        content,
        variants,
        placeholders,
        mockLogger
      );

      expect(result.content).toContain('__snake1__');
      expect(result.replacementCount).toBe(2);
      expect(result.content).not.toContain('foo_bar_app');
    });

    it('should handle multiple case variants in same content', () => {
      const content = `import { FooBarApp } from './FooBarApp';

const fooBarApp = new FooBarApp();
const FOO_BAR_APP = 'foo-bar-app';
console.log(foo_bar_app);`;

      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInContent(
        content,
        variants,
        placeholders,
        mockLogger
      );

      expect(result.content).toContain('__pascal1__');
      expect(result.content).toContain('__camel1__');
      expect(result.content).toContain('__constant1__');
      expect(result.content).toContain('__kebab1__');
      expect(result.content).toContain('__snake1__');
      expect(result.replacementCount).toBeGreaterThan(4);
    });

    it('should replace all occurrences including partial matches', () => {
      const content = `const MyFooBarApp = 'test';
const FooBarAppExtended = 'test';
const preFooBarApp = 'test';`;

      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInContent(
        content,
        variants,
        placeholders,
        mockLogger
      );

      // With simple replacement, these will be partially replaced
      expect(result.content).toContain('My__pascal1__');
      expect(result.content).toContain('__pascal1__Extended');
      expect(result.content).toContain('pre__pascal1__'); // PascalCase is processed first
      expect(result.replacementCount).toBe(3);
    });

    it('should replace dot.case symbols in content', () => {
      const content = `const config = {
  package: 'foo.bar.app',
  import: 'foo.bar.app.module'
};`;

      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInContent(
        content,
        variants,
        placeholders,
        mockLogger
      );

      expect(result.content).toContain('__dot1__');
      expect(result.content).toContain('__dot1__.module');
      expect(result.replacementCount).toBe(2);
      expect(result.content).not.toContain('foo.bar.app');
    });

    it('should replace lowercase symbols in content', () => {
      const content = `const id = 'foobarapp';
const key = 'foobarapp_key';`;

      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInContent(
        content,
        variants,
        placeholders,
        mockLogger
      );

      expect(result.content).toContain('__lower1__');
      expect(result.content).toContain('__lower1___key');
      expect(result.replacementCount).toBe(2);
      expect(result.content).not.toContain('foobarapp');
    });

    it('should replace UPPERCASE symbols in content', () => {
      const content = `const ID = 'FOOBARAPP';
const PREFIX = 'FOOBARAPP_';`;

      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInContent(
        content,
        variants,
        placeholders,
        mockLogger
      );

      expect(result.content).toContain('__upper1__');
      expect(result.content).toContain('__upper1___');
      expect(result.replacementCount).toBe(2);
      expect(result.content).not.toContain('FOOBARAPP');
    });

    it('should handle all 8 case variants in same content', () => {
      const content = `// Test all case formats
const FooBarApp = 'FooBarApp';      // PascalCase
const fooBarApp = 'fooBarApp';      // camelCase
const FOO_BAR_APP = 'FOO_BAR_APP';  // CONSTANT_CASE
const foo_bar_app = 'foo_bar_app';  // snake_case
const foobarapp = 'foobarapp';      // lowercase
const FOOBARAPP = 'FOOBARAPP';      // UPPERCASE
const name = 'foo-bar-app';         // kebab-case
const dotted = 'foo.bar.app';       // dot.case`;

      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInContent(
        content,
        variants,
        placeholders,
        mockLogger
      );

      expect(result.content).toContain('__pascal1__');
      expect(result.content).toContain('__camel1__');
      expect(result.content).toContain('__constant1__');
      expect(result.content).toContain('__snake1__');
      expect(result.content).toContain('__lower1__');
      expect(result.content).toContain('__upper1__');
      expect(result.content).toContain('__kebab1__');
      expect(result.content).toContain('__dot1__');

      // All original case variants should be replaced
      expect(result.content).not.toContain('FooBarApp');
      expect(result.content).not.toContain('fooBarApp');
      expect(result.content).not.toContain('FOO_BAR_APP');
      expect(result.content).not.toContain('foo_bar_app');
      expect(result.content).not.toContain('foobarapp');
      expect(result.content).not.toContain('FOOBARAPP');
      expect(result.content).not.toContain('foo-bar-app');
      expect(result.content).not.toContain('foo.bar.app');

      expect(result.replacementCount).toBe(14); // Some are replaced as part of others due to ordering
    });
  });

  describe('replaceSymbolInPath', () => {
    it('should replace symbols in file paths', () => {
      const path = 'src/FooBarApp/FooBarApp.ts';
      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInPath(
        path,
        variants,
        placeholders,
        mockLogger
      );

      expect(result).toBe('src/__pascal1__/__pascal1__.ts');
    });

    it('should replace kebab-case in paths', () => {
      const path = 'packages/foo-bar-app/src/index.ts';
      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInPath(
        path,
        variants,
        placeholders,
        mockLogger
      );

      expect(result).toBe('packages/__kebab1__/src/index.ts');
    });

    it('should replace snake_case in paths', () => {
      const path = 'test/foo_bar_app_test.js';
      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInPath(
        path,
        variants,
        placeholders,
        mockLogger
      );

      expect(result).toBe('test/__snake1___test.js');
    });

    it('should handle mixed cases in same path', () => {
      const path = 'src/FooBarApp/foo-bar-app-config.json';
      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInPath(
        path,
        variants,
        placeholders,
        mockLogger
      );

      expect(result).toBe('src/__pascal1__/__kebab1__-config.json');
    });

    it('should not replace when symbol is not in path', () => {
      const path = 'src/components/Button.tsx';
      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInPath(
        path,
        variants,
        placeholders,
        mockLogger
      );

      expect(result).toBe('src/components/Button.tsx');
    });

    it('should replace dot.case in paths', () => {
      const path = 'modules/foo.bar.app/index.ts';
      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInPath(
        path,
        variants,
        placeholders,
        mockLogger
      );

      expect(result).toBe('modules/__dot1__/index.ts');
    });

    it('should replace lowercase in paths', () => {
      const path = 'dist/foobarapp.min.js';
      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInPath(
        path,
        variants,
        placeholders,
        mockLogger
      );

      expect(result).toBe('dist/__lower1__.min.js');
    });

    it('should replace UPPERCASE in paths', () => {
      const path = 'constants/FOOBARAPP/config.json';
      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInPath(
        path,
        variants,
        placeholders,
        mockLogger
      );

      expect(result).toBe('constants/__upper1__/config.json');
    });

    it('should handle all case types in complex paths', () => {
      const path =
        'src/FooBarApp/foo-bar-app/foo_bar_app/foo.bar.app/foobarapp/FOOBARAPP.ts';
      const variants = generateCaseVariants('FooBarApp');
      const result = replaceSymbolInPath(
        path,
        variants,
        placeholders,
        mockLogger
      );

      expect(result).toBe(
        'src/__pascal1__/__kebab1__/__snake1__/__dot1__/__lower1__/__upper1__.ts'
      );
    });
  });
});
