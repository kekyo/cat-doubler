// cat-doubler - Universal scaffolder generator.
// Copyright (c) Kouji Matsui. (@kekyo@mi.kekyo.net)
// Under MIT.
// https://github.com/kekyo/cat-doubler

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { join } from 'path';
import { mkdir, rm, writeFile } from 'fs/promises';
import { createConsoleLogger } from '../src/utils/logger';

vi.mock('chardet', () => ({
  default: {
    detectFile: vi.fn(),
  },
}));

vi.mock('isbinaryfile', () => ({
  isBinaryFile: vi.fn(),
}));

import chardet from 'chardet';
import { isBinaryFile } from 'isbinaryfile';
import { detectFileEncoding } from '../src/utils/encodingDetector';

describe('encodingDetector', () => {
  const testDir = join(process.cwd(), 'test-temp-encoding-detector');
  const logger = createConsoleLogger('test', 'ignore');

  beforeEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    await mkdir(testDir, { recursive: true });
    vi.mocked(chardet.detectFile).mockReset();
    vi.mocked(isBinaryFile).mockReset();
    vi.mocked(isBinaryFile).mockResolvedValue(false);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('should treat valid UTF-8 files as text even when chardet guesses a legacy encoding', async () => {
    const projectFile = join(testDir, 'MyApp.csproj');
    await writeFile(
      projectFile,
      '<Project Sdk="Microsoft.NET.Sdk"></Project>',
      'utf-8'
    );

    vi.mocked(chardet.detectFile).mockResolvedValue('windows-1252');

    const result = await detectFileEncoding(projectFile, logger);

    expect(result.isTextFile).toBe(true);
    expect(result.requiresTemplating).toBe(true);
    expect(result.encoding).toBe('UTF-8');
  });

  it('should still reject files whose bytes are not valid UTF-8', async () => {
    const latin1File = join(testDir, 'latin1.csproj');
    await writeFile(
      latin1File,
      Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0xe9])
    );

    vi.mocked(chardet.detectFile).mockResolvedValue('windows-1252');

    const result = await detectFileEncoding(latin1File, logger);

    expect(result.isTextFile).toBe(false);
    expect(result.requiresTemplating).toBe(false);
    expect(result.warning).toContain('Non-UTF-8 encoding');
  });
});
