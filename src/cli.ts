// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { Command } from 'commander';
import { resolve } from 'path';
import { access, stat } from 'fs/promises';
import { convertToTemplate } from './converter/templateConverter';
import {
  description,
  name,
  version,
  git_commit_hash,
} from './generated/packageMetadata';
import { createConsoleLogger, LogLevel } from './utils/logger';
import { generateCaseVariants } from './utils/caseUtils';

export const runCLI = (): void => {
  const program = new Command();

  program
    .name(name)
    .description(description)
    .version(
      `${version}-${git_commit_hash}`,
      '-v, --version',
      'output the version number'
    );

  program
    .argument('<source-dir>', 'Source directory to convert')
    .argument('<symbol-name>', 'Symbol name to replace (in PascalCase)')
    .option(
      '-o, --output <path>',
      'Output directory for the generated template',
      './scaffolder'
    )
    .option(
      '--ignore-path <file>',
      'Path to ignore file (default: .catdoublerignore)'
    )
    .option(
      '--text-path <file>',
      'Path to text file patterns file (default: .catdoublertext)'
    )
    .option(
      '--log-level <level>',
      'Set log level (debug, info, warn, error, ignore)',
      'info'
    )
    .action(
      async (
        sourceDir: string,
        symbolName: string,
        options: {
          output: string;
          ignorePath?: string;
          textPath?: string;
          logLevel: string;
        }
      ) => {
        // Validate log level
        const validLogLevels: LogLevel[] = [
          'debug',
          'info',
          'warn',
          'error',
          'ignore',
        ];
        const logLevel = options.logLevel as LogLevel;
        if (!validLogLevels.includes(logLevel)) {
          console.error(
            `Error: Invalid log level "${options.logLevel}". Must be one of: ${validLogLevels.join(', ')}`
          );
          process.exit(1);
        }

        // Create logger
        const logger = createConsoleLogger('cat-doubler', logLevel);

        try {
          logger.info(`${version}-${git_commit_hash}: Started.`);

          // Validate symbol name
          const symbolNameCaseVariants = generateCaseVariants(symbolName);

          const sourcePath = resolve(process.cwd(), sourceDir);
          const outputPath = resolve(process.cwd(), options.output);

          // Check if source directory exists
          try {
            await access(sourcePath);
          } catch {
            logger.error(`Source directory "${sourcePath}" does not exist`);
            process.exit(1);
          }

          // Check if source is a directory
          const stats = await stat(sourcePath);
          if (!stats.isDirectory()) {
            logger.error(`"${sourcePath}" is not a directory`);
            process.exit(1);
          }

          logger.info(`Converting "${sourceDir}" with symbol "${symbolName}"`);
          logger.info(`Output directory: ${outputPath}`);

          // Perform the conversion
          await convertToTemplate(
            sourcePath,
            symbolNameCaseVariants,
            outputPath,
            options.ignorePath,
            options.textPath,
            logger
          );

          logger.info('Template generation completed successfully');
          logger.info(`To use the generated template:`);
          logger.info(`  cd ${options.output}`);
          logger.info(`  node index.js`);
        } catch (error) {
          logger.error(`Error during conversion: ${error}`);
          process.exit(1);
        }
      }
    );

  program.parse();
};
