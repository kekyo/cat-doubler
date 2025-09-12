// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { createTestDirectory } from './helpers/testHelper';
import {
  createHierarchicalIgnoreManager,
  createIgnoreManager,
} from '../src/utils/ignoreFileParser';
import { createMockLogger } from './helpers/mockLogger';

describe('Hierarchical Ignore File Support', () => {
  let testDir: string;
  const mockLogger = createMockLogger();

  beforeEach(async (fn) => {
    testDir = await createTestDirectory('hierarchical-ignore', fn.task.name);
  });

  describe('Basic Hierarchy', () => {
    it('should use .catdoublerignore when present', async () => {
      // Create directory structure
      await mkdir(join(testDir, 'src'), { recursive: true });

      // Create .catdoublerignore
      await writeFile(
        join(testDir, '.catdoublerignore'),
        `*.log
temp/`
      );

      const manager = await createHierarchicalIgnoreManager(
        testDir,
        mockLogger
      );

      // Test patterns
      expect(await manager.isIgnored(join(testDir, 'debug.log'))).toBe(true);
      expect(await manager.isIgnored(join(testDir, 'temp', 'file.txt'))).toBe(
        true
      );
      expect(await manager.isIgnored(join(testDir, 'src', 'index.js'))).toBe(
        false
      );
    });

    it('should fallback to .gitignore when .catdoublerignore is absent', async () => {
      // Create directory structure
      await mkdir(join(testDir, 'src'), { recursive: true });

      // Create .gitignore (no .catdoublerignore)
      await writeFile(
        join(testDir, '.gitignore'),
        `*.tmp
build/`
      );

      const manager = await createHierarchicalIgnoreManager(
        testDir,
        mockLogger
      );

      // Test patterns
      expect(await manager.isIgnored(join(testDir, 'file.tmp'))).toBe(true);
      expect(await manager.isIgnored(join(testDir, 'build', 'output.js'))).toBe(
        true
      );
      expect(await manager.isIgnored(join(testDir, 'src', 'main.js'))).toBe(
        false
      );
    });

    it('should merge .gitignore and .catdoublerignore; latter can override', async () => {
      // Create both files: .gitignore provides base rules, .catdoublerignore overrides
      await writeFile(join(testDir, '.catdoublerignore'), `!*.git\n*.cat`);
      await writeFile(join(testDir, '.gitignore'), `*.git\n*.tmp`);

      const manager = await createHierarchicalIgnoreManager(
        testDir,
        mockLogger
      );

      // *.git is un-ignored by .catdoublerignore override
      expect(await manager.isIgnored(join(testDir, 'file.git'))).toBe(false);
      // *.cat is ignored by .catdoublerignore
      expect(await manager.isIgnored(join(testDir, 'file.cat'))).toBe(true);
      // *.tmp remains ignored from .gitignore (no override)
      expect(await manager.isIgnored(join(testDir, 'file.tmp'))).toBe(true);
    });
  });

  describe('Multi-level Hierarchy', () => {
    it('should merge rules from parent and child directories', async () => {
      // Create nested directory structure
      await mkdir(join(testDir, 'src', 'components'), { recursive: true });

      // Root .gitignore
      await writeFile(
        join(testDir, '.gitignore'),
        `*.log
node_modules/`
      );

      // src/.gitignore - adds more rules
      await writeFile(
        join(testDir, 'src', '.gitignore'),
        `*.test.js
scratch/`
      );

      const manager = await createHierarchicalIgnoreManager(
        testDir,
        mockLogger
      );

      // Root patterns should apply everywhere
      expect(await manager.isIgnored(join(testDir, 'debug.log'))).toBe(true);
      expect(await manager.isIgnored(join(testDir, 'src', 'error.log'))).toBe(
        true
      );
      expect(
        await manager.isIgnored(join(testDir, 'node_modules', 'lib.js'))
      ).toBe(true);

      // src patterns should apply in src and subdirectories
      expect(await manager.isIgnored(join(testDir, 'src', 'app.test.js'))).toBe(
        true
      );
      expect(
        await manager.isIgnored(
          join(testDir, 'src', 'components', 'button.test.js')
        )
      ).toBe(true);
      expect(
        await manager.isIgnored(join(testDir, 'src', 'scratch', 'cache.json'))
      ).toBe(true);

      // src patterns should NOT apply outside src
      expect(await manager.isIgnored(join(testDir, 'app.test.js'))).toBe(false);
      expect(
        await manager.isIgnored(join(testDir, 'scratch', 'cache.json'))
      ).toBe(false);
    });

    it('should allow subdirectory rules to override parent rules', async () => {
      // Create nested structure
      await mkdir(join(testDir, 'src'), { recursive: true });

      // Root ignores all .js files
      await writeFile(join(testDir, '.gitignore'), `*.js`);

      // src allows specific .js files
      await writeFile(join(testDir, 'src', '.gitignore'), `!main.js`);

      const manager = await createHierarchicalIgnoreManager(
        testDir,
        mockLogger
      );

      // Root level .js files should be ignored
      expect(await manager.isIgnored(join(testDir, 'app.js'))).toBe(true);

      // src level: most .js files ignored but main.js allowed
      expect(await manager.isIgnored(join(testDir, 'src', 'app.js'))).toBe(
        true
      );
      expect(await manager.isIgnored(join(testDir, 'src', 'main.js'))).toBe(
        false
      ); // Negated
    });

    it('should handle deep directory hierarchies', async () => {
      // Create deep structure
      await mkdir(join(testDir, 'a', 'b', 'c', 'd'), { recursive: true });

      // Different ignore files at different levels
      await writeFile(join(testDir, '.gitignore'), '*.root');
      await writeFile(join(testDir, 'a', '.gitignore'), '*.a');
      await writeFile(join(testDir, 'a', 'b', '.catdoublerignore'), '*.b');
      await writeFile(join(testDir, 'a', 'b', 'c', '.gitignore'), '*.c');

      const manager = await createHierarchicalIgnoreManager(
        testDir,
        mockLogger
      );

      // Test cumulative patterns at each level
      // Level d should have all patterns from ancestors
      const deepPath = join(testDir, 'a', 'b', 'c', 'd');
      expect(await manager.isIgnored(join(deepPath, 'file.root'))).toBe(true);
      expect(await manager.isIgnored(join(deepPath, 'file.a'))).toBe(true);
      expect(await manager.isIgnored(join(deepPath, 'file.b'))).toBe(true);
      expect(await manager.isIgnored(join(deepPath, 'file.c'))).toBe(true);
      expect(await manager.isIgnored(join(deepPath, 'file.txt'))).toBe(false);
    });
  });

  describe('Parent Directory Exclusion Limitation', () => {
    it('should not allow re-inclusion of files in excluded parent directory', async () => {
      // Create structure
      await mkdir(join(testDir, 'excluded', 'nested'), { recursive: true });

      // Root excludes entire directory
      await writeFile(join(testDir, '.gitignore'), `excluded/`);

      // Try to re-include in subdirectory (should not work)
      await writeFile(
        join(testDir, 'excluded', '.gitignore'),
        `!important.txt`
      );

      const manager = await createHierarchicalIgnoreManager(
        testDir,
        mockLogger
      );

      // Everything in excluded/ should be ignored
      expect(
        await manager.isIgnored(join(testDir, 'excluded', 'file.txt'))
      ).toBe(true);
      expect(
        await manager.isIgnored(join(testDir, 'excluded', 'important.txt'))
      ).toBe(true);
      expect(
        await manager.isIgnored(join(testDir, 'excluded', 'nested', 'deep.txt'))
      ).toBe(true);
    });
  });

  describe('Mixed .catdoublerignore and .gitignore', () => {
    it('should handle mixed ignore files in hierarchy', async () => {
      // Create structure
      await mkdir(join(testDir, 'src', 'lib'), { recursive: true });
      await mkdir(join(testDir, 'test'), { recursive: true });

      // Root has .gitignore
      await writeFile(
        join(testDir, '.gitignore'),
        `*.log
.env`
      );

      // src has .catdoublerignore (takes precedence over any .gitignore in same dir)
      await writeFile(
        join(testDir, 'src', '.catdoublerignore'),
        `*.tmp
dist/`
      );

      // test has .gitignore
      await writeFile(join(testDir, 'test', '.gitignore'), `*.test.js`);

      const manager = await createHierarchicalIgnoreManager(
        testDir,
        mockLogger
      );

      // Root patterns apply everywhere
      expect(await manager.isIgnored(join(testDir, 'debug.log'))).toBe(true);
      expect(await manager.isIgnored(join(testDir, 'src', 'error.log'))).toBe(
        true
      );
      expect(await manager.isIgnored(join(testDir, '.env'))).toBe(true);

      // src patterns
      expect(await manager.isIgnored(join(testDir, 'src', 'cache.tmp'))).toBe(
        true
      );
      expect(
        await manager.isIgnored(join(testDir, 'src', 'dist', 'bundle.js'))
      ).toBe(true);

      // test patterns
      expect(
        await manager.isIgnored(join(testDir, 'test', 'app.test.js'))
      ).toBe(true);
    });
  });

  describe('Default Template Fallback', () => {
    it('should use default template when no ignore files exist', async () => {
      // No ignore files created
      const manager = await createHierarchicalIgnoreManager(
        testDir,
        mockLogger
      );

      // Default template patterns should apply
      expect(
        await manager.isIgnored(join(testDir, 'node_modules', 'lib.js'))
      ).toBe(true);
      expect(await manager.isIgnored(join(testDir, '.git', 'config'))).toBe(
        true
      );
      expect(await manager.isIgnored(join(testDir, 'dist', 'bundle.js'))).toBe(
        true
      );
      expect(await manager.isIgnored(join(testDir, 'src', 'index.js'))).toBe(
        false
      );
    });
  });

  describe('Legacy Compatibility', () => {
    it('should support legacy mode with specific ignore path', async () => {
      // Create custom ignore file
      const customIgnorePath = join(testDir, 'custom.ignore');
      await writeFile(
        customIgnorePath,
        `*.custom
special/`
      );

      // Use legacy createIgnoreManager with specific path
      const manager = await createIgnoreManager(
        customIgnorePath,
        testDir,
        mockLogger
      );

      // Should only use the specified file
      expect(
        await Promise.resolve(manager.isIgnored(join(testDir, 'file.custom')))
      ).toBe(true);
      expect(
        await Promise.resolve(
          manager.isIgnored(join(testDir, 'special', 'file.txt'))
        )
      ).toBe(true);
      expect(
        await Promise.resolve(manager.isIgnored(join(testDir, 'regular.txt')))
      ).toBe(false);
    });

    it('should use hierarchical mode when no specific path provided', async () => {
      // Create hierarchy
      await mkdir(join(testDir, 'sub'), { recursive: true });
      await writeFile(join(testDir, '.gitignore'), '*.root');
      await writeFile(join(testDir, 'sub', '.gitignore'), '*.sub');

      // Use createIgnoreManager without specific path
      const manager = await createIgnoreManager(undefined, testDir, mockLogger);

      // Should use hierarchical behavior
      expect(await manager.isIgnored(join(testDir, 'file.root'))).toBe(true);
      expect(await manager.isIgnored(join(testDir, 'sub', 'file.root'))).toBe(
        true
      );
      expect(await manager.isIgnored(join(testDir, 'sub', 'file.sub'))).toBe(
        true
      );
      expect(await manager.isIgnored(join(testDir, 'file.sub'))).toBe(false);
    });
  });

  describe('Pattern Adjustment', () => {
    it('should correctly adjust patterns relative to source root', async () => {
      // Create nested structure
      await mkdir(join(testDir, 'src', 'components'), { recursive: true });

      // Patterns in subdirectory
      await writeFile(
        join(testDir, 'src', '.gitignore'),
        `local.txt
/absolute.txt
*.tmp`
      );

      const manager = await createHierarchicalIgnoreManager(
        testDir,
        mockLogger
      );

      // local.txt pattern (relative, applies recursively in src/)
      expect(await manager.isIgnored(join(testDir, 'src', 'local.txt'))).toBe(
        true
      );
      expect(
        await manager.isIgnored(join(testDir, 'src', 'components', 'local.txt'))
      ).toBe(true);
      expect(await manager.isIgnored(join(testDir, 'local.txt'))).toBe(false);

      // /absolute.txt pattern (absolute to src/)
      expect(
        await manager.isIgnored(join(testDir, 'src', 'absolute.txt'))
      ).toBe(true);
      expect(
        await manager.isIgnored(
          join(testDir, 'src', 'components', 'absolute.txt')
        )
      ).toBe(false);

      // *.tmp pattern (applies recursively)
      expect(await manager.isIgnored(join(testDir, 'src', 'file.tmp'))).toBe(
        true
      );
      expect(
        await manager.isIgnored(join(testDir, 'src', 'components', 'cache.tmp'))
      ).toBe(true);
      expect(await manager.isIgnored(join(testDir, 'file.tmp'))).toBe(false);
    });
  });
});
