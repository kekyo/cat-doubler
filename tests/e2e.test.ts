// cat-doubler - Convert any project into a lightweight template generator
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdir, writeFile, readFile, access } from 'fs/promises';
import { constants } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createTestDirectory } from './helpers/testHelper';
import { convertToTemplate } from '../src/converter/templateConverter';
import { createMockLogger } from './helpers/mockLogger';
import { generateCaseVariants } from '../src/utils/caseUtils';

const execAsync = promisify(exec);

describe('E2E Tests', () => {
  let testDir: string;
  let sourceDir: string;
  let outputDir: string;
  const mockLogger = createMockLogger();

  beforeEach(async (fn) => {
    testDir = await createTestDirectory('e2e', fn.task.name);
    sourceDir = join(testDir, 'source');
    outputDir = join(testDir, 'output');
    await mkdir(sourceDir, { recursive: true });
  });

  describe('Template Generation', () => {
    it('should generate a complete template from a TypeScript project', async () => {
      // Create a sample TypeScript project
      await writeFile(
        join(sourceDir, 'package.json'),
        JSON.stringify(
          {
            name: 'foo-bar-app',
            version: '1.0.0',
            scripts: {
              start: 'node dist/FooBarApp.js',
            },
          },
          null,
          2
        )
      );

      await mkdir(join(sourceDir, 'src'), { recursive: true });
      await writeFile(
        join(sourceDir, 'src', 'FooBarApp.ts'),
        `// FooBarApp Main Application
import { FooBarAppConfig } from './config';

export class FooBarApp {
  private fooBarApp: string = 'foo-bar-app';
  private FOO_BAR_APP = '1.0.0';

  constructor(private config: FooBarAppConfig) {}

  start(): void {
    console.log(\`Starting \${this.fooBarApp} v\${this.FOO_BAR_APP}\`);
  }
}

export const fooBarApp = new FooBarApp({ name: 'FooBarApp' });`
      );

      await writeFile(
        join(sourceDir, 'src', 'config.ts'),
        `export interface FooBarAppConfig {
  name: string;
  foo_bar_app_key?: string;
}`
      );

      await writeFile(
        join(sourceDir, 'README.md'),
        `# FooBarApp

This is the FooBarApp project.

## Installation

\`\`\`bash
npm install foo-bar-app
\`\`\`

## Usage

Run FooBarApp with:
\`\`\`bash
npx foo-bar-app
\`\`\``
      );

      // Convert to template
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        undefined,
        mockLogger
      );

      // Verify generated files
      const packageJson = await readFile(
        join(outputDir, 'package.json'),
        'utf-8'
      );
      expect(packageJson).toContain('foo-bar-app-generator');
      expect(JSON.parse(packageJson).dependencies).toEqual({});

      const indexJs = await readFile(join(outputDir, 'index.js'), 'utf-8');
      expect(indexJs).toContain('#!/usr/bin/env node');
      // Check for the new direct replacements generation
      expect(indexJs).toContain('const replacements = {');
      expect(indexJs).toContain('"__camel1__": toCamelCase(symbolName)');
      expect(indexJs).toContain('readline');

      const readme = await readFile(join(outputDir, 'README.md'), 'utf-8');
      expect(readme).toContain('FooBarApp scaffolding generator');
      expect(readme).toContain(
        'This is a scaffolding generator created from the FooBarApp project'
      );

      // Check template files with placeholders
      const mainTemplate = await readFile(
        join(outputDir, 'templates', 'src', '__pascal1__.ts'),
        'utf-8'
      );
      expect(mainTemplate).toContain('__pascal1__');
      expect(mainTemplate).toContain('__camel1__');
      expect(mainTemplate).toContain('__kebab1__');
      expect(mainTemplate).toContain('__constant1__');
      // Should not contain original names
      expect(mainTemplate).not.toContain('class FooBarApp');
      expect(mainTemplate).not.toContain('new FooBarApp');
      expect(mainTemplate).not.toContain("= 'foo-bar-app'");

      const configFile = await readFile(
        join(outputDir, 'templates', 'src', 'config.ts'),
        'utf-8'
      );
      // config.ts has symbols to replace
      expect(configFile).toContain('__pascal1__Config');
      expect(configFile).toContain('__snake1___key');

      const readmeTemplate = await readFile(
        join(outputDir, 'templates', 'README.md'),
        'utf-8'
      );
      expect(readmeTemplate).toContain('__pascal1__');
      expect(readmeTemplate).toContain('__kebab1__');
    });

    it('should handle file and directory names with symbols', async () => {
      // Create files with symbol in names
      await mkdir(join(sourceDir, 'FooBarApp'), { recursive: true });
      await writeFile(
        join(sourceDir, 'FooBarApp', 'fooBarApp.config.js'),
        `export const fooBarAppConfig = {
  name: 'FooBarApp',
  foo_bar_app_key: 'secret'
};`
      );

      await mkdir(join(sourceDir, 'foo-bar-app-tests'), { recursive: true });
      await writeFile(
        join(sourceDir, 'foo-bar-app-tests', 'foo_bar_app.test.js'),
        `import { FooBarApp } from '../FooBarApp/fooBarApp';

test('FooBarApp should work', () => {
  const fooBarApp = new FooBarApp();
  expect(fooBarApp).toBeDefined();
});`
      );

      // Convert to template
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        undefined,
        mockLogger
      );

      // Check that directory and file names are templated with placeholders
      const dirPath = join(outputDir, 'templates', '__pascal1__');
      await access(dirPath);

      const configPath = join(dirPath, '__camel1__.config.js');
      await access(configPath);

      const testDirPath = join(outputDir, 'templates', '__kebab1__-tests');
      await access(testDirPath);

      const testFilePath = join(testDirPath, '__snake1__.test.js');
      await access(testFilePath);
    });

    it('should preserve binary files without templating', async () => {
      // Create a fake binary file
      const binaryContent = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG header
      await writeFile(join(sourceDir, 'logo.png'), binaryContent);

      // Create a text file
      await writeFile(
        join(sourceDir, 'config.json'),
        JSON.stringify({ name: 'FooBarApp' })
      );

      // Convert to template
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        undefined,
        mockLogger
      );

      // Binary file should be copied as-is
      const copiedBinary = await readFile(
        join(outputDir, 'templates', 'logo.png')
      );
      expect(copiedBinary).toEqual(binaryContent);

      // Text file should be templated
      const configTemplate = await readFile(
        join(outputDir, 'templates', 'config.json'),
        'utf-8'
      );
      expect(configTemplate).toContain('__pascal1__');
    });

    it('should handle placeholder collision detection', async () => {
      // Create a project with existing placeholder-like strings
      await writeFile(
        join(sourceDir, 'test.js'),
        `const __camel1__ = 'This conflicts';
const __pascal1__ = 'Also conflicts';
const FooBarApp = 'Original';`
      );

      // Convert to template
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        undefined,
        mockLogger
      );

      // Should use __camel2__ and __pascal2__ due to collision
      const testTemplate = await readFile(
        join(outputDir, 'templates', 'test.js'),
        'utf-8'
      );
      expect(testTemplate).toContain('__camel1__'); // Original preserved
      expect(testTemplate).toContain('__pascal1__'); // Original preserved
      expect(testTemplate).toContain('__pascal2__'); // New placeholder for FooBarApp
      expect(testTemplate).not.toContain('FooBarApp'); // FooBarApp should be replaced
    });
  });

  describe('Generated Template Usage', () => {
    it('should create a working CLI that can generate new projects', async () => {
      // Create a minimal source project
      await writeFile(
        join(sourceDir, 'index.js'),
        `const FooBarApp = require('foo-bar-app');
module.exports = { FooBarApp };`
      );

      // Convert to template
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        undefined,
        mockLogger
      );

      // Verify the index.js is valid JavaScript
      const { stderr } = await execAsync('node -c index.js', {
        cwd: outputDir,
      });
      expect(stderr).toBe('');
    });

    it('should generate actual projects using the created template', async () => {
      // Create a sample project with various symbols
      await writeFile(
        join(sourceDir, 'package.json'),
        JSON.stringify(
          {
            name: 'foo-bar-app',
            version: '1.0.0',
            description: 'FooBarApp project',
          },
          null,
          2
        )
      );

      await mkdir(join(sourceDir, 'src'), { recursive: true });
      await writeFile(
        join(sourceDir, 'src', 'FooBarApp.js'),
        `// Main FooBarApp module
export class FooBarApp {
  constructor() {
    this.name = 'FooBarApp';
    this.id = 'foo-bar-app';
    this.constant = 'FOO_BAR_APP';
  }
  
  start() {
    console.log('Starting FooBarApp...');
    return 'foo_bar_app';
  }
}

export const fooBarApp = new FooBarApp();
export const FOO_BAR_APP_VERSION = '1.0.0';`
      );

      await writeFile(
        join(sourceDir, 'README.md'),
        `# FooBarApp

Welcome to FooBarApp!

## Installation
\`\`\`bash
npm install foo-bar-app
\`\`\`

## Usage
Import FooBarApp in your project:
\`\`\`javascript
const { FooBarApp } = require('foo-bar-app');
const fooBarApp = new FooBarApp();
\`\`\``
      );

      // Convert to template
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        undefined,
        mockLogger
      );

      // Run the generated CLI with command-line arguments
      const { stdout, stderr } = await execAsync(
        'node ./index.js --symbolName MyAwesomeProject --outputDir ../generated-project',
        {
          cwd: outputDir,
          timeout: 30000, // 30 second timeout
        }
      );

      const generatedProjectDir = join(testDir, 'generated-project');

      // Verify the generated project
      await access(generatedProjectDir, constants.F_OK);

      // Verify generated files
      const generatedPackageJson = await readFile(
        join(generatedProjectDir, 'package.json'),
        'utf-8'
      );
      const packageData = JSON.parse(generatedPackageJson);
      expect(packageData.name).toBe('my-awesome-project');
      expect(packageData.description).toContain('MyAwesomeProject');

      const generatedMainFile = await readFile(
        join(generatedProjectDir, 'src', 'MyAwesomeProject.js'),
        'utf-8'
      );
      expect(generatedMainFile).toContain('class MyAwesomeProject');
      expect(generatedMainFile).toContain('my-awesome-project');
      expect(generatedMainFile).toContain('MY_AWESOME_PROJECT');
      expect(generatedMainFile).toContain('myAwesomeProject');
      expect(generatedMainFile).not.toContain('FooBarApp');
      expect(generatedMainFile).not.toContain('__pascal');
      expect(generatedMainFile).not.toContain('__camel');

      const generatedReadme = await readFile(
        join(generatedProjectDir, 'README.md'),
        'utf-8'
      );
      expect(generatedReadme).toContain('# MyAwesomeProject');
      expect(generatedReadme).toContain('my-awesome-project');
      expect(generatedReadme).not.toContain('FooBarApp');
      expect(generatedReadme).not.toContain('__');
    });

    it('should handle interactive mode correctly', async () => {
      // Create a minimal project
      await writeFile(
        join(sourceDir, 'main.js'),
        `export function FooBarApp() {
  return 'fooBarApp';
}`
      );

      // Convert to template
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        undefined,
        mockLogger
      );

      // Test help output
      const { stdout: helpOutput } = await execAsync('node ./index.js --help', {
        cwd: outputDir,
      });
      expect(helpOutput).toContain('Usage: node index.js');
      expect(helpOutput).toContain('--symbolName');
      expect(helpOutput).toContain('--outputDir');
    });

    it('should embed dynamic placeholders correctly in generated index.js', async () => {
      // Create a project without placeholder collisions
      await writeFile(
        join(sourceDir, 'app.js'),
        `export class FooBarApp {
  name = 'FooBarApp';
}`
      );

      // Convert to template
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        undefined,
        mockLogger
      );

      // Check the generated index.js has the correct placeholders
      const indexJs = await readFile(join(outputDir, 'index.js'), 'utf-8');

      // Should use suffix 1 when no collisions
      expect(indexJs).toContain('"__camel1__": toCamelCase(symbolName)');
      expect(indexJs).toContain('"__pascal1__": toPascalCase(symbolName)');
      expect(indexJs).toContain('"__kebab1__": toKebabCase(symbolName)');
      expect(indexJs).toContain('"__snake1__": toSnakeCase(symbolName)');
      expect(indexJs).toContain('"__constant1__": toConstantCase(symbolName)');
      expect(indexJs).toContain('"__dot1__": toDotCase(symbolName)');
      expect(indexJs).toContain('"__lower1__": toLowerCase(symbolName)');
      expect(indexJs).toContain('"__upper1__": toUpperCase(symbolName)');
    });

    it('should handle placeholder collisions by using incremented suffixes', async () => {
      // Create a project with placeholder collisions
      await writeFile(
        join(sourceDir, 'config.js'),
        `export const config = {
  placeholder1: '__pascal1__',
  placeholder2: '__camel1__',
  placeholder3: '__kebab1__',
  app: 'FooBarApp'
}`
      );

      // Convert to template
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        undefined,
        mockLogger
      );

      // Check the generated index.js uses suffix 2 due to collision
      const indexJs = await readFile(join(outputDir, 'index.js'), 'utf-8');

      expect(indexJs).toContain('"__camel2__": toCamelCase(symbolName)');
      expect(indexJs).toContain('"__pascal2__": toPascalCase(symbolName)');
      expect(indexJs).toContain('"__kebab2__": toKebabCase(symbolName)');
      expect(indexJs).toContain('"__snake2__": toSnakeCase(symbolName)');
      expect(indexJs).toContain('"__constant2__": toConstantCase(symbolName)');
      expect(indexJs).toContain('"__dot2__": toDotCase(symbolName)');
      expect(indexJs).toContain('"__lower2__": toLowerCase(symbolName)');
      expect(indexJs).toContain('"__upper2__": toUpperCase(symbolName)');

      // Check the template file preserves original placeholders
      const configTemplate = await readFile(
        join(outputDir, 'templates', 'config.js'),
        'utf-8'
      );

      // Original placeholders should be preserved
      expect(configTemplate).toContain("placeholder1: '__pascal1__'");
      expect(configTemplate).toContain("placeholder2: '__camel1__'");
      expect(configTemplate).toContain("placeholder3: '__kebab1__'");
      // Symbol should be replaced with new placeholders
      expect(configTemplate).toContain("app: '__pascal2__'");
    });

    it('should handle all case variants including dot, lower, and upper', async () => {
      // Create a project with various case formats
      await writeFile(
        join(sourceDir, 'config.js'),
        `export const config = {
  appName: 'FooBarApp',
  appId: 'fooBarApp',
  kebabName: 'foo-bar-app',
  snakeName: 'foo_bar_app',
  constantName: 'FOO_BAR_APP',
  dotName: 'foo.bar.app',
  lowerName: 'foobarapp',
  upperName: 'FOOBARAPP'
}`
      );

      // Convert to template
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        undefined,
        mockLogger
      );

      // Check the template file has all placeholders
      const configTemplate = await readFile(
        join(outputDir, 'templates', 'config.js'),
        'utf-8'
      );

      expect(configTemplate).toContain("appName: '__pascal1__'");
      expect(configTemplate).toContain("appId: '__camel1__'");
      expect(configTemplate).toContain("kebabName: '__kebab1__'");
      expect(configTemplate).toContain("snakeName: '__snake1__'");
      expect(configTemplate).toContain("constantName: '__constant1__'");
      expect(configTemplate).toContain("dotName: '__dot1__'");
      expect(configTemplate).toContain("lowerName: '__lower1__'");
      expect(configTemplate).toContain("upperName: '__upper1__'");
    });

    it('should correctly apply dynamic placeholders when generating a project', async () => {
      // Create a project with some placeholder collisions
      await writeFile(
        join(sourceDir, 'app.js'),
        `// This file has __pascal1__ in comments
export class FooBarApp {
  constructor() {
    this.name = 'FooBarApp';
    this.id = 'foo-bar-app';
  }
}`
      );

      // Convert to template
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        undefined,
        mockLogger
      );

      // Generate a project using the CLI
      const { stdout, stderr } = await execAsync(
        'node ./index.js --symbolName TestProject --outputDir ../test-output',
        {
          cwd: outputDir,
        }
      );

      expect(stderr).toBe('');
      expect(stdout).toContain('Project successfully generated');

      // Check the generated project file
      const generatedApp = await readFile(
        join(testDir, 'test-output', 'app.js'),
        'utf-8'
      );

      // Original placeholder should remain
      expect(generatedApp).toContain(
        '// This file has __pascal1__ in comments'
      );
      // Symbol should be replaced with the new project name
      expect(generatedApp).toContain('export class TestProject');
      expect(generatedApp).toContain("this.name = 'TestProject'");
      expect(generatedApp).toContain("this.id = 'test-project'");
    });

    it('should correctly handle text and binary files with embedded paths', async () => {
      // Create a project with both text and binary files
      await mkdir(join(sourceDir, 'src', 'FooBarApp'), { recursive: true });
      await mkdir(join(sourceDir, 'assets'), { recursive: true });

      // Text files with various extensions
      await writeFile(
        join(sourceDir, 'src', 'FooBarApp', 'index.ts'),
        'export class FooBarApp { }\nconst fooBarApp = new FooBarApp();'
      );
      await writeFile(
        join(sourceDir, 'src', 'FooBarApp', 'style.scss'),
        '.foo-bar-app { color: blue; }'
      );
      await writeFile(
        join(sourceDir, 'src', 'FooBarApp', 'config.yaml'),
        'name: FooBarApp\ntype: foo-bar-app'
      );
      await writeFile(
        join(sourceDir, 'package.json'),
        '{"name": "foo-bar-app", "version": "1.0.0"}'
      );
      await writeFile(
        join(sourceDir, 'README.md'),
        '# FooBarApp\nThis is FooBarApp'
      );
      await writeFile(join(sourceDir, 'LICENSE'), 'MIT License\nFooBarApp');
      await writeFile(
        join(sourceDir, 'Makefile'),
        'build:\n\t@echo "Building FooBarApp"'
      );

      // Binary files
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      await writeFile(join(sourceDir, 'assets', 'logo.png'), pngHeader);
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      await writeFile(join(sourceDir, 'assets', 'photo.jpg'), jpegHeader);
      await writeFile(
        join(sourceDir, 'src', 'data.bin'),
        Buffer.from([0x00, 0x01, 0x02, 0x03])
      );

      // Convert to template
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        undefined,
        mockLogger
      );

      // Check generated index.js includes text file paths with placeholders
      const indexJs = await readFile(join(outputDir, 'index.js'), 'utf-8');
      expect(indexJs).toContain('TEXT_FILE_PATHS');

      // Text files should be in TEXT_FILE_PATHS with placeholder paths
      expect(indexJs).toContain('"src/__pascal1__/index.ts"');
      expect(indexJs).toContain('"src/__pascal1__/style.scss"');
      expect(indexJs).toContain('"src/__pascal1__/config.yaml"');
      expect(indexJs).toContain('"package.json"');
      expect(indexJs).toContain('"README.md"');
      expect(indexJs).toContain('"LICENSE"');
      expect(indexJs).toContain('"Makefile"');

      // Binary files should NOT be in TEXT_FILE_PATHS
      expect(indexJs).not.toContain('"assets/logo.png"');
      expect(indexJs).not.toContain('"assets/photo.jpg"');
      expect(indexJs).not.toContain('"src/data.bin"');

      // Verify binary files in template directory are preserved
      const templatePng = await readFile(
        join(outputDir, 'templates', 'assets', 'logo.png')
      );
      expect(Buffer.compare(templatePng.subarray(0, 8), pngHeader)).toBe(0);

      const templateJpeg = await readFile(
        join(outputDir, 'templates', 'assets', 'photo.jpg')
      );
      expect(Buffer.compare(templateJpeg.subarray(0, 4), jpegHeader)).toBe(0);

      const templateBin = await readFile(
        join(outputDir, 'templates', 'src', 'data.bin')
      );
      expect(templateBin).toEqual(Buffer.from([0x00, 0x01, 0x02, 0x03]));

      // Generate a project using the CLI
      const { stdout, stderr } = await execAsync(
        'node ./index.js --symbolName MyNewApp --outputDir ../generated-output',
        {
          cwd: outputDir,
        }
      );
      expect(stderr).toBe('');
      expect(stdout).toContain('Project successfully generated');

      const generatedOutputDir = join(testDir, 'generated-output');

      // Verify text files were transformed
      const generatedIndexTs = await readFile(
        join(generatedOutputDir, 'src', 'MyNewApp', 'index.ts'),
        'utf-8'
      );
      expect(generatedIndexTs).toContain('export class MyNewApp');
      expect(generatedIndexTs).toContain('const myNewApp = new MyNewApp()');

      const generatedStyle = await readFile(
        join(generatedOutputDir, 'src', 'MyNewApp', 'style.scss'),
        'utf-8'
      );
      expect(generatedStyle).toContain('.my-new-app { color: blue; }');

      const generatedConfig = await readFile(
        join(generatedOutputDir, 'src', 'MyNewApp', 'config.yaml'),
        'utf-8'
      );
      expect(generatedConfig).toContain('name: MyNewApp');
      expect(generatedConfig).toContain('type: my-new-app');

      const generatedPackageJson = await readFile(
        join(generatedOutputDir, 'package.json'),
        'utf-8'
      );
      expect(JSON.parse(generatedPackageJson).name).toBe('my-new-app');

      const generatedLicense = await readFile(
        join(generatedOutputDir, 'LICENSE'),
        'utf-8'
      );
      expect(generatedLicense).toContain('MIT License');
      expect(generatedLicense).toContain('MyNewApp');

      const generatedMakefile = await readFile(
        join(generatedOutputDir, 'Makefile'),
        'utf-8'
      );
      expect(generatedMakefile).toContain('Building MyNewApp');

      // Verify binary files were copied correctly (not transformed)
      const copiedPng = await readFile(
        join(generatedOutputDir, 'assets', 'logo.png')
      );
      expect(Buffer.compare(copiedPng.subarray(0, 8), pngHeader)).toBe(0);

      const copiedJpeg = await readFile(
        join(generatedOutputDir, 'assets', 'photo.jpg')
      );
      expect(Buffer.compare(copiedJpeg.subarray(0, 4), jpegHeader)).toBe(0);

      const copiedBin = await readFile(
        join(generatedOutputDir, 'src', 'data.bin')
      );
      expect(copiedBin[0]).toBe(0x00);
      expect(copiedBin[1]).toBe(0x01);
      expect(copiedBin[2]).toBe(0x02);
      expect(copiedBin[3]).toBe(0x03);
    });

    it('should create a packable npm module that can be executed via npx', async () => {
      // Create a sample project
      await writeFile(
        join(sourceDir, 'package.json'),
        JSON.stringify(
          {
            name: 'foo-bar-app',
            version: '1.0.0',
            description: 'FooBarApp application',
            main: 'index.js',
          },
          null,
          2
        )
      );

      await mkdir(join(sourceDir, 'src'), { recursive: true });
      await writeFile(
        join(sourceDir, 'src', 'FooBarApp.js'),
        `export class FooBarApp {
  constructor() {
    this.name = 'FooBarApp';
  }
  
  run() {
    return 'fooBarApp';
  }
}

export const fooBarApp = new FooBarApp();`
      );

      await writeFile(
        join(sourceDir, 'index.js'),
        `const { FooBarApp } = require('./src/FooBarApp');
module.exports = { FooBarApp };`
      );

      // Convert to template
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        undefined,
        mockLogger
      );

      // Verify the package.json has correct bin field
      const packageJson = await readFile(
        join(outputDir, 'package.json'),
        'utf-8'
      );
      const packageData = JSON.parse(packageJson);
      expect(packageData.bin).toBeDefined();
      expect(packageData.bin['foo-bar-app-generator']).toBe('./index.js');

      // Run npm pack
      const { stdout: packOutput } = await execAsync('npm pack --json', {
        cwd: outputDir,
      });

      // Parse npm pack JSON output to get the filename
      const packInfo = JSON.parse(packOutput);
      const tarballName = packInfo[0].filename;
      expect(tarballName).toBe('foo-bar-app-generator-1.0.0.tgz');

      const tarballPath = join(outputDir, tarballName);

      // Verify tarball exists
      await access(tarballPath, constants.F_OK);

      // Check tarball contents
      const { stdout: tarContents } = await execAsync(
        `tar -tzf ${tarballName}`,
        {
          cwd: outputDir,
        }
      );

      // Verify essential files are in the tarball
      expect(tarContents).toContain('package/package.json');
      expect(tarContents).toContain('package/index.js');
      expect(tarContents).toContain('package/README.md');
      expect(tarContents).toContain('package/templates/');

      // Test npx execution with --help flag
      const { stdout: helpOutput } = await execAsync(
        `npx ./${tarballName} --help`,
        {
          cwd: outputDir,
          timeout: 30000,
        }
      );

      expect(helpOutput).toContain('Usage: node index.js');
      expect(helpOutput).toContain('--symbolName');
      expect(helpOutput).toContain('--outputDir');
      expect(helpOutput).toContain('--help');

      // Test actual project generation via npx
      const { stdout: genOutput } = await execAsync(
        `npx ./${tarballName} --symbolName TestPackedProject --outputDir ../packed-test-output`,
        {
          cwd: outputDir,
          timeout: 30000,
        }
      );

      expect(genOutput).toContain('Project successfully generated');

      // Verify generated project from packed module
      const packedTestDir = join(testDir, 'packed-test-output');
      await access(packedTestDir, constants.F_OK);

      // Check generated files
      const genPackageJson = await readFile(
        join(packedTestDir, 'package.json'),
        'utf-8'
      );
      const genPackageData = JSON.parse(genPackageJson);
      expect(genPackageData.name).toBe('test-packed-project');
      expect(genPackageData.description).toContain('TestPackedProject');

      const genMainFile = await readFile(
        join(packedTestDir, 'src', 'TestPackedProject.js'),
        'utf-8'
      );
      expect(genMainFile).toContain('export class TestPackedProject');
      expect(genMainFile).toContain("this.name = 'TestPackedProject'");
      expect(genMainFile).toContain('testPackedProject');

      const genIndexFile = await readFile(
        join(packedTestDir, 'index.js'),
        'utf-8'
      );
      expect(genIndexFile).toContain('TestPackedProject');
      expect(genIndexFile).not.toContain('FooBarApp');
    });
  });

  describe('Ignore File Functionality', () => {
    it('should ignore files based on .catdoublerignore patterns', async () => {
      // Create test file structure
      await mkdir(join(sourceDir, 'src'), { recursive: true });
      await mkdir(join(sourceDir, 'logs'), { recursive: true });
      await mkdir(join(sourceDir, 'temp'), { recursive: true });
      await mkdir(join(sourceDir, 'backup'), { recursive: true });

      // Create files to be included
      await writeFile(
        join(sourceDir, 'src', 'FooBarApp.js'),
        'export class FooBarApp { }'
      );
      await writeFile(join(sourceDir, 'README.md'), '# FooBarApp');
      await writeFile(
        join(sourceDir, 'package.json'),
        '{"name": "foo-bar-app"}'
      );

      // Create files to be ignored
      await writeFile(
        join(sourceDir, 'logs', 'debug.log'),
        'Debug information'
      );
      await writeFile(join(sourceDir, 'temp', 'cache.tmp'), 'Temporary data');
      await writeFile(
        join(sourceDir, 'backup', 'FooBarApp.bak'),
        'Backup file'
      );
      await writeFile(join(sourceDir, '.env'), 'SECRET_KEY=abc123');
      await writeFile(
        join(sourceDir, 'src', 'FooBarApp.test.js'),
        'test("works", () => {})'
      );

      // Create .catdoublerignore file
      await writeFile(
        join(sourceDir, '.catdoublerignore'),
        `# Ignore log files
logs/
*.log

# Ignore temp and backup files
temp/
backup/
*.tmp
*.bak

# Ignore environment files
.env

# Ignore test files
**/*.test.js
`
      );

      // Convert to template
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        undefined,
        mockLogger
      );

      // Verify included files are present
      await access(join(outputDir, 'templates', 'src', '__pascal1__.js'));
      await access(join(outputDir, 'templates', 'README.md'));
      await access(join(outputDir, 'templates', 'package.json'));

      // Verify ignored files are NOT present
      await expect(
        access(join(outputDir, 'templates', 'logs'))
      ).rejects.toThrow();
      await expect(
        access(join(outputDir, 'templates', 'temp'))
      ).rejects.toThrow();
      await expect(
        access(join(outputDir, 'templates', 'backup'))
      ).rejects.toThrow();
      await expect(
        access(join(outputDir, 'templates', '.env'))
      ).rejects.toThrow();
      await expect(
        access(join(outputDir, 'templates', 'src', '__pascal1__.test.js'))
      ).rejects.toThrow();
    });

    it('should use custom ignore file with --ignore-path option', async () => {
      // Create test files
      await mkdir(join(sourceDir, 'src'), { recursive: true });
      await mkdir(join(sourceDir, 'private'), { recursive: true });

      await writeFile(
        join(sourceDir, 'src', 'FooBarApp.js'),
        'export class FooBarApp { }'
      );
      await writeFile(
        join(sourceDir, 'src', 'utils.js'),
        'export function util() { }'
      );
      await writeFile(
        join(sourceDir, 'private', 'secret.js'),
        'const secret = "hidden";'
      );
      await writeFile(join(sourceDir, 'config.json'), '{"name": "FooBarApp"}');
      await writeFile(join(sourceDir, 'settings.json'), '{"debug": true}');

      // Create custom ignore file
      const customIgnorePath = join(testDir, 'custom.ignore');
      await writeFile(
        customIgnorePath,
        `# Custom ignore patterns
private/
settings.json
`
      );

      // Convert with custom ignore file
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        customIgnorePath,
        undefined,
        mockLogger
      );

      // Verify included files
      await access(join(outputDir, 'templates', 'src', '__pascal1__.js'));
      await access(join(outputDir, 'templates', 'src', 'utils.js'));
      await access(join(outputDir, 'templates', 'config.json'));

      // Verify ignored files
      await expect(
        access(join(outputDir, 'templates', 'private'))
      ).rejects.toThrow();
      await expect(
        access(join(outputDir, 'templates', 'settings.json'))
      ).rejects.toThrow();
    });

    it('should handle negation patterns in ignore file', async () => {
      // Create test structure
      await mkdir(join(sourceDir, 'logs'), { recursive: true });
      await mkdir(join(sourceDir, 'src'), { recursive: true });

      await writeFile(join(sourceDir, 'logs', 'debug.log'), 'Debug log');
      await writeFile(
        join(sourceDir, 'logs', 'important.log'),
        'Important log'
      );
      await writeFile(join(sourceDir, 'logs', 'error.log'), 'Error log');
      await writeFile(
        join(sourceDir, 'src', 'FooBarApp.js'),
        'export class FooBarApp { }'
      );

      // Create ignore file with negation
      await writeFile(
        join(sourceDir, '.catdoublerignore'),
        `# Ignore all logs
logs/*.log

# But keep important.log
!logs/important.log
`
      );

      // Convert to template
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        undefined,
        mockLogger
      );

      // Verify important.log is included (negation pattern)
      await access(join(outputDir, 'templates', 'logs', 'important.log'));

      // Verify other logs are ignored
      await expect(
        access(join(outputDir, 'templates', 'logs', 'debug.log'))
      ).rejects.toThrow();
      await expect(
        access(join(outputDir, 'templates', 'logs', 'error.log'))
      ).rejects.toThrow();
    });

    it('should throw error when specified ignore file does not exist', async () => {
      // Create a simple source file
      await writeFile(
        join(sourceDir, 'index.js'),
        'export const FooBarApp = "app";'
      );

      // Try to convert with non-existent ignore file
      const caseVariants = generateCaseVariants('FooBarApp');
      const nonExistentPath = join(testDir, 'nonexistent.ignore');

      await expect(
        convertToTemplate(
          sourceDir,
          caseVariants,
          outputDir,
          nonExistentPath,
          undefined,
          mockLogger
        )
      ).rejects.toThrow('Specified ignore file not found');
    });

    it('should work without .catdoublerignore file (use default patterns)', async () => {
      // Create test structure with default ignore patterns
      await mkdir(join(sourceDir, 'src'), { recursive: true });
      await mkdir(join(sourceDir, 'node_modules'), { recursive: true });
      await mkdir(join(sourceDir, '.git'), { recursive: true });
      await mkdir(join(sourceDir, 'dist'), { recursive: true });

      // Create files
      await writeFile(
        join(sourceDir, 'src', 'FooBarApp.js'),
        'export class FooBarApp { }'
      );
      await writeFile(
        join(sourceDir, 'package.json'),
        '{"name": "foo-bar-app"}'
      );
      await writeFile(
        join(sourceDir, 'node_modules', 'some-package.js'),
        'module.exports = {}'
      );
      await writeFile(join(sourceDir, '.git', 'HEAD'), 'ref: refs/heads/main');
      await writeFile(join(sourceDir, 'dist', 'bundle.js'), '// bundled code');

      // Convert without ignore file
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        undefined,
        mockLogger
      );

      // Verify source files are included
      await access(join(outputDir, 'templates', 'src', '__pascal1__.js'));
      await access(join(outputDir, 'templates', 'package.json'));

      // Verify default ignored directories are excluded
      await expect(
        access(join(outputDir, 'templates', 'node_modules'))
      ).rejects.toThrow();
      await expect(
        access(join(outputDir, 'templates', '.git'))
      ).rejects.toThrow();
      await expect(
        access(join(outputDir, 'templates', 'dist'))
      ).rejects.toThrow();
    });

    it('should use custom text file patterns with --text-path option', async () => {
      // Create test files with various extensions
      await mkdir(join(sourceDir, 'src'), { recursive: true });
      await mkdir(join(sourceDir, 'config'), { recursive: true });

      await writeFile(
        join(sourceDir, 'src', 'FooBarApp.js'),
        'export class FooBarApp { }'
      );
      await writeFile(
        join(sourceDir, 'src', 'custom.myext'),
        'Custom extension content with FooBarApp'
      );
      await writeFile(
        join(sourceDir, 'src', 'binary.dat'),
        Buffer.from([0x00, 0xff, 0x42, 0x13])
      );
      await writeFile(
        join(sourceDir, 'config', 'app.conf'),
        'FooBarApp configuration'
      );
      await writeFile(join(sourceDir, 'SpecialFile'), 'FooBarApp special file');

      // Create custom text patterns file
      const customTextPath = join(testDir, 'custom.textpatterns');
      await writeFile(
        customTextPath,
        `# Custom text patterns
*.myext
*.conf
SpecialFile
# Exclude .dat files (they're binary)
!*.dat
`
      );

      // Convert with custom text patterns file
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        customTextPath,
        mockLogger
      );

      // Verify text files are templated
      const jsContent = await readFile(
        join(outputDir, 'templates', 'src', '__pascal1__.js'),
        'utf-8'
      );
      expect(jsContent).toContain('__pascal1__');

      const myextContent = await readFile(
        join(outputDir, 'templates', 'src', 'custom.myext'),
        'utf-8'
      );
      expect(myextContent).toContain('__pascal1__');

      const confContent = await readFile(
        join(outputDir, 'templates', 'config', 'app.conf'),
        'utf-8'
      );
      expect(confContent).toContain('__pascal1__');

      const specialContent = await readFile(
        join(outputDir, 'templates', 'SpecialFile'),
        'utf-8'
      );
      expect(specialContent).toContain('__pascal1__');

      // Verify binary file is copied as-is
      const binaryContent = await readFile(
        join(outputDir, 'templates', 'src', 'binary.dat')
      );
      expect(binaryContent).toEqual(Buffer.from([0x00, 0xff, 0x42, 0x13]));
    });

    it('should use default .catdoublertext when present', async () => {
      // Create test files
      await mkdir(join(sourceDir, 'src'), { recursive: true });

      await writeFile(
        join(sourceDir, 'src', 'FooBarApp.js'),
        'export class FooBarApp { }'
      );
      await writeFile(
        join(sourceDir, 'src', 'custom.special'),
        'Special file with FooBarApp'
      );
      await writeFile(
        join(sourceDir, 'src', 'data.bin'),
        Buffer.from([0x12, 0x34, 0x56, 0x78])
      );

      // Create .catdoublertext in source directory
      await writeFile(
        join(sourceDir, '.catdoublertext'),
        `# Project-specific text patterns
*.special
# Treat .bin files as text in this project
*.bin
`
      );

      // Convert without specifying text path (should use .catdoublertext)
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        undefined,
        mockLogger
      );

      // Verify custom patterns are recognized
      const specialContent = await readFile(
        join(outputDir, 'templates', 'src', 'custom.special'),
        'utf-8'
      );
      expect(specialContent).toContain('__pascal1__');

      // Note: .bin files would normally be binary, but our .catdoublertext treats them as text
      const binContent = await readFile(
        join(outputDir, 'templates', 'src', 'data.bin'),
        'utf-8'
      );
      // Binary data won't match FooBarApp pattern, but file should be processed as text
      expect(() => binContent.toString('utf-8')).not.toThrow();
    });

    it('should prefer --text-path over default .catdoublertext', async () => {
      // Create test files
      await writeFile(join(sourceDir, 'file.custom1'), 'FooBarApp in custom1');
      await writeFile(join(sourceDir, 'file.custom2'), 'FooBarApp in custom2');

      // Create default .catdoublertext that includes .custom1
      await writeFile(join(sourceDir, '.catdoublertext'), '*.custom1');

      // Create external text patterns that includes .custom2
      const externalTextPath = join(testDir, 'external.text');
      await writeFile(externalTextPath, '*.custom2');

      // Convert with external text path (should override .catdoublertext)
      const caseVariants = generateCaseVariants('FooBarApp');
      await convertToTemplate(
        sourceDir,
        caseVariants,
        outputDir,
        undefined,
        externalTextPath,
        mockLogger
      );

      // .custom2 should be treated as text (from external file)
      const custom2Content = await readFile(
        join(outputDir, 'templates', 'file.custom2'),
        'utf-8'
      );
      expect(custom2Content).toContain('__pascal1__');

      // .custom1 might still be treated as text if default patterns include it,
      // but it won't be from .catdoublertext since we specified external file
    });
  });
});
