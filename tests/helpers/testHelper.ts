// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import path from 'path';
import dayjs from 'dayjs';
import { mkdir } from 'fs/promises';

// Timestamp for test directories
const timestamp = dayjs().format('YYYYMMDD_HHmmss');

/**
 * Creates a test directory with timestamp for test isolation
 * @remarks WARNING: Do NOT construct nested `describe()` tests, isolation environment will break.
 */
export const createTestDirectory = async (
  categoryName: string,
  testName: string
): Promise<string> => {
  // Sanitize names to be filesystem-safe
  const sanitize = (name: string) =>
    name
      .replaceAll(' ', '-')
      .replaceAll('/', '_') // Replace slash with underscore
      .replaceAll('\\', '_') // Replace backslash
      .replaceAll(':', '_') // Replace colon
      .replaceAll('*', '_') // Replace asterisk
      .replaceAll('?', '_') // Replace question mark
      .replaceAll('"', '_') // Replace double quote
      .replaceAll('<', '_') // Replace less than
      .replaceAll('>', '_') // Replace greater than
      .replaceAll('|', '_'); // Replace pipe

  const testDir = path.join(
    process.cwd(),
    'test-results',
    timestamp,
    sanitize(categoryName),
    sanitize(testName)
  );
  await mkdir(testDir, { recursive: true });
  return testDir;
};

/**
 * Generates a test port number to avoid conflicts
 * Uses process.pid and random component for better uniqueness across parallel test runs
 * @remarks WARNING: Do NOT construct nested `describe()` tests, isolation environment will break.
 */
export const getTestPort = (basePort: number = 6000): number => {
  // Use process.pid for better uniqueness across parallel test runs
  const pidComponent = process.pid % 1000;
  const randomComponent = Math.floor(Math.random() * 4000); // 0-3999
  const port = basePort + pidComponent + randomComponent;

  // Ensure port stays within valid range
  if (port > 65535) {
    // Fall back to basePort with smaller random offset
    return basePort + Math.floor(Math.random() * 1000);
  }

  return port;
};
