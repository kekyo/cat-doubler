// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { describe, it, expect } from 'vitest';
import {
  createTextFileManager,
  createDefaultTextFileManager,
} from '../src/utils/textFileManager';
import { createConsoleLogger } from '../src/utils/logger';
import { join } from 'path';
import { mkdir, writeFile, rm } from 'fs/promises';

describe('Text File Manager', () => {
  const testDir = join(process.cwd(), 'test-temp-textfile');
  const logger = createConsoleLogger('test', 'ignore');

  describe('createTextFileManager', () => {
    it('should correctly identify text files by extension', async () => {
      await mkdir(testDir, { recursive: true });
      const manager = await createTextFileManager(logger);

      // Create actual files with text content
      // JavaScript/TypeScript files
      await writeFile(
        join(testDir, 'file.js'),
        'console.log("test");',
        'utf-8'
      );
      await writeFile(
        join(testDir, 'file.ts'),
        'const x: string = "test";',
        'utf-8'
      );
      await writeFile(join(testDir, 'file.jsx'), '<div>Test</div>', 'utf-8');
      await writeFile(
        join(testDir, 'file.tsx'),
        'const App: React.FC = () => <div>Test</div>;',
        'utf-8'
      );

      expect(await manager.isTextFile(join(testDir, 'file.js'))).toBe(true);
      expect(await manager.isTextFile(join(testDir, 'file.ts'))).toBe(true);
      expect(await manager.isTextFile(join(testDir, 'file.jsx'))).toBe(true);
      expect(await manager.isTextFile(join(testDir, 'file.tsx'))).toBe(true);

      // JSON files (UTF-8 required by spec)
      await writeFile(join(testDir, 'file.json'), '{"test": true}', 'utf-8');
      await writeFile(
        join(testDir, 'file.jsonc'),
        '// comment\n{"test": true}',
        'utf-8'
      );

      expect(await manager.isTextFile(join(testDir, 'file.json'))).toBe(true);
      expect(await manager.isTextFile(join(testDir, 'file.jsonc'))).toBe(true);

      // Go files (UTF-8 required by spec)
      await writeFile(join(testDir, 'file.go'), 'package main', 'utf-8');
      expect(await manager.isTextFile(join(testDir, 'file.go'))).toBe(true);

      // Rust files (UTF-8 required by spec)
      await writeFile(join(testDir, 'file.rs'), 'fn main() {}', 'utf-8');
      expect(await manager.isTextFile(join(testDir, 'file.rs'))).toBe(true);

      // TOML files (UTF-8 required by spec)
      await writeFile(join(testDir, 'file.toml'), 'key = "value"', 'utf-8');
      expect(await manager.isTextFile(join(testDir, 'file.toml'))).toBe(true);

      // Clean up
      await rm(testDir, { recursive: true, force: true });
    });

    it('should correctly identify binary files by extension', async () => {
      await mkdir(testDir, { recursive: true });
      const manager = await createTextFileManager(logger);

      // Create actual binary files
      const binaryContent = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG header

      // Images
      await writeFile(join(testDir, 'image.jpg'), binaryContent);
      await writeFile(join(testDir, 'photo.png'), binaryContent);
      await writeFile(join(testDir, 'icon.gif'), binaryContent);

      expect(await manager.isTextFile(join(testDir, 'image.jpg'))).toBe(false);
      expect(await manager.isTextFile(join(testDir, 'photo.png'))).toBe(false);
      expect(await manager.isTextFile(join(testDir, 'icon.gif'))).toBe(false);

      // Archives
      await writeFile(join(testDir, 'archive.zip'), binaryContent);
      await writeFile(join(testDir, 'backup.tar'), binaryContent);
      await writeFile(join(testDir, 'compressed.gz'), binaryContent);

      expect(await manager.isTextFile(join(testDir, 'archive.zip'))).toBe(
        false
      );
      expect(await manager.isTextFile(join(testDir, 'backup.tar'))).toBe(false);
      expect(await manager.isTextFile(join(testDir, 'compressed.gz'))).toBe(
        false
      );

      // Executables
      await writeFile(join(testDir, 'app.exe'), binaryContent);
      await writeFile(join(testDir, 'library.dll'), binaryContent);
      await writeFile(join(testDir, 'binary.so'), binaryContent);

      expect(await manager.isTextFile(join(testDir, 'app.exe'))).toBe(false);
      expect(await manager.isTextFile(join(testDir, 'library.dll'))).toBe(
        false
      );
      expect(await manager.isTextFile(join(testDir, 'binary.so'))).toBe(false);

      // Clean up
      await rm(testDir, { recursive: true, force: true });
    });

    it('should handle special filenames correctly', async () => {
      await mkdir(testDir, { recursive: true });
      const manager = await createTextFileManager(logger);

      // Create actual files with special filenames that are UTF-8 required
      await writeFile(join(testDir, 'go.mod'), 'module example', 'utf-8');
      await writeFile(
        join(testDir, 'go.sum'),
        'example.com/module v1.0.0',
        'utf-8'
      );
      await writeFile(
        join(testDir, 'Cargo.toml'),
        '[package]\nname = "test"',
        'utf-8'
      );
      await writeFile(
        join(testDir, 'Cargo.lock'),
        '[[package]]\nname = "test"',
        'utf-8'
      );

      expect(await manager.isTextFile(join(testDir, 'go.mod'))).toBe(true);
      expect(await manager.isTextFile(join(testDir, 'go.sum'))).toBe(true);
      expect(await manager.isTextFile(join(testDir, 'Cargo.toml'))).toBe(true);
      expect(await manager.isTextFile(join(testDir, 'Cargo.lock'))).toBe(true);

      // Clean up
      await rm(testDir, { recursive: true, force: true });
    });

    it('should detect encoding for actual files', async () => {
      await mkdir(testDir, { recursive: true });

      try {
        // Create a UTF-8 file
        const utf8File = join(testDir, 'test.txt');
        await writeFile(utf8File, 'Hello World', 'utf-8');

        const manager = await createTextFileManager(logger);
        const result = await manager.validateEncoding(utf8File);

        expect(result.isTextFile).toBe(true);
        expect(
          ['UTF-8', 'ascii', 'ASCII'].includes(result.encoding || '')
        ).toBe(true);
        expect(result.requiresTemplating).toBe(true);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });

    it('should handle non-UTF-8 files with warning', async () => {
      await mkdir(testDir, { recursive: true });

      try {
        // Create a file with Latin-1 encoding (simulated)
        const latin1File = join(testDir, 'latin1.txt');
        // Write bytes that would be Latin-1 (high bytes)
        const buffer = Buffer.from([
          0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0xe9, 0xe8,
        ]); // "Hello" + accented chars
        await writeFile(latin1File, buffer);

        const manager = await createTextFileManager(logger);
        const result = await manager.validateEncoding(latin1File);

        // Should be treated as binary or detected as non-UTF-8
        // The exact behavior depends on chardet detection
        expect(result.requiresTemplating).toBe(false);
      } finally {
        await rm(testDir, { recursive: true, force: true });
      }
    });
  });

  describe('createDefaultTextFileManager', () => {
    it('should create a manager with no-op logger', async () => {
      await mkdir(testDir, { recursive: true });
      const manager = await createDefaultTextFileManager();

      // Create actual files
      await writeFile(
        join(testDir, 'file.js'),
        'console.log("test");',
        'utf-8'
      );
      await writeFile(
        join(testDir, 'image.jpg'),
        Buffer.from([0xff, 0xd8, 0xff])
      ); // JPEG header

      // Should still work correctly
      expect(await manager.isTextFile(join(testDir, 'file.js'))).toBe(true);
      expect(await manager.isTextFile(join(testDir, 'image.jpg'))).toBe(false);

      // Clean up
      await rm(testDir, { recursive: true, force: true });
    });
  });

  describe('Integration with file classification', () => {
    it('should correctly classify files without needing file content', async () => {
      await mkdir(testDir, { recursive: true });
      const manager = await createTextFileManager(logger);

      // Create actual files
      await writeFile(
        join(testDir, 'package.json'),
        '{"name": "test"}',
        'utf-8'
      );
      await writeFile(
        join(testDir, 'data.bin'),
        Buffer.from([0x00, 0x01, 0x02, 0x03])
      );
      await writeFile(join(testDir, 'go.mod'), 'module test', 'utf-8');

      // Files that are determined by extension/name
      expect(await manager.isTextFile(join(testDir, 'package.json'))).toBe(
        true
      ); // UTF-8 required
      expect(await manager.isTextFile(join(testDir, 'data.bin'))).toBe(false); // Binary content
      expect(await manager.isTextFile(join(testDir, 'go.mod'))).toBe(true); // UTF-8 required filename

      // Clean up
      await rm(testDir, { recursive: true, force: true });
    });

    it('should handle files with no extension', async () => {
      await mkdir(testDir, { recursive: true });
      const manager = await createTextFileManager(logger);

      // Create files with no extension
      await writeFile(join(testDir, 'README'), '# README', 'utf-8');
      await writeFile(join(testDir, 'LICENSE'), 'MIT License', 'utf-8');
      await writeFile(join(testDir, 'Makefile'), 'all:', 'utf-8');
      await writeFile(
        join(testDir, 'binaryfile'),
        Buffer.from([0x00, 0x01, 0x02])
      );

      // Files with no extension need content checking
      expect(await manager.isTextFile(join(testDir, 'README'))).toBe(true); // Text content
      expect(await manager.isTextFile(join(testDir, 'LICENSE'))).toBe(true); // Text content
      expect(await manager.isTextFile(join(testDir, 'Makefile'))).toBe(true); // Text content
      expect(await manager.isTextFile(join(testDir, 'binaryfile'))).toBe(false); // Binary content

      // Clean up
      await rm(testDir, { recursive: true, force: true });
    });
  });
});
