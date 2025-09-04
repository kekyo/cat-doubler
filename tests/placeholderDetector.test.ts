// cat-doubler - Convert any project into a lightweight template generator
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { describe, it, expect } from 'vitest';
import { findSafePlaceholders } from '../src/converter/placeholderDetector';
import { ScannedFile } from '../src/scanner/fileScanner';
import { createMockLogger } from './helpers/mockLogger';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';

describe('placeholderDetector', () => {
  const mockLogger = createMockLogger();
  const testDir = join(process.cwd(), 'test-temp-placeholder');

  // Helper to create test files
  const createTestFile = async (
    relativePath: string,
    content: string
  ): Promise<ScannedFile> => {
    const fullPath = join(testDir, relativePath);
    await mkdir(join(fullPath, '..'), { recursive: true });
    await writeFile(fullPath, content);

    return {
      relativePath,
      absolutePath: fullPath,
      isDirectory: false,
      requiresTemplating: true,
      isTextFile: true,
    };
  };

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  it('should generate 8 placeholder types with suffix 1 when no collisions', async () => {
    const files: ScannedFile[] = [
      await createTestFile('src/app.js', 'const app = "MyApp";'),
      await createTestFile('src/config.json', '{"name": "MyApp"}'),
    ];

    const placeholders = await findSafePlaceholders(files, mockLogger);

    expect(placeholders.camel).toBe('__camel1__');
    expect(placeholders.pascal).toBe('__pascal1__');
    expect(placeholders.kebab).toBe('__kebab1__');
    expect(placeholders.snake).toBe('__snake1__');
    expect(placeholders.constant).toBe('__constant1__');
    expect(placeholders.dot).toBe('__dot1__');
    expect(placeholders.lower).toBe('__lower1__');
    expect(placeholders.upper).toBe('__upper1__');
  });

  it('should increment suffix when placeholders already exist in content', async () => {
    const files: ScannedFile[] = [
      await createTestFile(
        'src/template.js',
        `
        const placeholder = '__pascal1__';
        const another = '__camel1__';
        const kebab = '__kebab1__';
      `
      ),
      await createTestFile('src/app.js', 'const app = "MyApp";'),
    ];

    const placeholders = await findSafePlaceholders(files, mockLogger);

    // Should use suffix 2 due to collision
    expect(placeholders.camel).toBe('__camel2__');
    expect(placeholders.pascal).toBe('__pascal2__');
    expect(placeholders.kebab).toBe('__kebab2__');
    expect(placeholders.snake).toBe('__snake2__');
    expect(placeholders.constant).toBe('__constant2__');
    expect(placeholders.dot).toBe('__dot2__');
    expect(placeholders.lower).toBe('__lower2__');
    expect(placeholders.upper).toBe('__upper2__');
  });

  it('should detect collisions in file paths', async () => {
    const files: ScannedFile[] = [
      {
        relativePath: '__pascal1__/app.js',
        absolutePath: join(testDir, '__pascal1__/app.js'),
        isDirectory: false,
        requiresTemplating: true,
        isTextFile: true,
      },
      await createTestFile('src/app.js', 'const app = "MyApp";'),
    ];

    const placeholders = await findSafePlaceholders(files, mockLogger);

    // Should use suffix 2 because __pascal1__ is in the path
    expect(placeholders.pascal).toBe('__pascal2__');
    expect(placeholders.camel).toBe('__camel2__');
  });

  it('should handle multiple collision levels', async () => {
    const files: ScannedFile[] = [
      await createTestFile(
        'src/template1.js',
        `
        const p1 = '__pascal1__';
        const p2 = '__pascal2__';
        const p3 = '__pascal3__';
      `
      ),
      await createTestFile(
        'src/template2.js',
        `
        const c1 = '__camel1__';
        const c2 = '__camel2__';
        const c3 = '__camel3__';
      `
      ),
    ];

    const placeholders = await findSafePlaceholders(files, mockLogger);

    // Should use suffix 4 to avoid all collisions
    expect(placeholders.pascal).toBe('__pascal4__');
    expect(placeholders.camel).toBe('__camel4__');
    expect(placeholders.kebab).toBe('__kebab4__');
    expect(placeholders.snake).toBe('__snake4__');
    expect(placeholders.constant).toBe('__constant4__');
    expect(placeholders.dot).toBe('__dot4__');
    expect(placeholders.lower).toBe('__lower4__');
    expect(placeholders.upper).toBe('__upper4__');
  });

  it('should detect placeholders in directory names', async () => {
    const files: ScannedFile[] = [
      {
        relativePath: 'src/__kebab1__/__snake1__',
        absolutePath: join(testDir, 'src/__kebab1__/__snake1__'),
        isDirectory: true,
        requiresTemplating: false,
        isTextFile: false,
      },
      await createTestFile('src/app.js', 'const app = "MyApp";'),
    ];

    const placeholders = await findSafePlaceholders(files, mockLogger);

    // Should detect collision in directory paths
    expect(placeholders.kebab).toBe('__kebab2__');
    expect(placeholders.snake).toBe('__snake2__');

    // Others should remain at suffix 2 (all must have same suffix)
    expect(placeholders.pascal).toBe('__pascal2__');
    expect(placeholders.camel).toBe('__camel2__');
  });

  it('should handle all 8 placeholder types in collision detection', async () => {
    const files: ScannedFile[] = [
      await createTestFile(
        'src/collisions.js',
        `
        const existing = {
          camel: '__camel1__',
          pascal: '__pascal1__',
          kebab: '__kebab1__',
          snake: '__snake1__',
          constant: '__constant1__',
          dot: '__dot1__',
          lower: '__lower1__',
          upper: '__upper1__'
        };
      `
      ),
    ];

    const placeholders = await findSafePlaceholders(files, mockLogger);

    // All should use suffix 2
    expect(placeholders.camel).toBe('__camel2__');
    expect(placeholders.pascal).toBe('__pascal2__');
    expect(placeholders.kebab).toBe('__kebab2__');
    expect(placeholders.snake).toBe('__snake2__');
    expect(placeholders.constant).toBe('__constant2__');
    expect(placeholders.dot).toBe('__dot2__');
    expect(placeholders.lower).toBe('__lower2__');
    expect(placeholders.upper).toBe('__upper2__');
  });

  it('should skip non-templatable files for content scanning', async () => {
    const files: ScannedFile[] = [
      {
        relativePath: 'src/image.png',
        absolutePath: join(testDir, 'src/image.png'),
        isDirectory: false,
        requiresTemplating: false, // Binary file
        isTextFile: false,
      },
      await createTestFile('src/app.js', 'const app = "MyApp";'),
    ];

    const placeholders = await findSafePlaceholders(files, mockLogger);

    // Should use suffix 1 (binary file content is not scanned)
    expect(placeholders.camel).toBe('__camel1__');
    expect(placeholders.pascal).toBe('__pascal1__');
  });

  it('should handle special characters in paths gracefully', async () => {
    const files: ScannedFile[] = [
      {
        relativePath: 'src/special-chars/@scope/package-name',
        absolutePath: join(testDir, 'src/special-chars/@scope/package-name'),
        isDirectory: true,
        requiresTemplating: false,
        isTextFile: false,
      },
      await createTestFile('src/app.js', 'const app = "MyApp";'),
    ];

    const placeholders = await findSafePlaceholders(files, mockLogger);

    // Should handle without errors
    expect(placeholders.camel).toBe('__camel1__');
    expect(placeholders.pascal).toBe('__pascal1__');
    expect(placeholders.kebab).toBe('__kebab1__');
    expect(placeholders.snake).toBe('__snake1__');
    expect(placeholders.constant).toBe('__constant1__');
    expect(placeholders.dot).toBe('__dot1__');
    expect(placeholders.lower).toBe('__lower1__');
    expect(placeholders.upper).toBe('__upper1__');
  });
});
