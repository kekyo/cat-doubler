// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { writeFile, access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';
import { Logger } from './logger';
import catdoublerignoreTemplate from '../config/catdoublerignore.template?raw';

export const initializeConfigFiles = async (logger: Logger): Promise<void> => {
  const currentDir = process.cwd();
  let filesCreated = 0;
  let filesSkipped = 0;

  // Check and create .catdoublerignore
  const ignoreFilePath = join(currentDir, '.catdoublerignore');
  try {
    await access(ignoreFilePath, constants.F_OK);
    logger.info('  .catdoublerignore already exists, skipping');
    filesSkipped++;
  } catch {
    await writeFile(ignoreFilePath, catdoublerignoreTemplate, 'utf-8');
    logger.info('  Created .catdoublerignore with default patterns');
    filesCreated++;
  }

  // Summary
  if (filesCreated === 0) {
    logger.info('Configuration file already exists. No files were created.');
  } else {
    logger.info(`\nConfiguration file initialized successfully!`);
    logger.info(`  Created: ${filesCreated} file(s)`);
    if (filesSkipped > 0) {
      logger.info(`  Skipped: ${filesSkipped} file(s) (already exist)`);
    }
    logger.info('\nYou can now customize this file to fit your project needs.');
  }
};
