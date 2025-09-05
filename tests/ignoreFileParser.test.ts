// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { createTestDirectory } from './helpers/testHelper';
import {
  createIgnoreManager,
  parseIgnoreFile,
} from '../src/utils/ignoreFileParser';
import { createMockLogger } from './helpers/mockLogger';

describe('Ignore File Parser', () => {
  let testDir: string;
  const mockLogger = createMockLogger();

  beforeEach(async (fn) => {
    testDir = await createTestDirectory('ignore-parser', fn.task.name);
  });

  describe('createIgnoreManager', () => {
    it('should use default patterns when no ignore file exists', async () => {
      const manager = await createIgnoreManager(undefined, testDir, mockLogger);

      // Check default patterns
      expect(
        manager.isIgnored(join(testDir, 'node_modules', 'something.js'))
      ).toBe(true);
      expect(manager.isIgnored(join(testDir, '.git', 'HEAD'))).toBe(true);
      expect(manager.isIgnored(join(testDir, 'dist', 'index.js'))).toBe(true);
      expect(manager.isIgnored(join(testDir, 'build', 'output.js'))).toBe(true);

      // Should not ignore regular files
      expect(manager.isIgnored(join(testDir, 'src', 'index.js'))).toBe(false);
      expect(manager.isIgnored(join(testDir, 'README.md'))).toBe(false);
    });

    it('should load patterns from .catdoublerignore', async () => {
      // Create ignore file
      await writeFile(
        join(testDir, '.catdoublerignore'),
        `# Test ignore file
*.log
temp/
!important.log
src/**/*.test.js
`
      );

      const manager = await createIgnoreManager(undefined, testDir, mockLogger);

      // Test custom patterns
      expect(manager.isIgnored(join(testDir, 'debug.log'))).toBe(true);
      expect(manager.isIgnored(join(testDir, 'temp', 'file.txt'))).toBe(true);
      expect(manager.isIgnored(join(testDir, 'important.log'))).toBe(false); // Negated
      expect(
        manager.isIgnored(join(testDir, 'src', 'utils', 'helper.test.js'))
      ).toBe(true);
      expect(
        manager.isIgnored(join(testDir, 'src', 'utils', 'helper.js'))
      ).toBe(false);

      // Default patterns are NOT inherited when custom ignore file exists
      // (This is standard .gitignore behavior)
      expect(
        manager.isIgnored(join(testDir, 'node_modules', 'package.json'))
      ).toBe(false);
    });

    it('should load patterns from custom ignore file path', async () => {
      const customIgnorePath = join(testDir, 'custom.ignore');
      await writeFile(
        customIgnorePath,
        `# Custom ignore
*.tmp
cache/
`
      );

      const manager = await createIgnoreManager(
        customIgnorePath,
        testDir,
        mockLogger
      );

      expect(manager.isIgnored(join(testDir, 'file.tmp'))).toBe(true);
      expect(manager.isIgnored(join(testDir, 'cache', 'data.json'))).toBe(true);
      expect(manager.isIgnored(join(testDir, 'file.txt'))).toBe(false);
    });

    it('should throw error when specified ignore file does not exist', async () => {
      const nonExistentPath = join(testDir, 'nonexistent.ignore');

      await expect(
        createIgnoreManager(nonExistentPath, testDir, mockLogger)
      ).rejects.toThrow('Specified ignore file not found');
    });

    it('should handle complex gitignore patterns', async () => {
      await writeFile(
        join(testDir, '.catdoublerignore'),
        `# Complex patterns
# Ignore all .txt files in root
/*.txt

# But not in subdirectories
!subdirs/**/*.txt

# Ignore all files starting with underscore
_*

# Ignore specific directory and its contents
private/

# Ignore files with specific extensions anywhere
**/*.bak
**/*.swp

# Pattern with brackets
[Tt]emp*
`
      );

      const manager = await createIgnoreManager(undefined, testDir, mockLogger);

      // Root level .txt files
      expect(manager.isIgnored(join(testDir, 'file.txt'))).toBe(true);
      expect(manager.isIgnored(join(testDir, 'subdirs', 'file.txt'))).toBe(
        false
      );

      // Underscore files
      expect(manager.isIgnored(join(testDir, '_private.js'))).toBe(true);
      expect(manager.isIgnored(join(testDir, 'src', '_config.js'))).toBe(true);

      // Private directory
      expect(manager.isIgnored(join(testDir, 'private', 'secret.js'))).toBe(
        true
      );

      // Backup and swap files
      expect(manager.isIgnored(join(testDir, 'src', 'file.bak'))).toBe(true);
      expect(
        manager.isIgnored(join(testDir, 'deep', 'nested', 'file.swp'))
      ).toBe(true);

      // Bracket patterns
      expect(manager.isIgnored(join(testDir, 'Temp'))).toBe(true);
      expect(manager.isIgnored(join(testDir, 'temp'))).toBe(true);
      expect(manager.isIgnored(join(testDir, 'TempFile.js'))).toBe(true);
    });

    it('should handle comments and empty lines correctly', async () => {
      await writeFile(
        join(testDir, '.catdoublerignore'),
        `# This is a comment
*.log

# Another comment
  # Indented comment
  
  
*.tmp
# End comment`
      );

      const manager = await createIgnoreManager(undefined, testDir, mockLogger);

      expect(manager.isIgnored(join(testDir, 'debug.log'))).toBe(true);
      expect(manager.isIgnored(join(testDir, 'file.tmp'))).toBe(true);
      // Pattern count is no longer tracked (always returns 0)
    });

    it('should correctly handle relative path matching', async () => {
      await writeFile(
        join(testDir, '.catdoublerignore'),
        `src/internal/
*.secret
!public/*.secret`
      );

      const manager = await createIgnoreManager(undefined, testDir, mockLogger);

      // Directory patterns
      expect(
        manager.isIgnored(join(testDir, 'src', 'internal', 'file.js'))
      ).toBe(true);
      expect(manager.isIgnored(join(testDir, 'src', 'public', 'file.js'))).toBe(
        false
      );

      // File patterns with negation
      expect(manager.isIgnored(join(testDir, 'private.secret'))).toBe(true);
      expect(manager.isIgnored(join(testDir, 'src', 'private.secret'))).toBe(
        true
      );
      expect(manager.isIgnored(join(testDir, 'public', 'api.secret'))).toBe(
        false
      );
    });
  });

  describe('parseIgnoreFile', () => {
    it('should parse ignore file and return patterns', async () => {
      const ignoreFile = join(testDir, 'test.ignore');
      await writeFile(
        ignoreFile,
        `# Header comment
*.log
temp/
# Mid comment
src/**/*.test.js

# Footer comment`
      );

      const patterns = await parseIgnoreFile(ignoreFile);

      expect(patterns).toEqual(['*.log', 'temp/', 'src/**/*.test.js']);
    });

    it('should return empty array for empty file', async () => {
      const ignoreFile = join(testDir, 'empty.ignore');
      await writeFile(ignoreFile, '');

      const patterns = await parseIgnoreFile(ignoreFile);
      expect(patterns).toEqual([]);
    });

    it('should handle file with only comments', async () => {
      const ignoreFile = join(testDir, 'comments.ignore');
      await writeFile(
        ignoreFile,
        `# Comment 1
# Comment 2
# Comment 3`
      );

      const patterns = await parseIgnoreFile(ignoreFile);
      expect(patterns).toEqual([]);
    });
  });

  describe('Integration with file scanning', () => {
    it('should filter files based on ignore patterns during scanning', async () => {
      // Create test file structure
      await mkdir(join(testDir, 'src'), { recursive: true });
      await mkdir(join(testDir, 'test'), { recursive: true });
      await mkdir(join(testDir, 'logs'), { recursive: true });

      await writeFile(join(testDir, 'src', 'index.js'), 'console.log("main");');
      await writeFile(
        join(testDir, 'src', 'helper.js'),
        'export function help() {}'
      );
      await writeFile(
        join(testDir, 'test', 'index.test.js'),
        'test("works", () => {});'
      );
      await writeFile(join(testDir, 'logs', 'debug.log'), 'debug info');
      await writeFile(join(testDir, 'README.md'), '# Project');

      // Create ignore file
      await writeFile(
        join(testDir, '.catdoublerignore'),
        `logs/
*.test.js`
      );

      const manager = await createIgnoreManager(undefined, testDir, mockLogger);

      // Files that should be ignored
      expect(manager.isIgnored(join(testDir, 'logs', 'debug.log'))).toBe(true);
      expect(manager.isIgnored(join(testDir, 'test', 'index.test.js'))).toBe(
        true
      );

      // Files that should not be ignored
      expect(manager.isIgnored(join(testDir, 'src', 'index.js'))).toBe(false);
      expect(manager.isIgnored(join(testDir, 'src', 'helper.js'))).toBe(false);
      expect(manager.isIgnored(join(testDir, 'README.md'))).toBe(false);
    });
  });
});
