// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { describe, it, expect, beforeEach } from 'vitest';
import { classifyFileWithManager } from '../src/utils/fileTypes';
import { createDefaultTextFileManager } from '../src/utils/textFileManager';
import { TextFileManager } from '../src/utils/textFileManager';

describe('fileTypes', () => {
  let textFileManager: TextFileManager;

  beforeEach(async () => {
    textFileManager = await createDefaultTextFileManager();
  });

  describe('classifyFileWithManager', () => {
    it('should classify JavaScript/TypeScript files as text', () => {
      const jsFile = classifyFileWithManager('src/index.js', textFileManager);
      expect(jsFile.isTextFile).toBe(true);
      expect(jsFile.requiresTemplating).toBe(true);
      expect(jsFile.extension).toBe('.js');

      const tsFile = classifyFileWithManager('src/main.ts', textFileManager);
      expect(tsFile.isTextFile).toBe(true);
      expect(tsFile.requiresTemplating).toBe(true);
      expect(tsFile.extension).toBe('.ts');

      const jsxFile = classifyFileWithManager(
        'components/App.jsx',
        textFileManager
      );
      expect(jsxFile.isTextFile).toBe(true);
      expect(jsxFile.requiresTemplating).toBe(true);

      const tsxFile = classifyFileWithManager(
        'components/App.tsx',
        textFileManager
      );
      expect(tsxFile.isTextFile).toBe(true);
      expect(tsxFile.requiresTemplating).toBe(true);
    });

    it('should classify .NET files as text', () => {
      const csFile = classifyFileWithManager('Program.cs', textFileManager);
      expect(csFile.isTextFile).toBe(true);
      expect(csFile.requiresTemplating).toBe(true);

      const csprojFile = classifyFileWithManager(
        'MyApp.csproj',
        textFileManager
      );
      expect(csprojFile.isTextFile).toBe(true);
      expect(csprojFile.requiresTemplating).toBe(true);

      const fsFile = classifyFileWithManager('Main.fs', textFileManager);
      expect(fsFile.isTextFile).toBe(true);
      expect(fsFile.requiresTemplating).toBe(true);
    });

    it('should classify C/C++ files as text', () => {
      const cFile = classifyFileWithManager('main.c', textFileManager);
      expect(cFile.isTextFile).toBe(true);
      expect(cFile.requiresTemplating).toBe(true);

      const hFile = classifyFileWithManager('header.h', textFileManager);
      expect(hFile.isTextFile).toBe(true);
      expect(hFile.requiresTemplating).toBe(true);

      const cppFile = classifyFileWithManager('app.cpp', textFileManager);
      expect(cppFile.isTextFile).toBe(true);
      expect(cppFile.requiresTemplating).toBe(true);
    });

    it('should classify special filenames as text', () => {
      const makefile = classifyFileWithManager('Makefile', textFileManager);
      expect(makefile.isTextFile).toBe(true);
      expect(makefile.requiresTemplating).toBe(true);
      expect(makefile.filename).toBe('Makefile');

      const dockerfile = classifyFileWithManager('Dockerfile', textFileManager);
      expect(dockerfile.isTextFile).toBe(true);
      expect(dockerfile.requiresTemplating).toBe(true);

      const cmakeLists = classifyFileWithManager(
        'CMakeLists.txt',
        textFileManager
      );
      expect(cmakeLists.isTextFile).toBe(true);
      expect(cmakeLists.requiresTemplating).toBe(true);
    });

    it('should classify lock files as text and templatable', () => {
      const packageLock = classifyFileWithManager(
        'package-lock.json',
        textFileManager
      );
      expect(packageLock.isTextFile).toBe(true);
      expect(packageLock.requiresTemplating).toBe(true); // Now templates lock files

      const yarnLock = classifyFileWithManager('yarn.lock', textFileManager);
      expect(yarnLock.isTextFile).toBe(true);
      expect(yarnLock.requiresTemplating).toBe(true);

      const pnpmLock = classifyFileWithManager(
        'pnpm-lock.yaml',
        textFileManager
      );
      expect(pnpmLock.isTextFile).toBe(true);
      expect(pnpmLock.requiresTemplating).toBe(true);
    });

    it('should classify unknown extensions as non-text', () => {
      const imageFile = classifyFileWithManager('logo.png', textFileManager);
      expect(imageFile.isTextFile).toBe(false);
      expect(imageFile.requiresTemplating).toBe(false);

      const binaryFile = classifyFileWithManager('app.exe', textFileManager);
      expect(binaryFile.isTextFile).toBe(false);
      expect(binaryFile.requiresTemplating).toBe(false);

      const pdfFile = classifyFileWithManager('document.pdf', textFileManager);
      expect(pdfFile.isTextFile).toBe(false);
      expect(pdfFile.requiresTemplating).toBe(false);
    });
  });
});
