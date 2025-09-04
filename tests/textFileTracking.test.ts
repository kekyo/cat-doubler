// cat-doubler - Convert any project into a lightweight template generator
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { describe, it, expect } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { scanDirectory } from '../src/scanner/fileScanner';
import { findSafePlaceholders } from '../src/converter/placeholderDetector';
import { replaceSymbolInPath } from '../src/converter/symbolReplacer';
import { generateCaseVariants } from '../src/utils/caseUtils';
import { createMockLogger } from './helpers/mockLogger';

describe('Text file tracking with placeholders', () => {
  const mockLogger = createMockLogger();
  const testDir = join(process.cwd(), 'test-temp-text-tracking');

  // Helper to create test file structure
  const createTestStructure = async () => {
    // Create directories
    await mkdir(join(testDir, 'src', 'FooBarApp'), { recursive: true });
    await mkdir(join(testDir, 'src', 'foo-bar-app'), { recursive: true });
    await mkdir(join(testDir, 'tests', 'foo_bar_app'), { recursive: true });
    await mkdir(join(testDir, 'docs', 'foo.bar.app'), { recursive: true });
    await mkdir(join(testDir, 'assets'), { recursive: true });

    // Create text files with various naming patterns
    await writeFile(
      join(testDir, 'src', 'FooBarApp', 'index.ts'),
      'export class FooBarApp { }'
    );
    await writeFile(
      join(testDir, 'src', 'foo-bar-app', 'config.json'),
      '{"name": "foo-bar-app"}'
    );
    await writeFile(
      join(testDir, 'tests', 'foo_bar_app', 'test.js'),
      'describe("foo_bar_app", () => {});'
    );
    await writeFile(
      join(testDir, 'docs', 'foo.bar.app', 'readme.md'),
      '# foo.bar.app Documentation'
    );
    await writeFile(join(testDir, 'LICENSE'), 'MIT License');
    await writeFile(join(testDir, 'Makefile'), 'build:\n\t@echo "Building..."');

    // Create binary files
    await writeFile(
      join(testDir, 'assets', 'logo.png'),
      Buffer.from([0x89, 0x50, 0x4e, 0x47]) // PNG header
    );
    await writeFile(
      join(testDir, 'src', 'FooBarApp', 'data.bin'),
      Buffer.from([0x00, 0x01, 0x02, 0x03])
    );
  };

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  });

  it('should track text files with placeholder-replaced paths', async () => {
    await createTestStructure();

    // Scan files
    const files = await scanDirectory(
      testDir,
      undefined,
      undefined,
      mockLogger
    );
    const caseVariants = generateCaseVariants('FooBarApp');
    const placeholders = await findSafePlaceholders(files, mockLogger);

    // Collect text file paths with placeholders (similar to templateConverter)
    const textFilePaths: string[] = [];
    for (const file of files) {
      if (!file.isDirectory && file.isTextFile) {
        const templateRelativePath = replaceSymbolInPath(
          file.relativePath,
          caseVariants,
          placeholders,
          mockLogger
        );
        textFilePaths.push(templateRelativePath);
      }
    }

    // Verify expected paths with placeholders
    expect(textFilePaths).toContain('src/__pascal1__/index.ts');
    expect(textFilePaths).toContain('src/__kebab1__/config.json');
    expect(textFilePaths).toContain('tests/__snake1__/test.js');
    expect(textFilePaths).toContain('docs/__dot1__/readme.md');
    expect(textFilePaths).toContain('LICENSE');
    expect(textFilePaths).toContain('Makefile');

    // Verify binary files are NOT included
    expect(textFilePaths).not.toContain('assets/logo.png');
    expect(textFilePaths).not.toContain('src/__pascal1__/data.bin');
  });

  it('should handle nested directories with multiple placeholder types', async () => {
    // Create nested structure
    await mkdir(
      join(testDir, 'src', 'FooBarApp', 'foo_bar_app', 'foo-bar-app'),
      { recursive: true }
    );
    await writeFile(
      join(
        testDir,
        'src',
        'FooBarApp',
        'foo_bar_app',
        'foo-bar-app',
        'config.yaml'
      ),
      'name: FooBarApp'
    );

    const files = await scanDirectory(
      testDir,
      undefined,
      undefined,
      mockLogger
    );
    const caseVariants = generateCaseVariants('FooBarApp');
    const placeholders = await findSafePlaceholders(files, mockLogger);

    // Find the nested file
    const nestedFile = files.find(
      (f) =>
        !f.isDirectory &&
        f.relativePath.includes('FooBarApp') &&
        f.relativePath.includes('foo_bar_app') &&
        f.relativePath.includes('config.yaml')
    );

    expect(nestedFile).toBeDefined();

    // Check the path transformation
    const templatePath = replaceSymbolInPath(
      nestedFile!.relativePath,
      caseVariants,
      placeholders,
      mockLogger
    );

    expect(templatePath).toBe(
      'src/__pascal1__/__snake1__/__kebab1__/config.yaml'
    );
  });

  it('should correctly identify binary files', async () => {
    await mkdir(testDir, { recursive: true });

    // Create various binary files
    await writeFile(
      join(testDir, 'image.jpg'),
      Buffer.from([0xff, 0xd8, 0xff]) // JPEG header
    );
    await writeFile(join(testDir, 'archive.zip'), Buffer.from([0x50, 0x4b])); // ZIP header
    await writeFile(
      join(testDir, 'document.pdf'),
      Buffer.from([0x25, 0x50, 0x44, 0x46]) // PDF header
    );

    const files = await scanDirectory(
      testDir,
      undefined,
      undefined,
      mockLogger
    );

    // All binary files should NOT be text files
    const binaryFiles = files.filter(
      (f) => !f.isDirectory && f.relativePath.match(/\.(jpg|zip|pdf)$/)
    );

    binaryFiles.forEach((file) => {
      expect(file.isTextFile).toBe(false);
      expect(file.requiresTemplating).toBe(false);
    });
  });

  it('should handle files without extensions correctly', async () => {
    await mkdir(testDir, { recursive: true });

    // Create files without extensions
    await writeFile(join(testDir, 'README'), '# Project README');
    await writeFile(join(testDir, 'LICENSE'), 'MIT License');
    await writeFile(join(testDir, 'Dockerfile'), 'FROM node:18');
    await writeFile(join(testDir, 'randomfile'), 'Some content'); // Not in TEXT_FILENAMES

    const files = await scanDirectory(
      testDir,
      undefined,
      undefined,
      mockLogger
    );

    // Check known text files without extensions
    const readme = files.find((f) => f.relativePath === 'README');
    const license = files.find((f) => f.relativePath === 'LICENSE');
    const dockerfile = files.find((f) => f.relativePath === 'Dockerfile');
    const randomFile = files.find((f) => f.relativePath === 'randomfile');

    expect(readme?.isTextFile).toBe(true);
    expect(license?.isTextFile).toBe(true);
    expect(dockerfile?.isTextFile).toBe(true);
    expect(randomFile?.isTextFile).toBe(false); // Not in TEXT_FILENAMES
  });

  it('should preserve directory structure in placeholder paths', async () => {
    // Create complex directory structure
    await mkdir(join(testDir, 'packages', 'foo-bar-app', 'src'), {
      recursive: true,
    });
    await mkdir(join(testDir, 'apps', 'FooBarApp', 'tests'), {
      recursive: true,
    });

    await writeFile(
      join(testDir, 'packages', 'foo-bar-app', 'src', 'index.js'),
      'export default {};'
    );
    await writeFile(
      join(testDir, 'apps', 'FooBarApp', 'tests', 'app.test.ts'),
      'test("app", () => {});'
    );

    const files = await scanDirectory(
      testDir,
      undefined,
      undefined,
      mockLogger
    );
    const caseVariants = generateCaseVariants('FooBarApp');
    const placeholders = await findSafePlaceholders(files, mockLogger);

    const textFilePaths: string[] = [];
    for (const file of files) {
      if (!file.isDirectory && file.isTextFile) {
        const templateRelativePath = replaceSymbolInPath(
          file.relativePath,
          caseVariants,
          placeholders,
          mockLogger
        );
        textFilePaths.push(templateRelativePath);
      }
    }

    // Check that directory structure is preserved
    expect(textFilePaths).toContain('packages/__kebab1__/src/index.js');
    expect(textFilePaths).toContain('apps/__pascal1__/tests/app.test.ts');
  });

  it('should handle all supported text file extensions', async () => {
    await mkdir(join(testDir, 'test-extensions'), { recursive: true });

    // Test a sample of different extensions
    const testFiles = [
      { path: 'script.py', content: 'print("hello")' },
      { path: 'style.scss', content: '.class { color: red; }' },
      { path: 'data.xml', content: '<root></root>' },
      { path: 'config.toml', content: 'key = "value"' },
      { path: 'main.go', content: 'package main' },
      { path: 'app.rb', content: 'puts "hello"' },
      { path: 'index.php', content: '<?php echo "hello"; ?>' },
      { path: 'build.rs', content: 'fn main() {}' },
    ];

    for (const { path, content } of testFiles) {
      await writeFile(join(testDir, 'test-extensions', path), content);
    }

    const files = await scanDirectory(
      testDir,
      undefined,
      undefined,
      mockLogger
    );

    // All should be identified as text files
    const textFiles = files.filter(
      (f) => !f.isDirectory && f.relativePath.startsWith('test-extensions')
    );

    textFiles.forEach((file) => {
      expect(file.isTextFile).toBe(true);
      expect(file.requiresTemplating).toBe(true);
    });
  });
});
