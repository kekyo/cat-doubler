// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { mkdir, readFile, writeFile, cp } from 'fs/promises';
import { join, dirname } from 'path';
import { scanDirectory } from '../scanner/fileScanner';
import { CaseVariants } from '../utils/caseUtils';
import { replaceSymbolInContent, replaceSymbolInPath } from './symbolReplacer';
import { findSafePlaceholders } from './placeholderDetector';
import { generateCliProject } from '../generator/cliProjectGenerator';
import { Logger } from '../utils/logger';

export const convertToTemplate = async (
  sourcePath: string,
  symbolNameCaseVariants: CaseVariants,
  outputPath: string,
  ignorePath: string | undefined,
  logger: Logger
): Promise<void> => {
  logger.info('Phase 1: Scanning source directory...');
  const files = await scanDirectory(sourcePath, ignorePath, logger);

  // Find safe placeholders
  const placeholders = await findSafePlaceholders(files, logger);

  logger.debug('Case variants generated:');
  logger.debug(`  Original: ${symbolNameCaseVariants.original}`);
  logger.debug(`  camelCase: ${symbolNameCaseVariants.camelCase}`);
  logger.debug(`  PascalCase: ${symbolNameCaseVariants.pascalCase}`);
  logger.debug(`  kebab-case: ${symbolNameCaseVariants.kebabCase}`);
  logger.debug(`  snake_case: ${symbolNameCaseVariants.snakeCase}`);
  logger.debug(`  CONSTANT_CASE: ${symbolNameCaseVariants.constantCase}`);

  logger.info('Phase 3: Converting files to templates...');

  // Prepare output directories
  await mkdir(outputPath, { recursive: true });
  const templatesDir = join(outputPath, 'templates');
  await mkdir(templatesDir, { recursive: true });

  // Step 1: We'll create directories as needed when processing files
  // (Don't pre-create all directories - some might be empty after ignoring files)

  // Step 2: Process files in batches
  const fileItems = files.filter((f) => !f.isDirectory);
  const batchSize = 10;
  const templateFiles: Array<{
    originalPath: string;
    templatePath: string;
    outputPath: string;
    isTemplate: boolean;
  }> = [];

  // Collect text file paths with placeholders
  const textFilePaths: string[] = [];

  let templatedCount = 0;

  // Process files in batches
  for (let i = 0; i < fileItems.length; i += batchSize) {
    const batch = fileItems.slice(i, Math.min(i + batchSize, fileItems.length));

    const batchResults = await Promise.all(
      batch.map(async (file) => {
        // Determine the template path (with potential symbol replacement)
        const templateRelativePath = replaceSymbolInPath(
          file.relativePath,
          symbolNameCaseVariants,
          placeholders,
          logger
        );
        const templatePath = join(templatesDir, templateRelativePath);

        // Track text files with their placeholder-replaced paths
        if (file.isTextFile) {
          textFilePaths.push(templateRelativePath);
        }

        if (file.requiresTemplating) {
          // Read and convert content
          const content = await readFile(file.absolutePath, 'utf-8');
          const { content: convertedContent, replacementCount } =
            replaceSymbolInContent(
              content,
              symbolNameCaseVariants,
              placeholders,
              logger
            );

          // All text files become templates in the new architecture
          const hasPathReplacement = templateRelativePath !== file.relativePath;
          const isTemplate = replacementCount > 0 || hasPathReplacement;

          const finalTemplatePath = templatePath;

          // Directory should already exist from step 1, but ensure parent dir exists
          await mkdir(dirname(finalTemplatePath), { recursive: true });
          await writeFile(finalTemplatePath, convertedContent);

          if (replacementCount > 0) {
            logger.debug(
              `  Templated: ${file.relativePath} (${replacementCount} replacements)`
            );
          }

          return {
            originalPath: file.relativePath,
            templatePath: templateRelativePath,
            outputPath: templateRelativePath,
            isTemplate,
            replacementCount,
          };
        } else {
          // Binary file - just copy
          await mkdir(dirname(templatePath), { recursive: true });
          await cp(file.absolutePath, templatePath, { recursive: true });

          logger.debug(`  Copied: ${file.relativePath}`);

          return {
            originalPath: file.relativePath,
            templatePath: templateRelativePath,
            outputPath: templateRelativePath,
            isTemplate: false,
            replacementCount: 0,
          };
        }
      })
    );

    // Add results to templateFiles and count replacements
    for (const result of batchResults) {
      templateFiles.push({
        originalPath: result.originalPath,
        templatePath: result.templatePath,
        outputPath: result.outputPath,
        isTemplate: result.isTemplate,
      });

      if (result.replacementCount > 0) {
        templatedCount++;
      }
    }
  }

  // Calculate final counters
  const processedCount = fileItems.length;

  logger.info(`  Processed ${processedCount} files`);
  logger.info(`  Created ${templatedCount} templates`);

  logger.info('Phase 4: Generating CLI project...');
  await generateCliProject(
    outputPath,
    templateFiles,
    textFilePaths,
    symbolNameCaseVariants.original,
    symbolNameCaseVariants,
    placeholders,
    logger
  );

  logger.debug('Template generation complete');
};
