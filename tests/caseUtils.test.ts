// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { describe, it, expect } from 'vitest';
import {
  generateCaseVariants,
  escapeRegExp,
  containsSymbol,
} from '../src/utils/caseUtils';

describe('caseUtils', () => {
  describe('generateCaseVariants', () => {
    it('should generate all case variants from PascalCase', () => {
      const result = generateCaseVariants('FooBarApp');

      expect(result.original).toBe('FooBarApp');
      expect(result.camelCase).toBe('fooBarApp');
      expect(result.pascalCase).toBe('FooBarApp');
      expect(result.kebabCase).toBe('foo-bar-app');
      expect(result.snakeCase).toBe('foo_bar_app');
      expect(result.constantCase).toBe('FOO_BAR_APP');
      expect(result.dotCase).toBe('foo.bar.app');
      expect(result.pathCase).toBe('foo/bar/app');
      expect(result.lowerCase).toBe('foobarapp');
      expect(result.upperCase).toBe('FOOBARAPP');
    });

    it('should generate all case variants from camelCase', () => {
      const result = generateCaseVariants('myProjectName');

      expect(result.original).toBe('myProjectName');
      expect(result.camelCase).toBe('myProjectName');
      expect(result.pascalCase).toBe('MyProjectName');
      expect(result.kebabCase).toBe('my-project-name');
      expect(result.snakeCase).toBe('my_project_name');
      expect(result.constantCase).toBe('MY_PROJECT_NAME');
    });

    it('should generate all case variants from kebab-case', () => {
      const result = generateCaseVariants('my-awesome-project');

      expect(result.original).toBe('my-awesome-project');
      expect(result.camelCase).toBe('myAwesomeProject');
      expect(result.pascalCase).toBe('MyAwesomeProject');
      expect(result.kebabCase).toBe('my-awesome-project');
      expect(result.snakeCase).toBe('my_awesome_project');
      expect(result.constantCase).toBe('MY_AWESOME_PROJECT');
    });

    it('should handle single word', () => {
      const result = generateCaseVariants('Test');

      expect(result.original).toBe('Test');
      expect(result.camelCase).toBe('test');
      expect(result.pascalCase).toBe('Test');
      expect(result.kebabCase).toBe('test');
      expect(result.snakeCase).toBe('test');
      expect(result.constantCase).toBe('TEST');
    });
  });

  describe('escapeRegExp', () => {
    it('should escape special regex characters', () => {
      const input = 'foo.bar[test]$end^start(group)';
      const result = escapeRegExp(input);

      expect(result).toBe('foo\\.bar\\[test\\]\\$end\\^start\\(group\\)');
    });

    it('should handle string without special characters', () => {
      const input = 'FooBarApp';
      const result = escapeRegExp(input);

      expect(result).toBe('FooBarApp');
    });
  });

  describe('containsSymbol', () => {
    it('should detect symbol in text', () => {
      const variants = generateCaseVariants('FooBarApp');

      expect(containsSymbol('class FooBarApp extends', variants)).toBe(true);
      expect(containsSymbol('const fooBarApp = new', variants)).toBe(true);
      expect(containsSymbol('foo-bar-app.config.js', variants)).toBe(true);
      expect(containsSymbol('FOO_BAR_APP_VERSION', variants)).toBe(true);
    });

    it('should not detect when symbol is not present', () => {
      const variants = generateCaseVariants('FooBarApp');

      expect(containsSymbol('class SomethingElse extends', variants)).toBe(
        false
      );
      expect(containsSymbol('const myOtherApp = new', variants)).toBe(false);
    });

    it('should ignore very short variants', () => {
      const variants = generateCaseVariants('Ab');

      // Should still check variants with length > 2
      expect(containsSymbol('class Ab extends', variants)).toBe(false);
    });
  });
});
