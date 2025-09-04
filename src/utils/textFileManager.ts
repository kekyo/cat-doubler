// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import ignore from 'ignore';
import { readFile } from 'fs/promises';
import { join, basename } from 'path';
import { Logger } from './logger';

export interface TextFileManager {
  isTextFile(filePath: string): boolean;
  getPatternCount(): number;
}

// Default text file patterns converted from hardcoded values
const DEFAULT_TEXT_PATTERNS = [
  // Programming languages - JavaScript/TypeScript ecosystem
  '*.js',
  '*.jsx',
  '*.ts',
  '*.tsx',
  '*.mjs',
  '*.cjs',
  '*.mts',
  '*.cts',

  // Style sheets
  '*.css',
  '*.scss',
  '*.sass',
  '*.less',
  '*.styl',

  // Markup and templates
  '*.html',
  '*.htm',
  '*.xml',
  '*.svg',
  '*.vue',
  '*.svelte',
  '*.astro',
  '*.hbs',
  '*.handlebars',
  '*.ejs',
  '*.pug',
  '*.jade',

  // Data formats
  '*.json',
  '*.jsonc',
  '*.json5',
  '*.yaml',
  '*.yml',
  '*.toml',
  '*.ini',
  '*.properties',

  // .NET languages
  '*.cs',
  '*.fs',
  '*.vb',
  '*.csproj',
  '*.fsproj',
  '*.vbproj',
  '*.sln',
  '*.resx',
  '*.config',
  '*.props',
  '*.targets',

  // C/C++ family
  '*.c',
  '*.h',
  '*.cpp',
  '*.cc',
  '*.hpp',
  '*.hh',
  '*.c++',
  '*.cxx',
  '*.hxx',
  '*.ino',

  // Other programming languages
  '*.py',
  '*.pyw',
  '*.pyi',
  '*.java',
  '*.kt',
  '*.scala',
  '*.go',
  '*.rs',
  '*.rb',
  '*.rake',
  '*.php',
  '*.php3',
  '*.php4',
  '*.php5',
  '*.phtml',
  '*.swift',
  '*.m',
  '*.mm',
  '*.r',
  '*.R',
  '*.rmd',
  '*.Rmd',
  '*.lua',
  '*.pl',
  '*.pm',
  '*.sh',
  '*.bash',
  '*.zsh',
  '*.fish',
  '*.ps1',
  '*.bat',
  '*.cmd',

  // Documentation
  '*.md',
  '*.markdown',
  '*.mdx',
  '*.txt',
  '*.text',
  '*.rst',
  '*.adoc',
  '*.asciidoc',

  // Config files
  '*.env',
  '*.env.local',
  '*.env.production',
  '*.env.development',
  '*.gitignore',
  '*.gitattributes',
  '*.gitmodules',
  '*.npmignore',
  '*.npmrc',
  '*.yarnrc',
  '*.dockerignore',
  '*.editorconfig',
  '*.eslintrc',
  '*.eslintignore',
  '*.prettierrc',
  '*.prettierignore',
  '*.babelrc',
  '*.browserslistrc',

  // Other
  '*.sql',
  '*.graphql',
  '*.gql',
  '*.lock',
  '*.log',

  // Special filenames (exact match)
  'Makefile',
  'makefile',
  'GNUmakefile',
  'CMakeLists.txt',
  'Dockerfile',
  'dockerfile',
  'Vagrantfile',
  'Jenkinsfile',
  'Rakefile',
  'Gemfile',
  'Gemfile.lock',
  'Pipfile',
  'Pipfile.lock',
  'requirements.txt',
  'LICENSE',
  'LICENCE',
  'README',
  'CHANGELOG',
  'AUTHORS',
  'CONTRIBUTORS',
  'TODO',
  'NOTES',
];

export const createTextFileManager = async (
  textPath: string | undefined,
  sourcePath: string,
  logger: Logger
): Promise<TextFileManager> => {
  // Use ignore library but invert the logic - patterns match text files
  const ig = ignore();
  let totalPatternCount = 0;

  // Add default patterns
  ig.add(DEFAULT_TEXT_PATTERNS);
  totalPatternCount += DEFAULT_TEXT_PATTERNS.length;
  logger.debug(
    `Added ${DEFAULT_TEXT_PATTERNS.length} default text file patterns`
  );

  // Read custom text file patterns
  const textFilePath = textPath || join(sourcePath, '.catdoublertext');

  try {
    const content = await readFile(textFilePath, 'utf-8');
    const patterns = content
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));

    if (patterns.length > 0) {
      ig.add(patterns);
      totalPatternCount += patterns.length;
      logger.info(
        `Loaded ${patterns.length} text file patterns from ${textFilePath}`
      );
    }
  } catch (error: any) {
    if (textPath) {
      // If a custom text path was specified but not found, it's an error
      throw new Error(
        `Specified text file pattern file not found: ${textFilePath}`
      );
    }
    // If default .catdoublertext doesn't exist, it's fine
    logger.debug(`.catdoublertext not found, using only default patterns`);
  }

  return {
    isTextFile(filePath: string): boolean {
      // For the ignore library, we need just the filename or relative path
      // Check both the full path and just the basename for exact filename matches
      const filename = basename(filePath);

      // Check if the file matches any pattern
      // Note: ignore.ignores() returns true if the file matches the patterns
      // Since we're using it for inclusion (text files), we use it directly
      return ig.ignores(filePath) || ig.ignores(filename);
    },

    getPatternCount(): number {
      return totalPatternCount;
    },
  };
};

export const parseTextFile = async (filePath: string): Promise<string[]> => {
  const content = await readFile(filePath, 'utf-8');
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));
};

// Create a default text file manager with only built-in patterns
// Used for backward compatibility in classifyFile function
export const createDefaultTextFileManager =
  async (): Promise<TextFileManager> => {
    const ig = ignore();
    ig.add(DEFAULT_TEXT_PATTERNS);

    return {
      isTextFile(filePath: string): boolean {
        const filename = basename(filePath);
        return ig.ignores(filePath) || ig.ignores(filename);
      },

      getPatternCount(): number {
        return DEFAULT_TEXT_PATTERNS.length;
      },
    };
  };
