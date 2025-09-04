// cat-doubler - Convert any project into a template generator
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { readFile, writeFile, chmod } from 'fs/promises';
import { join } from 'path';
import Handlebars from 'handlebars';
import { CaseVariants } from '../utils/caseUtils';
import { PlaceholderSet } from '../converter/placeholderDetector';
import { Logger } from '../utils/logger';
import { git_commit_hash, version } from '../generated/packageMetadata';

interface TemplateFile {
  originalPath: string;
  templatePath: string;
  outputPath: string;
  isTemplate: boolean;
}

// No Handlebars helpers needed anymore

export const generateCliProject = async (
  outputPath: string,
  templateFiles: TemplateFile[],
  textFilePaths: string[],
  originalSymbol: string,
  caseVariants: CaseVariants,
  placeholders: PlaceholderSet,
  logger: Logger
): Promise<void> => {
  // No helpers to register

  // Read template files
  const scriptDir = import.meta.dirname || process.cwd();
  const templatesDir = join(scriptDir, 'templates');

  const indexTemplate = await readFile(
    join(templatesDir, 'index.js.hbs'),
    'utf-8'
  );
  const packageJsonTemplate = await readFile(
    join(templatesDir, 'package.json.hbs'),
    'utf-8'
  );
  const readmeTemplate = await readFile(
    join(templatesDir, 'README.md.hbs'),
    'utf-8'
  );

  // Prepare data for templates with dynamic placeholders
  const templateData = {
    originalSymbol,
    kebabCase: caseVariants.kebabCase,
    camelCase: caseVariants.camelCase,
    placeholders, // Pass the actual placeholders to the template
    textFilePaths, // Pass the list of text file paths with placeholders
    version,
    git_commit_hash,
  };

  // Compile and write index.js
  const indexCompiled = Handlebars.compile(indexTemplate);
  const indexContent = indexCompiled(templateData);
  const indexPath = join(outputPath, 'index.js');
  await writeFile(indexPath, indexContent);

  // Make index.js executable
  await chmod(indexPath, 0o755);

  logger.debug('  Created index.js (executable CLI)');

  // Compile and write package.json
  const packageJsonCompiled = Handlebars.compile(packageJsonTemplate);
  const packageJsonContent = packageJsonCompiled(templateData);
  await writeFile(join(outputPath, 'package.json'), packageJsonContent);

  logger.debug('  Created package.json');

  // Compile and write README.md
  const readmeCompiled = Handlebars.compile(readmeTemplate);
  const readmeContent = readmeCompiled(templateData);
  await writeFile(join(outputPath, 'README.md'), readmeContent);

  logger.debug('  Created README.md');

  // Create .gitignore
  const gitignoreContent = `node_modules/
output/
dist/
.env
.env.local
*.log
`;
  await writeFile(join(outputPath, '.gitignore'), gitignoreContent);

  logger.debug('  Created .gitignore');

  logger.info(`  Generated CLI project structure:`);
  logger.info(`    - index.js`);
  logger.info(`    - package.json`);
  logger.info(`    - README.md`);
  logger.info(`    - templates/ (${templateFiles.length} files)`);
};
