// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { describe, it, expect, beforeEach } from 'vitest';
import { classifyFileWithManager } from '../src/utils/fileTypes';
import { createDefaultTextFileManager } from '../src/utils/textFileManager';
import { TextFileManager } from '../src/utils/textFileManager';
import { createTestDirectory } from './helpers/testHelper';
import { join } from 'path';
import { writeFile } from 'fs/promises';

describe('fileTypes', () => {
  let testDir: string;
  let textFileManager: TextFileManager;

  beforeEach(async (fn) => {
    const testName = fn.task.name;
    testDir = await createTestDirectory('fileTypes', testName);
    textFileManager = await createDefaultTextFileManager();
  });

  describe('classifyFileWithManager', () => {
    it('should classify JavaScript/TypeScript files as text', async () => {
      // Create actual JS file
      const jsFile = join(testDir, 'test.js');
      await writeFile(jsFile, 'console.log("Hello, World!");', 'utf-8');

      const jsClassification = await classifyFileWithManager(
        jsFile,
        textFileManager
      );
      expect(jsClassification.isTextFile).toBe(true);
      expect(jsClassification.requiresTemplating).toBe(true);
      expect(jsClassification.extension).toBe('.js');

      // Create actual TS file
      const tsFile = join(testDir, 'test.ts');
      await writeFile(tsFile, 'const message: string = "Hello";', 'utf-8');

      const tsClassification = await classifyFileWithManager(
        tsFile,
        textFileManager
      );
      expect(tsClassification.isTextFile).toBe(true);
      expect(tsClassification.requiresTemplating).toBe(true);
      expect(tsClassification.extension).toBe('.ts');

      // Create actual JSX file
      const jsxFile = join(testDir, 'component.jsx');
      await writeFile(jsxFile, 'const App = () => <div>Hello</div>;', 'utf-8');

      const jsxClassification = await classifyFileWithManager(
        jsxFile,
        textFileManager
      );
      expect(jsxClassification.isTextFile).toBe(true);
      expect(jsxClassification.requiresTemplating).toBe(true);

      // Create actual TSX file
      const tsxFile = join(testDir, 'component.tsx');
      await writeFile(
        tsxFile,
        'const App: React.FC = () => <div>Hello</div>;',
        'utf-8'
      );

      const tsxClassification = await classifyFileWithManager(
        tsxFile,
        textFileManager
      );
      expect(tsxClassification.isTextFile).toBe(true);
      expect(tsxClassification.requiresTemplating).toBe(true);
    });

    it('should classify .NET files as text', async () => {
      // Create actual C# file
      const csFile = join(testDir, 'Program.cs');
      await writeFile(csFile, 'namespace MyApp { class Program { } }', 'utf-8');

      const csClassification = await classifyFileWithManager(
        csFile,
        textFileManager
      );
      expect(csClassification.isTextFile).toBe(true);
      expect(csClassification.requiresTemplating).toBe(true);

      // Create actual csproj file
      const csprojFile = join(testDir, 'MyApp.csproj');
      await writeFile(
        csprojFile,
        '<Project Sdk="Microsoft.NET.Sdk"></Project>',
        'utf-8'
      );

      const csprojClassification = await classifyFileWithManager(
        csprojFile,
        textFileManager
      );
      expect(csprojClassification.isTextFile).toBe(true);
      expect(csprojClassification.requiresTemplating).toBe(true);

      // Create actual F# file
      const fsFile = join(testDir, 'Main.fs');
      await writeFile(fsFile, 'let main argv = 0', 'utf-8');

      const fsClassification = await classifyFileWithManager(
        fsFile,
        textFileManager
      );
      expect(fsClassification.isTextFile).toBe(true);
      expect(fsClassification.requiresTemplating).toBe(true);
    });

    it('should classify C/C++ files as text', async () => {
      // Create actual C file
      const cFile = join(testDir, 'main.c');
      await writeFile(
        cFile,
        '#include <stdio.h>\nint main() { return 0; }',
        'utf-8'
      );

      const cClassification = await classifyFileWithManager(
        cFile,
        textFileManager
      );
      expect(cClassification.isTextFile).toBe(true);
      expect(cClassification.requiresTemplating).toBe(true);

      // Create actual C++ file
      const cppFile = join(testDir, 'app.cpp');
      await writeFile(
        cppFile,
        '#include <iostream>\nint main() { return 0; }',
        'utf-8'
      );

      const cppClassification = await classifyFileWithManager(
        cppFile,
        textFileManager
      );
      expect(cppClassification.isTextFile).toBe(true);
      expect(cppClassification.requiresTemplating).toBe(true);

      // Create actual header file
      const hFile = join(testDir, 'header.h');
      await writeFile(
        hFile,
        '#ifndef HEADER_H\n#define HEADER_H\n#endif',
        'utf-8'
      );

      const hClassification = await classifyFileWithManager(
        hFile,
        textFileManager
      );
      expect(hClassification.isTextFile).toBe(true);
      expect(hClassification.requiresTemplating).toBe(true);

      // Create actual C++ header file
      const hppFile = join(testDir, 'class.hpp');
      await writeFile(hppFile, '#pragma once\nclass MyClass { };', 'utf-8');

      const hppClassification = await classifyFileWithManager(
        hppFile,
        textFileManager
      );
      expect(hppClassification.isTextFile).toBe(true);
      expect(hppClassification.requiresTemplating).toBe(true);
    });

    it('should classify special filenames as text', async () => {
      // Create actual Makefile
      const makefile = join(testDir, 'Makefile');
      await writeFile(makefile, 'all:\n\t@echo "Building..."', 'utf-8');

      const makefileClassification = await classifyFileWithManager(
        makefile,
        textFileManager
      );
      expect(makefileClassification.isTextFile).toBe(true);
      expect(makefileClassification.requiresTemplating).toBe(true);

      // Create actual Dockerfile
      const dockerfile = join(testDir, 'Dockerfile');
      await writeFile(dockerfile, 'FROM node:18\nWORKDIR /app', 'utf-8');

      const dockerfileClassification = await classifyFileWithManager(
        dockerfile,
        textFileManager
      );
      expect(dockerfileClassification.isTextFile).toBe(true);
      expect(dockerfileClassification.requiresTemplating).toBe(true);

      // Create actual Jenkinsfile
      const jenkinsfile = join(testDir, 'Jenkinsfile');
      await writeFile(jenkinsfile, 'pipeline {\n  agent any\n}', 'utf-8');

      const jenkinsfileClassification = await classifyFileWithManager(
        jenkinsfile,
        textFileManager
      );
      expect(jenkinsfileClassification.isTextFile).toBe(true);
      expect(jenkinsfileClassification.requiresTemplating).toBe(true);
    });

    it('should classify lock files as text and templatable', async () => {
      // Create actual package-lock.json
      const packageLock = join(testDir, 'package-lock.json');
      await writeFile(
        packageLock,
        '{"name": "test", "lockfileVersion": 3}',
        'utf-8'
      );

      const packageLockClassification = await classifyFileWithManager(
        packageLock,
        textFileManager
      );
      expect(packageLockClassification.isTextFile).toBe(true);
      expect(packageLockClassification.requiresTemplating).toBe(true);

      // Create actual yarn.lock
      const yarnLock = join(testDir, 'yarn.lock');
      await writeFile(
        yarnLock,
        '# THIS IS AN AUTOGENERATED FILE\n# yarn lockfile v1',
        'utf-8'
      );

      const yarnLockClassification = await classifyFileWithManager(
        yarnLock,
        textFileManager
      );
      expect(yarnLockClassification.isTextFile).toBe(true);
      expect(yarnLockClassification.requiresTemplating).toBe(true);

      // Create actual pnpm-lock.yaml
      const pnpmLock = join(testDir, 'pnpm-lock.yaml');
      await writeFile(
        pnpmLock,
        'lockfileVersion: 5.4\nspecifiers:\n  test: ^1.0.0',
        'utf-8'
      );

      const pnpmLockClassification = await classifyFileWithManager(
        pnpmLock,
        textFileManager
      );
      expect(pnpmLockClassification.isTextFile).toBe(true);
      expect(pnpmLockClassification.requiresTemplating).toBe(true);
    });

    it('should classify unknown extensions as non-text', async () => {
      // Create file with unknown extension but binary content
      const unknownFile = join(testDir, 'mystery.xyz');
      // Write binary content (non-text)
      await writeFile(unknownFile, Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff]));

      const unknownClassification = await classifyFileWithManager(
        unknownFile,
        textFileManager
      );
      expect(unknownClassification.isTextFile).toBe(false);
      expect(unknownClassification.requiresTemplating).toBe(false);

      // Create file with no extension and binary content
      const noExtFile = join(testDir, 'noext');
      await writeFile(noExtFile, Buffer.from([0x89, 0x50, 0x4e, 0x47])); // PNG header

      const noExtClassification = await classifyFileWithManager(
        noExtFile,
        textFileManager
      );
      expect(noExtClassification.isTextFile).toBe(false);
      expect(noExtClassification.requiresTemplating).toBe(false);

      // Create file with unknown extension but text content - should be detected as text
      const textUnknownFile = join(testDir, 'textfile.xyz');
      await writeFile(textUnknownFile, 'This is text content', 'utf-8');

      const textUnknownClassification = await classifyFileWithManager(
        textUnknownFile,
        textFileManager
      );
      // This should be text since chardet can detect it
      expect(textUnknownClassification.isTextFile).toBe(true);
      expect(textUnknownClassification.requiresTemplating).toBe(true);
    });
  });
});
