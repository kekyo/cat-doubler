// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { createTestDirectory } from './helpers/testHelper';
import {
  createTextFileManager,
  parseTextFile,
} from '../src/utils/textFileManager';
import { createMockLogger } from './helpers/mockLogger';

describe('Text File Manager', () => {
  let testDir: string;
  const mockLogger = createMockLogger();

  beforeEach(async (fn) => {
    testDir = await createTestDirectory('text-manager', fn.task.name);
  });

  describe('createTextFileManager', () => {
    it('should use default patterns when no text file exists', async () => {
      const manager = await createTextFileManager(
        undefined,
        testDir,
        mockLogger
      );

      // Check default patterns - extensions
      expect(manager.isTextFile('src/index.js')).toBe(true);
      expect(manager.isTextFile('src/App.tsx')).toBe(true);
      expect(manager.isTextFile('styles.css')).toBe(true);
      expect(manager.isTextFile('config.json')).toBe(true);
      expect(manager.isTextFile('Program.cs')).toBe(true);
      expect(manager.isTextFile('main.go')).toBe(true);
      expect(manager.isTextFile('script.py')).toBe(true);
      expect(manager.isTextFile('README.md')).toBe(true);

      // Check default patterns - special filenames
      expect(manager.isTextFile('Makefile')).toBe(true);
      expect(manager.isTextFile('Dockerfile')).toBe(true);
      expect(manager.isTextFile('LICENSE')).toBe(true);
      expect(manager.isTextFile('requirements.txt')).toBe(true);

      // Should not match binary files
      expect(manager.isTextFile('logo.png')).toBe(false);
      expect(manager.isTextFile('app.exe')).toBe(false);
      expect(manager.isTextFile('document.pdf')).toBe(false);
      expect(manager.isTextFile('archive.zip')).toBe(false);
    });

    it('should load patterns from .catdoublertext', async () => {
      // Create text pattern file
      await writeFile(
        join(testDir, '.catdoublertext'),
        `# Test text file patterns
*.custom
*.myext
special-file.bin
src/**/*.template
!*.exclude
`
      );

      const manager = await createTextFileManager(
        undefined,
        testDir,
        mockLogger
      );

      // Test custom patterns
      expect(manager.isTextFile('file.custom')).toBe(true);
      expect(manager.isTextFile('test.myext')).toBe(true);
      expect(manager.isTextFile('special-file.bin')).toBe(true);
      expect(manager.isTextFile('src/templates/page.template')).toBe(true);

      // Default patterns should still work
      expect(manager.isTextFile('index.js')).toBe(true);
      expect(manager.isTextFile('style.css')).toBe(true);
      expect(manager.isTextFile('Makefile')).toBe(true);

      // Non-text files
      expect(manager.isTextFile('image.jpg')).toBe(false);
      expect(manager.isTextFile('binary.dat')).toBe(false);
    });

    it('should load patterns from custom text file path', async () => {
      const customTextPath = join(testDir, 'custom.textpatterns');
      await writeFile(
        customTextPath,
        `# Custom text patterns
*.config
*.settings
build/**/*.generated
`
      );

      const manager = await createTextFileManager(
        customTextPath,
        testDir,
        mockLogger
      );

      expect(manager.isTextFile('app.config')).toBe(true);
      expect(manager.isTextFile('user.settings')).toBe(true);
      expect(manager.isTextFile('build/output/file.generated')).toBe(true);

      // Default patterns still apply
      expect(manager.isTextFile('script.js')).toBe(true);
    });

    it('should throw error when specified text file does not exist', async () => {
      const nonExistentPath = join(testDir, 'nonexistent.text');

      await expect(
        createTextFileManager(nonExistentPath, testDir, mockLogger)
      ).rejects.toThrow('Specified text file pattern file not found');
    });

    it('should handle complex glob patterns', async () => {
      await writeFile(
        join(testDir, '.catdoublertext'),
        `# Complex patterns
# All config files in any config directory
**/config/*.conf

# All files with double extensions
*.min.js
*.test.ts
*.spec.jsx

# Files in specific directories
docs/**/*.mdx
examples/**/*

# Specific file patterns
*.[jt]s
*.{yaml,yml}
`
      );

      const manager = await createTextFileManager(
        undefined,
        testDir,
        mockLogger
      );

      // Config directory patterns
      expect(manager.isTextFile('src/config/app.conf')).toBe(true);
      expect(manager.isTextFile('lib/config/db.conf')).toBe(true);

      // Double extensions
      expect(manager.isTextFile('bundle.min.js')).toBe(true);
      expect(manager.isTextFile('component.test.ts')).toBe(true);
      expect(manager.isTextFile('app.spec.jsx')).toBe(true);

      // Directory specific
      expect(manager.isTextFile('docs/guide/intro.mdx')).toBe(true);
      expect(manager.isTextFile('examples/basic/index.html')).toBe(true);
      expect(manager.isTextFile('examples/advanced/app.exe')).toBe(true); // matches examples/**/*

      // Pattern groups
      expect(manager.isTextFile('file.js')).toBe(true);
      expect(manager.isTextFile('file.ts')).toBe(true);
      expect(manager.isTextFile('config.yaml')).toBe(true);
      expect(manager.isTextFile('config.yml')).toBe(true);
    });

    it('should handle comments and empty lines correctly', async () => {
      await writeFile(
        join(testDir, '.catdoublertext'),
        `# This is a comment
*.custom

# Another comment
  # Indented comment
  
  
*.special
# End comment`
      );

      const manager = await createTextFileManager(
        undefined,
        testDir,
        mockLogger
      );

      expect(manager.isTextFile('file.custom')).toBe(true);
      expect(manager.isTextFile('file.special')).toBe(true);
      expect(manager.getPatternCount()).toBeGreaterThan(0);
    });

    it('should match both full path and basename for special files', async () => {
      const manager = await createTextFileManager(
        undefined,
        testDir,
        mockLogger
      );

      // Special filename patterns should match regardless of path
      expect(manager.isTextFile('Makefile')).toBe(true);
      expect(manager.isTextFile('src/Makefile')).toBe(true);
      expect(manager.isTextFile('build/Dockerfile')).toBe(true);
      expect(manager.isTextFile('docs/LICENSE')).toBe(true);

      // Extension patterns should work with any path
      expect(manager.isTextFile('index.js')).toBe(true);
      expect(manager.isTextFile('src/utils/helper.js')).toBe(true);
      expect(manager.isTextFile('deep/nested/path/component.tsx')).toBe(true);
    });

    it('should handle case sensitivity correctly', async () => {
      await writeFile(
        join(testDir, '.catdoublertext'),
        `# Case patterns
*.TXT
*.Md
README
readme
`
      );

      const manager = await createTextFileManager(
        undefined,
        testDir,
        mockLogger
      );

      // Test case patterns
      expect(manager.isTextFile('file.TXT')).toBe(true);
      expect(manager.isTextFile('document.Md')).toBe(true);
      expect(manager.isTextFile('README')).toBe(true);
      expect(manager.isTextFile('readme')).toBe(true);

      // Default patterns are lowercase
      expect(manager.isTextFile('script.js')).toBe(true);
      expect(manager.isTextFile('style.css')).toBe(true);
    });
  });

  describe('parseTextFile', () => {
    it('should parse text file and return patterns', async () => {
      const textFile = join(testDir, 'test.textpatterns');
      await writeFile(
        textFile,
        `# Header comment
*.log
temp/**/*
# Mid comment
src/**/*.template

# Footer comment`
      );

      const patterns = await parseTextFile(textFile);

      expect(patterns).toEqual(['*.log', 'temp/**/*', 'src/**/*.template']);
    });

    it('should return empty array for empty file', async () => {
      const textFile = join(testDir, 'empty.text');
      await writeFile(textFile, '');

      const patterns = await parseTextFile(textFile);
      expect(patterns).toEqual([]);
    });

    it('should handle file with only comments', async () => {
      const textFile = join(testDir, 'comments.text');
      await writeFile(
        textFile,
        `# Comment 1
# Comment 2
# Comment 3`
      );

      const patterns = await parseTextFile(textFile);
      expect(patterns).toEqual([]);
    });
  });

  describe('Integration with existing text file detection', () => {
    it('should maintain backward compatibility with default patterns', async () => {
      const manager = await createTextFileManager(
        undefined,
        testDir,
        mockLogger
      );

      // All previously supported extensions should still work
      const testFiles = [
        // JavaScript/TypeScript
        'app.js',
        'App.jsx',
        'main.ts',
        'Component.tsx',
        'module.mjs',
        'common.cjs',
        'types.mts',
        'config.cts',
        // Styles
        'styles.css',
        'theme.scss',
        'vars.sass',
        'mixins.less',
        // Markup
        'index.html',
        'template.xml',
        'icon.svg',
        'App.vue',
        // Data
        'data.json',
        'config.yaml',
        'settings.toml',
        'app.ini',
        // .NET
        'Program.cs',
        'Startup.fs',
        'Module.vb',
        'App.csproj',
        // C/C++
        'main.c',
        'header.h',
        'app.cpp',
        'lib.cc',
        // Other languages
        'script.py',
        'Main.java',
        'app.go',
        'lib.rs',
        // Docs
        'README.md',
        'guide.txt',
        'api.rst',
        // Config
        '.env',
        '.gitignore',
        '.eslintrc',
        '.prettierrc',
        // Special files
        'Makefile',
        'Dockerfile',
        'LICENSE',
        'requirements.txt',
      ];

      for (const file of testFiles) {
        expect(manager.isTextFile(file)).toBe(true);
      }
    });

    it('should correctly identify non-text files', async () => {
      const manager = await createTextFileManager(
        undefined,
        testDir,
        mockLogger
      );

      const binaryFiles = [
        'image.png',
        'photo.jpg',
        'icon.gif',
        'video.mp4',
        'app.exe',
        'lib.dll',
        'binary.so',
        'archive.zip',
        'document.pdf',
        'spreadsheet.xlsx',
        'data.db',
      ];

      for (const file of binaryFiles) {
        expect(manager.isTextFile(file)).toBe(false);
      }
    });
  });
});
