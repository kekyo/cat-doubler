// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { Command } from 'commander';
import { resolve, join } from 'path';
import { access, stat, mkdtemp, rm, readFile } from 'fs/promises';
import { convertToTemplate } from './converter/templateConverter';
import {
  description,
  name,
  version,
  git_commit_hash,
} from './generated/packageMetadata';
import { createConsoleLogger, LogLevel } from './utils/logger';
import { generateCaseVariants } from './utils/caseUtils';
import { tmpdir } from 'os';
import { spawn } from 'child_process';

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

  // Main command for template conversion (default action)
  program
    .argument('[source-dir]', 'Source directory to convert')
    .argument('[symbol-name]', 'Symbol name to replace (in PascalCase)')
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
      '--package-json <file>',
      'Path to package.json override file (default: .catdoubler.package.json)'
    )
    .option(
      '-j, --just-now <new-name>',
      'Generate a temporary scaffolder and immediately create a new project with the given name (in PascalCase)'
    )
    .option(
      '--log-level <level>',
      'Set log level (debug, info, warn, error, ignore)',
      'info'
    )
    .option('--no-clean', 'Do not clean the output directory before generating')
    .action(
      async (
        sourceDir: string,
        symbolName: string,
        options: {
          output: string;
          ignorePath?: string;
          packageJson?: string;
          logLevel: string;
          ignoreInit?: boolean;
          clean?: boolean;
          justNow?: string;
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

        // source-dir is required
        if (!sourceDir) {
          logger.error('Error: source-dir argument is required');
          logger.info(
            'Usage: cat-doubler <source-dir> <symbol-name> [options]'
          );
          process.exit(1);
        }

        try {
          logger.info(`${version}-${git_commit_hash}: Started.`);

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

          // Resolve symbol name: CLI arg takes precedence; otherwise try .catdoublername at project root
          if (!symbolName) {
            try {
              const nameFilePath = join(sourcePath, '.catdoublername');
              await access(nameFilePath);
              const fileContent = (
                await readFile(nameFilePath, 'utf-8')
              ).trim();
              if (!fileContent) {
                logger.error(
                  'Error: .catdoublername is empty. Provide <symbol-name> or fill .catdoublername.'
                );
                process.exit(1);
              }
              symbolName = fileContent;
              logger.info(
                `Using symbol name from .catdoublername: ${symbolName}`
              );
            } catch {
              logger.error(
                'Error: symbol-name not provided and .catdoublername not found in source root'
              );
              logger.info(
                'Usage: cat-doubler <source-dir> <symbol-name> [options]'
              );
              process.exit(1);
            }
          }

          // Validate symbol name (generate variants)
          const symbolNameCaseVariants = generateCaseVariants(symbolName);

          // Just-now flow: create temp scaffolder and immediately run it
          if (options.justNow) {
            const newProjectName = options.justNow;

            // Validate new project name (PascalCase)
            if (!/^[A-Z][a-zA-Z0-9]*$/.test(newProjectName)) {
              logger.error(
                'Error: --just-now requires a PascalCase project name (e.g., MyProjectName)'
              );
              process.exit(1);
            }

            logger.info(
              `Just-now mode: Will generate and run a temporary scaffolder.`
            );
            const tmpBase = await mkdtemp(join(tmpdir(), 'cat-doubler-'));
            const tmpScaffolderPath = tmpBase; // convertToTemplate writes scaffolder into this dir

            try {
              logger.info(
                `Converting "${sourceDir}" with symbol "${symbolName}" into temporary scaffolder...`
              );
              await convertToTemplate(
                sourcePath,
                symbolNameCaseVariants,
                tmpScaffolderPath,
                options.ignorePath,
                options.packageJson,
                logger,
                true // always clean temp
              );

              // Determine project output directory for the generated project
              const newNameVariants = generateCaseVariants(newProjectName);
              const projectOutputDir = options.output
                ? resolve(process.cwd(), options.output)
                : resolve(
                    process.cwd(),
                    `./output/${newNameVariants.kebabCase}`
                  );

              logger.info(
                `Running scaffolder to generate project "${newProjectName}" at: ${projectOutputDir}`
              );

              // Spawn the generated scaffolder
              await new Promise<void>((resolveP, rejectP) => {
                const cp = spawn(
                  process.execPath,
                  [
                    './scaffolder.js',
                    '--symbolName',
                    newProjectName,
                    '--outputDir',
                    projectOutputDir,
                  ],
                  {
                    cwd: tmpScaffolderPath,
                    stdio: 'inherit',
                  }
                );
                cp.on('close', (code) => {
                  if (code === 0) resolveP();
                  else
                    rejectP(new Error(`scaffolder exited with code ${code}`));
                });
                cp.on('error', (err) => rejectP(err));
              });

              logger.info('Project generation completed successfully');
            } finally {
              // Cleanup temp directory
              try {
                await rm(tmpScaffolderPath, { recursive: true, force: true });
                logger.debug('Temporary scaffolder directory cleaned up');
              } catch (cleanupErr) {
                logger.warn(
                  `Warning: Failed to cleanup temporary directory: ${cleanupErr}`
                );
              }
            }
          } else {
            // Normal flow: Generate scaffolder into output directory
            logger.info(
              `Converting "${sourceDir}" with symbol "${symbolName}"`
            );
            logger.info(`Output directory: ${outputPath}`);

            await convertToTemplate(
              sourcePath,
              symbolNameCaseVariants,
              outputPath,
              options.ignorePath,
              options.packageJson,
              logger,
              options.clean !== false // Default to true unless --no-clean is specified
            );

            logger.info('Template generation completed successfully');
            logger.info(`To use the generated template:`);
            logger.info(`  cd ${options.output}`);
            logger.info(`  node scaffolder.js`);
          }
        } catch (error) {
          logger.error(`Error during conversion: ${error}`);
          process.exit(1);
        }
      }
    );

  program.parse();
};
